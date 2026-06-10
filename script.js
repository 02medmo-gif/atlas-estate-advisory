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

    if (!response.ok) {
      throw new Error("Lead endpoint unavailable");
    }

    const result = await response.json();
    const sheetsWarning = result.storage && !result.storage.googleSheets
      ? " La demande est sauvegardee en interne; synchronisation Google Sheets a verifier."
      : "";

    statusMessage.textContent = name
      ? `Merci ${name}. Votre demande a bien \u00e9t\u00e9 re\u00e7ue. Nous reviendrons vers vous pour organiser un \u00e9change confidentiel.`
      : "Votre demande a bien \u00e9t\u00e9 re\u00e7ue. Nous reviendrons vers vous pour organiser un \u00e9change confidentiel.";
    statusMessage.textContent += sheetsWarning;

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
    ]
      .map(([label, value]) => `${label}: ${String(value || "").trim()}`)
      .join("\n");

    const subject = encodeURIComponent("Nouvelle demande - Atlas Estate Advisory");
    const body = encodeURIComponent(details);
    window.location.href = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;

    statusMessage.textContent =
      "Le serveur n'est pas disponible. Un email pr\u00e9rempli va s'ouvrir pour transmettre votre demande.";
  } finally {
    submitButton.disabled = false;
  }
});

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const header = document.querySelector(".site-header");
const hero = document.querySelector(".hero");

function setHeaderState() {
  header?.classList.toggle("is-scrolled", window.scrollY > 24);
}

setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

if (!prefersReducedMotion) {
  const revealTargets = document.querySelectorAll(
    ".trust-item, .section-heading, .intro > *, .service-grid article, .destination-grid article, .advisor-card, .credibility-points article, .process-list li, .ideal-client, .contact-copy, .lead-form",
  );

  revealTargets.forEach((element) => element.classList.add("reveal-ready"));

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    revealTargets.forEach((element) => revealObserver.observe(element));
  } else {
    revealTargets.forEach((element) => element.classList.add("is-visible"));
  }
}

if (canHover && !prefersReducedMotion) {
  const interactiveSurfaces = document.querySelectorAll(
    ".trust-item, .service-grid article, .destination-grid article, .advisor-card, .credibility-points article, .process-list li, .lead-form, .client-grid p",
  );

  interactiveSurfaces.forEach((surface) => {
    surface.classList.add("interactive-surface");

    surface.addEventListener("mousemove", (event) => {
      const rect = surface.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const rotateY = ((x / rect.width) - 0.5) * 7;
      const rotateX = ((0.5 - y / rect.height)) * 7;

      surface.style.setProperty("--mx", `${x}px`);
      surface.style.setProperty("--my", `${y}px`);
      surface.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    surface.addEventListener("mouseleave", () => {
      surface.style.removeProperty("transform");
      surface.style.removeProperty("--mx");
      surface.style.removeProperty("--my");
    });
  });

  document.querySelectorAll(".button, .header-cta").forEach((button) => {
    button.addEventListener("mousemove", (event) => {
      const rect = button.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) * 0.12;
      const y = (event.clientY - rect.top - rect.height / 2) * 0.16;
      button.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });

    button.addEventListener("mouseleave", () => {
      button.style.removeProperty("transform");
    });
  });

  hero?.addEventListener("mousemove", (event) => {
    const rect = hero.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * -14;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * -10;

    hero.style.setProperty("--parallax-x", x.toFixed(2));
    hero.style.setProperty("--parallax-y", y.toFixed(2));
  });

  hero?.addEventListener("mouseleave", () => {
    hero.style.setProperty("--parallax-x", "0");
    hero.style.setProperty("--parallax-y", "0");
  });
}
