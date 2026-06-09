const tokenForm = document.querySelector("#token-form");
const tokenInput = document.querySelector("#admin-token");
const statusEl = document.querySelector("#admin-status");
const leadsBody = document.querySelector("#leads-body");
const leadCount = document.querySelector("#lead-count");
const latestDate = document.querySelector("#latest-date");
const refreshBtn = document.querySelector("#refresh-btn");

function tokenQuery() {
  const token = new URLSearchParams(window.location.search).get("token") || tokenInput.value.trim();
  return token ? `?token=${encodeURIComponent(token)}` : "";
}

function renderRows(leads) {
  leadCount.textContent = String(leads.length);
  latestDate.textContent = leads[0]?.createdAt ? new Date(leads[0].createdAt).toLocaleString("fr-FR") : "-";
  if (!leads.length) {
    leadsBody.innerHTML = "<tr><td colspan=\"10\">Aucune demande pour le moment.</td></tr>";
    return;
  }

  leadsBody.innerHTML = leads
    .map(
      (lead) => `
        <tr>
          <td>${new Date(lead.createdAt).toLocaleString("fr-FR")}</td>
          <td>${lead.name || ""}</td>
          <td><a href="mailto:${lead.email}">${lead.email || ""}</a></td>
          <td><a href="tel:${lead.phone}">${lead.phone || ""}</a></td>
          <td>${lead.residence || ""}</td>
          <td>${lead.target || ""}</td>
          <td>${lead.budget || ""}</td>
          <td>${lead.goal || ""}</td>
          <td>${lead.sheetsStatus || ""}</td>
          <td class="message-cell">${lead.message || ""}</td>
        </tr>
      `,
    )
    .join("");
}

async function loadLeads() {
  statusEl.textContent = "Chargement des demandes...";
  leadsBody.innerHTML = "<tr><td colspan=\"10\">Chargement...</td></tr>";

  const response = await fetch(`/api/leads${tokenQuery()}`, {
    headers: { Accept: "application/json" },
  });

  const data = await response.json();
  if (!response.ok) {
    statusEl.textContent = data.error || "Impossible de charger les demandes.";
    leadsBody.innerHTML = "<tr><td colspan=\"10\">Acces refuse ou donnees indisponibles.</td></tr>";
    return;
  }

  statusEl.textContent = `Demandes chargees: ${data.leads.length}`;
  renderRows(data.leads || []);
}

tokenForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  loadLeads().catch(() => {
    statusEl.textContent = "Erreur de chargement.";
  });
});

refreshBtn?.addEventListener("click", () => loadLeads().catch(() => {
  statusEl.textContent = "Erreur de chargement.";
}));

loadLeads().catch(() => {
  statusEl.textContent = "Erreur de chargement.";
});
