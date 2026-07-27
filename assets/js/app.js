const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const menu = document.querySelector("[data-menu]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function updateHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 18);
}
updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

function closeMenu({ restoreFocus = false } = {}) {
  if (!menu || !menuButton) return;
  menu.classList.remove("is-open");
  menuButton.setAttribute("aria-expanded", "false");
  header?.classList.remove("is-menu-open");
  document.body.classList.remove("menu-open");
  if (restoreFocus) menuButton.focus();
}

function openMenu() {
  if (!menu || !menuButton) return;
  menu.classList.add("is-open");
  menuButton.setAttribute("aria-expanded", "true");
  header?.classList.add("is-menu-open");
  document.body.classList.add("menu-open");
  menu.querySelector("a")?.focus();
}

menuButton?.addEventListener("click", () => {
  menuButton.getAttribute("aria-expanded") === "true" ? closeMenu() : openMenu();
});
menu?.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu({ restoreFocus: true });
});
window.addEventListener("resize", () => {
  if (window.innerWidth > 820) closeMenu();
});

// Highlight the active navigation section.
const navLinks = [...document.querySelectorAll('.primary-nav a[href^="#"]')];
const navSections = navLinks.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
if ("IntersectionObserver" in window) {
  const navObserver = new IntersectionObserver((entries) => {
    const active = entries.filter((entry) => entry.isIntersecting).sort((a,b) => b.intersectionRatio-a.intersectionRatio)[0];
    if (!active) return;
    navLinks.forEach((link) => {
      const current = link.getAttribute("href") === `#${active.target.id}`;
      current ? link.setAttribute("aria-current","true") : link.removeAttribute("aria-current");
    });
  }, { rootMargin: "-30% 0px -60% 0px", threshold: [0.01,.2,.5] });
  navSections.forEach((section) => navObserver.observe(section));
}

// Hero background control.
const heroVideo = document.querySelector("[data-hero-video]");
const heroToggle = document.querySelector("[data-hero-toggle]");
function setHeroControl() {
  if (!heroVideo || !heroToggle) return;
  const playing = !heroVideo.paused;
  heroToggle.querySelector(".media-toggle__icon").textContent = playing ? "Ⅱ" : "▶";
  heroToggle.querySelector(".media-toggle__label").textContent = playing ? "Pausar" : "Reproducir";
  heroToggle.setAttribute("aria-label", `${playing ? "Pausar" : "Reproducir"} video de fondo`);
}
heroToggle?.addEventListener("click", async () => {
  if (!heroVideo) return;
  try {
    heroVideo.paused ? await heroVideo.play() : heroVideo.pause();
  } catch {}
  setHeroControl();
});
heroVideo?.addEventListener("play", setHeroControl);
heroVideo?.addEventListener("pause", setHeroControl);
if (reduceMotion.matches) heroVideo?.pause();

// Section videos: explicit controls and autoplay only when strongly visible.
const videoControls = document.querySelectorAll("[data-video-control]");
videoControls.forEach((button) => {
  const container = button.closest("figure, section");
  const video = container?.querySelector("video");
  if (!video) return;

  const update = () => {
    const playing = !video.paused;
    button.querySelector("span:first-child").textContent = playing ? "Ⅱ" : "▶";
    button.querySelector("span:last-child").textContent = playing ? "Pausar" : "Reproducir";
    button.setAttribute("aria-label", `${playing ? "Pausar" : "Reproducir"} video`);
  };

  button.addEventListener("click", async () => {
    try { video.paused ? await video.play() : video.pause(); } catch {}
    update();
  });
  video.addEventListener("play", update);
  video.addEventListener("pause", update);
  update();
});

if (!reduceMotion.matches && "IntersectionObserver" in window) {
  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(async (entry) => {
      const video = entry.target;
      if (entry.isIntersecting && entry.intersectionRatio > .7) {
        try { await video.play(); } catch {}
      } else {
        video.pause();
      }
    });
  }, { threshold: [0,.7] });
  document.querySelectorAll("[data-section-video]").forEach((video) => videoObserver.observe(video));
}

reduceMotion.addEventListener?.("change", (event) => {
  if (event.matches) {
    heroVideo?.pause();
    document.querySelectorAll("[data-section-video]").forEach((video) => video.pause());
  } else {
    heroVideo?.play().catch(() => {});
  }
});

// Form validation with no simulated success.
const form = document.querySelector("[data-contact-form]");
const status = document.querySelector("[data-form-status]");
const submit = document.querySelector("[data-submit]");
const submitLabel = document.querySelector("[data-submit-label]");
const startedAt = Date.now();

const validationMessages = {
  valueMissing: "Completa este campo.",
  typeMismatch: "Ingresa un formato válido.",
  patternMismatch: "Revisa el formato ingresado.",
  tooShort: "Ingresa un poco más de información."
};

function errorElement(field) {
  return document.getElementById(`${field.id}-error`);
}

function validate(field) {
  const target = errorElement(field);
  let message = "";
  if (!field.validity.valid) {
    const key = Object.keys(validationMessages).find((name) => field.validity[name]);
    message = validationMessages[key] || "Revisa este campo.";
  }
  field.setAttribute("aria-invalid", message ? "true" : "false");
  if (target) {
    target.textContent = message;
    message ? field.setAttribute("aria-describedby", target.id) : field.removeAttribute("aria-describedby");
  }
  return !message;
}

function showStatus(message, kind="error") {
  if (!status) return;
  status.className = `form-status is-visible is-${kind}`;
  status.innerHTML = message;
  status.focus();
}

function loading(value) {
  form?.classList.toggle("is-loading", value);
  if (submit) submit.disabled = value;
  if (submitLabel) submitLabel.textContent = value ? "Enviando solicitud…" : "Solicitar visita técnica";
}

form?.querySelectorAll("input,select,textarea").forEach((field) => {
  field.addEventListener("blur", () => validate(field));
  field.addEventListener("input", () => {
    if (field.getAttribute("aria-invalid") === "true") validate(field);
  });
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fields = [...form.querySelectorAll("input,select,textarea")].filter((field) => !field.disabled);
  const valid = fields.map(validate).every(Boolean);

  if (!valid) {
    showStatus("Revisa los campos marcados antes de enviar.");
    form.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }

  if (form.elements.company.value || Date.now() - startedAt < 3000) {
    showStatus("No pudimos validar la solicitud. Intenta nuevamente.");
    return;
  }

  const endpoint = window.FORTISI_CONFIG?.contactEndpoint?.trim();
  if (!endpoint) {
    showStatus('El formulario todavía no está conectado a un servicio. Escribe a <a href="mailto:contacto@fortisi.cl">contacto@fortisi.cl</a> o llama al <a href="tel:+56987654321">+56 9 8765 4321</a>. No se simuló el envío.');
    return;
  }

  const payload = Object.fromEntries(new FormData(form).entries());
  delete payload.company;
  payload.submittedAt = new Date().toISOString();
  payload.source = "fortisi-worldclass-landing";

  loading(true);
  try {
    const response = await fetch(endpoint, {
      method:"POST",
      headers:{"Content-Type":"application/json","Accept":"application/json"},
      body:JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    form.reset();
    showStatus("Recibimos tu solicitud. El equipo FÓRTISI se pondrá en contacto contigo.","success");
  } catch {
    showStatus('No fue posible enviar la solicitud. Intenta nuevamente o escribe a <a href="mailto:contacto@fortisi.cl">contacto@fortisi.cl</a>.');
  } finally {
    loading(false);
  }
});
