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

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
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
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
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
  };

  const missing = ["name", "email", "phone", "residence", "target", "budget", "goal"].filter((field) => !lead[field]);
  if (missing.length) return { error: `Missing required fields: ${missing.join(", ")}` };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) return { error: "Invalid email address" };
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

    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(LEADS_FILE, `${JSON.stringify(result.lead)}\n`, "utf8");

    if (LEAD_WEBHOOK_URL) {
      fetch(LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.lead),
      }).catch((error) => console.error("Lead webhook failed:", error.message));
    }

    sendJson(response, 200, { ok: true, id: result.lead.id });
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
    response.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream" });
    response.end(data);
  });
}

const server = http.createServer((request, response) => {
  if (request.url === "/healthz" || request.url === "/status") {
    sendJson(response, 200, { ok: true });
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
