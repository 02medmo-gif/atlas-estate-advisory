const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const portArgIndex = process.argv.indexOf("--port");
const cliPort = portArgIndex >= 0 ? process.argv[portArgIndex + 1] : undefined;
const PORT = Number(cliPort || process.env.PORT || 4175);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const LEADS_FILE = path.join(DATA_DIR, "leads.jsonl");
const MAX_BODY_BYTES = 24 * 1024;
const LEAD_WEBHOOK_URL = process.env.LEAD_WEBHOOK_URL || "";
const GOOGLE_SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL || LEAD_WEBHOOK_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
};

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function sanitizeText(value, maxLength = 1000) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function isConfirmed(value) {
  return value === true || value === "true" || value === "yes" || value === "on" || value === "1";
}

function validateLead(payload) {
  const lead = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    name: sanitizeText(payload.name, 160),
    email: sanitizeText(payload.email, 180).toLowerCase(),
    phone: sanitizeText(payload.phone, 80),
    residence: sanitizeText(payload.residence, 120),
    target: sanitizeText(payload.target, 80),
    budget: sanitizeText(payload.budget, 80),
    goal: sanitizeText(payload.goal, 120),
    message: sanitizeText(payload.message, 1800),
    calendlyConfirmed: isConfirmed(payload.calendlyConfirmed),
  };

  const missing = ["name", "email", "phone", "residence", "target", "budget", "goal"].filter(
    (field) => !lead[field],
  );

  if (missing.length) {
    return { error: `Missing required fields: ${missing.join(", ")}` };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return { error: "Invalid email address" };
  }

  if (!lead.calendlyConfirmed) {
    return { error: "Calendly booking confirmation is required" };
  }

  return { lead };
}

function collectBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = "";

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request body too large"));
        request.destroy();
        return;
      }
      body += chunk;
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function readLeads() {
  if (!fs.existsSync(LEADS_FILE)) {
    return [];
  }

  const lines = fs.readFileSync(LEADS_FILE, "utf8").split("\n").filter(Boolean);
  return lines
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .reverse();
}

function isAdminAuthorized(requestUrl) {
  const url = new URL(requestUrl, "http://localhost");
  return url.searchParams.get("token") === ADMIN_TOKEN;
}

function adminIsConfigured() {
  return Boolean(ADMIN_TOKEN);
}

function asGoogleSheetsText(value) {
  return value ? `'${value}` : "";
}

async function postJsonWithTimeout(url, payload, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      throw new Error(`Google Sheets returned ${response.status}: ${responseText.slice(0, 160)}`);
    }

    return { ok: true };
  } finally {
    clearTimeout(timeout);
  }
}

async function syncLeadToGoogleSheets(lead) {
  if (!GOOGLE_SHEETS_WEBHOOK_URL) {
    return { ok: false, configured: false, error: "GOOGLE_SHEETS_WEBHOOK_URL is not configured" };
  }

  try {
    await postJsonWithTimeout(GOOGLE_SHEETS_WEBHOOK_URL, {
      createdAt: lead.createdAt,
      name: lead.name,
      email: lead.email,
      phone: asGoogleSheetsText(lead.phone),
      residence: lead.residence,
      target: lead.target,
      budget: lead.budget,
      goal: lead.goal,
      message: lead.message,
    });
    return { ok: true, configured: true };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      error: error.name === "AbortError" ? "Google Sheets timeout" : error.message,
    };
  }
}

async function handleLead(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const body = await collectBody(request);
    const payload = JSON.parse(body || "{}");
    const result = validateLead(payload);

    if (result.error) {
      sendJson(response, 400, { ok: false, error: result.error });
      return;
    }

    const sheetsSync = await syncLeadToGoogleSheets(result.lead);
    const storedLead = {
      ...result.lead,
      sheetsStatus: sheetsSync.ok ? "synced" : sheetsSync.configured ? "failed" : "not_configured",
      sheetsError: sheetsSync.ok ? "" : sheetsSync.error,
    };

    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(LEADS_FILE, `${JSON.stringify(storedLead)}\n`, "utf8");

    sendJson(response, 200, {
      ok: true,
      id: result.lead.id,
      storage: {
        local: true,
        googleSheets: sheetsSync.ok,
        googleSheetsStatus: storedLead.sheetsStatus,
        googleSheetsError: storedLead.sheetsError,
      },
    });
  } catch (error) {
    sendJson(response, 400, { ok: false, error: "Invalid request" });
  }
}

function serveStatic(request, response) {
  const requestPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const cleanPath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const filePath = path.resolve(ROOT, cleanPath);

  if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${path.sep}`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
    });
    response.end(data);
  });
}

const server = http.createServer((request, response) => {
  if (request.url.startsWith("/api/leads")) {
    if (!adminIsConfigured()) {
      sendJson(response, 503, { ok: false, error: "ADMIN_TOKEN is not configured" });
      return;
    }

    if (!isAdminAuthorized(request.url)) {
      sendJson(response, 401, { ok: false, error: "Unauthorized" });
      return;
    }

    sendJson(response, 200, { ok: true, leads: readLeads() });
    return;
  }

  if (request.url === "/healthz" || request.url === "/status") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.url.startsWith("/admin")) {
    if (!adminIsConfigured()) {
      response.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("ADMIN_TOKEN is not configured.");
      return;
    }

    if (!isAdminAuthorized(request.url)) {
      response.writeHead(401, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Unauthorized. Open /admin?token=YOUR_ADMIN_TOKEN.");
      return;
    }

    const adminPath = path.join(ROOT, "admin.html");
    fs.readFile(adminPath, (error, data) => {
      if (error) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(data);
    });
    return;
  }

  if (request.url.startsWith("/api/consultation") || request.url.startsWith("/api/lead")) {
    handleLead(request, response);
    return;
  }

  serveStatic(request, response);
});

server.listen(PORT, HOST, () => {
  console.log(`Atlas Estate Advisory running at http://${HOST}:${PORT}`);
});
