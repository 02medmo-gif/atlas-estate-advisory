const form = document.querySelector("#lead-form");
const statusMessage = document.querySelector("#form-status");
const recipientEmail = "02medmo@gmail.com";

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = form.querySelector("button[type='submit']");
  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim();
  const payload = Object.fromEntries(formData.entries());

  statusMessage.textContent = "Envoi en cours...";
  submitButton.disabled = true;

  try {
    const response = await fetch("/api/consultation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("Consultation endpoint unavailable");

    statusMessage.textContent = name
      ? `Merci ${name}. Votre demande a bien ete recue. Nous reviendrons vers vous pour organiser un echange confidentiel.`
      : "Votre demande a bien ete recue. Nous reviendrons vers vous pour organiser un echange confidentiel.";
    form.reset();
  } catch (error) {
    const details = [
      ["Nom complet", formData.get("name")],
      ["Email", formData.get("email")],
      ["Telephone / WhatsApp", formData.get("phone")],
      ["Pays de residence", formData.get("residence")],
      ["Pays cible", formData.get("target")],
      ["Budget estime", formData.get("budget")],
      ["Objectif", formData.get("goal")],
      ["Message", formData.get("message")],
    ].map(([label, value]) => `${label}: ${String(value || "").trim()}`).join("\n");

    const subject = encodeURIComponent("Nouvelle demande - Atlas Estate Advisory");
    const body = encodeURIComponent(details);
    window.location.href = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
    statusMessage.textContent = "Le serveur n'est pas disponible. Un email prerempli va s'ouvrir pour transmettre votre demande.";
  } finally {
    submitButton.disabled = false;
  }
});
