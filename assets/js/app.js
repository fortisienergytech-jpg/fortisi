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


// ===== FÓRTISI · INTERACTIVIDAD DEL PROTOTIPO =====
(() => {
  "use strict";

  const SURVEY_ENDPOINT = window.FORTISI_CONFIG?.surveyEndpoint?.trim?.() || "";
  const SURVEY_REMOTE_ENABLED = /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/.test(SURVEY_ENDPOINT);
  const ADMIN_DEMO_PASSWORD = "R3P_8vL#Qm27";
  const protoState = {
    diagnosticUsed:false,
    diagnosticCompleted:false,
    diagnosticResult:null,
    answers:{},
    step:0,
    current:"inicio"
  };

  function track(name, detail={}) {
    const payload={event:name,...detail};
    window.dataLayer?.push(payload);
    if(typeof window.clarity==="function") window.clarity("event",name);
    document.dispatchEvent(new CustomEvent("fortisi:event",{detail:payload}));
  }

  // Servicios desplegables
  document.querySelectorAll(".service-card[data-service]").forEach(card=>{
    const button=card.querySelector(".service-card__expand");
    button?.addEventListener("click",()=>{
      const open=card.classList.toggle("is-open");
      button.setAttribute("aria-expanded",String(open));
      track(`service_${open?"open":"close"}_${card.dataset.service}`);
    });
  });
  document.querySelectorAll("[data-service-cta]").forEach(a=>{
    a.addEventListener("click",()=>track("click_contact_from_service",{service:a.dataset.serviceCta}));
  });

  const kits={
    INICIA:{
      name:"INICIA",price:"Desde $789.900 + IVA",
      desc:"Instalamos y certificamos el cargador que ya tienes, previa evaluación de la instalación eléctrica del hogar.",
      inc:["Diagnóstico técnico del hogar","Proyecto y adecuación eléctrica requerida","Instalación del equipo aportado por el cliente","Gestión TE-6 SEC cuando corresponda"],
      benefit:"Ahorras tiempo y dinero cada vez que cargas. En casa puedes aprovechar la tarifa residencial BT1, normalmente menor que la carga pública, y cargar mientras el auto está estacionado. Como referencia FÓRTISI, la carga residencial puede costar aproximadamente 30–50% menos que carga pública AC y 50–65% menos que carga rápida DC, además de entregarte una instalación evaluada y certificada."
    },
    CONECTA:{
      name:"CONECTA",price:"Desde $1.929.000 + IVA",
      desc:"FÓRTISI suministra, instala y certifica tu cargador residencial en un solo proceso.",
      inc:["Diagnóstico técnico previo","Cargador residencial dimensionado para el proyecto","Instalación profesional completa","Gestión TE-6 SEC cuando corresponda","Garantía del equipo"],
      benefit:"Ahorras tiempo y dinero al cargar en casa. La tarifa residencial BT1 suele ser menor que la carga pública, por lo que como referencia FÓRTISI puedes pagar aproximadamente 30–50% menos que en carga AC pública y 50–65% menos que en carga rápida DC. El resultado depende de tarifas, vehículo y hábitos de carga."
    },
    GENERA:{
      name:"GENERA",price:"Desde $7.290.000 + IVA",
      desc:"Generación solar on-grid orientada a la movilidad: los excedentes diurnos se valorizan mediante Netbilling para compensar parte de la energía comprada después al cargar el vehículo. Puede usar tu cargador actual o sumar uno al proyecto; la versión base no incorpora batería.",
      inc:["Diagnóstico y dimensionamiento","Sistema fotovoltaico","Inversor on-grid y protecciones","Netbilling y certificaciones cuando corresponda","Integración con cargador existente o carga residencial opcional","Orientación en financiamiento verde"],
      benefit:"El beneficio de GENERA es principalmente financiero: produces durante el día y los excedentes valorizados mediante Netbilling ayudan a compensar parte de la energía que comprarás después, por ejemplo al cargar tu vehículo de noche. El resultado real depende de radiación, generación, autoconsumo, valorización de excedentes, tarifa y hábitos de carga."
    },
    ALMACENA:{
      name:"ALMACENA",price:"Desde $9.890.000 + IVA",
      desc:"Solar + inversor híbrido + batería para almacenar físicamente energía durante el día y utilizarla después, con foco en apoyar la carga nocturna del vehículo. Puede usar tu cargador actual o incorporar uno al proyecto.",
      inc:["Sistema solar fotovoltaico","Inversor híbrido y protecciones","Batería de almacenamiento","Integración con carga residencial","Gestión energética","Certificaciones aplicables","Orientación en financiamiento verde"],
      benefit:"ALMACENA cambia la lógica: en vez de compensar solo financieramente mediante Netbilling, guarda físicamente energía solar para utilizarla después, especialmente al cargar el vehículo fuera del horario solar. El beneficio depende de generación, capacidad de batería, eficiencia, tarifa y hábitos de carga."
    },
    CASA:{
      name:"CASA FÓRTISI",price:"Desde $12.490.000 + IVA",
      desc:"Integramos generación solar, batería de mayor capacidad, carga residencial y consumos del hogar bajo una misma gestión energética, con acompañamiento FÓRTISI CUIDA.",
      inc:["Sistema fotovoltaico dimensionado para vivienda + movilidad","Inversor híbrido y batería de mayor capacidad","Carga residencial integrada","Gestión energética de hogar y vehículo","Adecuaciones, protecciones y gestión SEC aplicable","Garantía extendida","Mantención anual sin costo durante 2 años","Monitoreo en línea del sistema fotovoltaico","Gestión directa de equipos al final de su vida útil"],
      benefit:"El ahorro integra carga residencial, generación solar y almacenamiento: pagas menos por cargar que en alternativas públicas, produces parte de la electricidad que consume el hogar y aprovechas mejor esa energía mediante batería. El retorno debe calcularse caso a caso según consumo, kilómetros recorridos, radiación, tarifas, batería y financiamiento."
    },
    CUIDA:{
      name:"FÓRTISI Cuida",price:"Consultar",
      desc:"Revisión y mantención técnica para instalaciones existentes.",
      inc:["Revisión de equipos instalados","Inspección eléctrica","Informe técnico de estado","Recomendaciones de mejora"],
      benefit:"Revisar la instalación antes de seguir invirtiendo ayuda a identificar riesgos, pérdidas de desempeño y oportunidades de integración."
    },
    DIAGNOSTICO:{
      name:"Diagnóstico técnico FÓRTISI",price:"Visita técnica diagnóstica",
      desc:"Evaluamos tu instalación antes de recomendar una inversión.",
      inc:["Revisión de tablero y protecciones","Evaluación de capacidad disponible","Validación de factibilidad","Informe con siguiente paso recomendado"],
      benefit:"Un diagnóstico previo reduce la incertidumbre técnica y ayuda a evitar adecuaciones o inversiones innecesarias."
    },
    MODERNIZA:{
      name:"Modernización y ampliación",price:"Consultar",
      desc:"Integramos o ampliamos instalaciones existentes sin obligarte a comenzar desde cero.",
      inc:["Evaluación de instalación existente","Revisión de compatibilidad","Plan de integración o ampliación","Recomendación del siguiente nivel"],
      benefit:"Aprovechar lo que ya tienes protege la inversión realizada y permite avanzar por etapas."
    }
  };

  const questions={
    tipoSuministro:{q:"¿Sabes qué tipo de suministro eléctrico tiene tu instalación residencial?",h:"FÓRTISI está orientado inicialmente a instalaciones residenciales monofásicas. Si no lo sabes, podemos verificarlo durante la visita técnica.",opts:[
      ["monofasico","Monofásico"],["no_se","No lo sé"],["trifasico","Trifásico"]
    ]},
    inicio:{q:"¿Qué necesitas resolver en tu hogar?",h:"Selecciona tu objetivo principal para orientarte con mayor precisión.",opts:[
      ["cargador","Instalar un cargador para mi vehículo 100% eléctrico"],
      ["carga_solar","Cargar mi vehículo y evaluar energía solar"],
      ["solar","Instalar paneles solares en mi hogar"],
      ["autonomia","Lograr mayor autonomía energética"],
      ["existente","Revisar o mejorar una instalación existente"]
    ]},
    estacionamiento:{q:"¿Cuentas con estacionamiento propio o un espacio definido para instalar el cargador?",h:"Esto permite orientar la factibilidad inicial de carga residencial.",opts:[
      ["si","Sí, tengo estacionamiento propio"],["validar","Sí, pero quiero validar factibilidad técnica"],["duda","No estoy seguro/a"],["no","No por ahora"]
    ]},
    cargador:{q:"¿Ya tienes un cargador adquirido?",h:"Así diferenciamos si necesitas instalar tu equipo o una solución completa.",opts:[
      ["tengo","Sí, ya tengo el cargador"],["necesito","No, necesito que FÓRTISI lo provea"],["duda","No estoy seguro/a del tipo de cargador"]
    ]},
    espacioSolar:{q:"¿Tu casa cuenta con espacio para instalar paneles solares?",h:"Puede ser techo, estacionamiento, cubierta o un área técnicamente viable.",opts:[
      ["techo","Sí, en techo"],["cubierta","Sí, en estacionamiento, cubierta o patio"],["duda","No estoy seguro/a"],["no","No por ahora"]
    ]},
    objetivoSolar:{q:"¿Qué objetivo buscas lograr con energía solar?",h:"Tu objetivo ayuda a definir si conviene partir con generación, almacenamiento o una solución integral.",opts:[
      ["cuenta","Reducir mi cuenta eléctrica"],["cargar","Cargar mi vehículo con energía solar"],["bateria","Agregar batería para mayor autonomía"],["gestion","Gestionar mejor la energía de mi hogar"]
    ]},
    existente:{q:"¿Qué necesitas revisar o mejorar?",h:"No necesitas conocer la solución técnica. FÓRTISI te orienta según tu punto de partida.",opts:[
      ["revision","Revisar la instalación eléctrica de mi casa"],
      ["artefacto","Instalar un equipo eléctrico de alto consumo"],
      ["potencia","Aumentar la potencia disponible"],
      ["cargador_existente","Ya tengo un cargador residencial instalado"],
      ["solar_existente","Ya tengo paneles solares instalados"],
      ["integrar","Tengo cargador y paneles, pero quiero integrarlos mejor"]
    ]}
  };

  const body=document.querySelector("[data-diagnostic-body]");
  const progress=[...document.querySelectorAll(".diagnostic-tool__progress span")];

  function updateProgress(){
    progress.forEach((el,i)=>el.classList.toggle("is-done",i<=Math.min(protoState.step,2)));
  }
  function renderQuestion(key="tipoSuministro"){
    protoState.current=key;
    const q=questions[key];
    body.innerHTML=`<p class="diagnostic-question">${q.q}</p>
      <p class="diagnostic-hint">${q.h}</p>
      <div class="diagnostic-options">${q.opts.map(([v,l])=>`<button class="diagnostic-option" type="button" data-diag-value="${v}">${l}</button>`).join("")}</div>`;
    body.querySelectorAll("[data-diag-value]").forEach(btn=>btn.addEventListener("click",()=>choose(btn.dataset.diagValue)));
    updateProgress();
  }
  function choose(value){
    if(!protoState.diagnosticUsed){protoState.diagnosticUsed=true;track("diagnostic_started")}
    protoState.answers[protoState.current]=value;
    protoState.step=Math.min(protoState.step+1,2);
    const c=protoState.current;
    if(c==="tipoSuministro"){
      if(value==="trifasico") return showResult("DIAGNOSTICO");
      return renderQuestion("inicio");
    }
    if(c==="inicio"){
      if(value==="cargador"||value==="carga_solar") return renderQuestion("estacionamiento");
      if(value==="solar"||value==="autonomia") return renderQuestion("espacioSolar");
      return renderQuestion("existente");
    }
    if(c==="estacionamiento"){
      if(["no","duda","validar"].includes(value)) return showResult("DIAGNOSTICO");
      if(protoState.answers.inicio==="carga_solar") return renderQuestion("espacioSolar");
      return renderQuestion("cargador");
    }
    if(c==="cargador") return showResult(value==="tengo"?"INICIA":"CONECTA");
    if(c==="espacioSolar"){
      if(value==="no") return showResult("DIAGNOSTICO");
      return renderQuestion("objetivoSolar");
    }
    if(c==="objetivoSolar"){
      if(value==="bateria") return showResult("ALMACENA");
      if(value==="gestion") return showResult("CASA");
      if(protoState.answers.inicio==="autonomia") return showResult("ALMACENA");
      return showResult("GENERA");
    }
    if(c==="existente"){
      if(["revision","artefacto","potencia"].includes(value)) return showResult("DIAGNOSTICO");
      if(["cargador_existente","solar_existente"].includes(value)) return showResult("CUIDA");
      return showResult("MODERNIZA");
    }
  }
  function showResult(key){
    const k=kits[key];
    protoState.diagnosticCompleted=true;
    protoState.diagnosticResult=key.toLowerCase();
    progress.forEach(el=>el.classList.add("is-done"));
    track("diagnostic_completed",{result:protoState.diagnosticResult});
    track("diagnostic_result_"+protoState.diagnosticResult);
    body.innerHTML=`
      <p class="eyebrow">Tu orientación inicial FÓRTISI</p>
      <h3>${k.name}</h3>
      <div class="diagnostic-result-price">${k.price}</div>
      <p>${k.desc}</p>
      <div class="diagnostic-benefit"><strong>¿Qué beneficio obtienes?</strong><p>${k.benefit}</p></div>
      <h4>Este camino considera:</h4>
      <ul class="diagnostic-list">${k.inc.map(i=>`<li>${i}</li>`).join("")}</ul>
      <p class="legal-note">Esta orientación no reemplaza la visita técnica. La recomendación final depende de las condiciones eléctricas y físicas de la vivienda.</p>
      <div class="diagnostic-actions">
        <a class="button button--dark" href="#contacto" data-diagnostic-contact>Agendar visita técnica</a>
        <button class="button button--outline" type="button" data-diagnostic-restart>Volver a empezar</button>
      </div>`;
    body.querySelector("[data-diagnostic-restart]")?.addEventListener("click",resetDiagnostic);
    body.querySelector("[data-diagnostic-contact]")?.addEventListener("click",()=>track("click_contact_from_diagnostic",{result:protoState.diagnosticResult}));
  }
  function resetDiagnostic(){
    protoState.answers={};
    protoState.step=0;
    protoState.current="tipoSuministro";
    protoState.diagnosticCompleted=false;
    protoState.diagnosticResult=null;
    renderQuestion("tipoSuministro");
    requestAnimationFrame(()=>{
      document.getElementById("diagnostico")?.scrollIntoView({behavior:"smooth",block:"start"});
    });
  }
  if(body) renderQuestion("tipoSuministro");

  // Encuesta
  const modal=document.querySelector("[data-survey-modal]");
  const surveyForm=document.querySelector("[data-survey-form]");
  const surveyStatus=document.querySelector("[data-survey-status]");

  function openSurvey(){
    modal.hidden=false;
    document.body.style.overflow="hidden";
    track("survey_opened",{diagnosticUsed:protoState.diagnosticUsed});
    setTimeout(()=>modal.querySelector("textarea,input,button")?.focus(),30);
  }
  function closeSurvey(){
    modal.hidden=true;
    document.body.style.overflow="";
  }
  document.querySelector("[data-survey-open]")?.addEventListener("click",openSurvey);
  document.querySelector("[data-survey-open-secondary]")?.addEventListener("click",openSurvey);
  document.querySelectorAll("[data-survey-close]").forEach(el=>el.addEventListener("click",closeSurvey));
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!modal.hidden) closeSurvey()});
async function saveSurvey(data){
    // Respaldo local: útil si la conexión se corta durante una prueba.
    const localRows=JSON.parse(localStorage.getItem("fortisiPrototypeSurvey")||"[]");
    localRows.push(data);
    localStorage.setItem("fortisiPrototypeSurvey",JSON.stringify(localRows));

    if(!SURVEY_REMOTE_ENABLED) return {mode:"local"};

    // Apps Script no implementa OPTIONS; text/plain + no-cors evita el preflight.
    // La respuesta será opaca, pero el POST llega al Web App y queda en Google Sheets.
    await fetch(SURVEY_ENDPOINT,{
      method:"POST",
      mode:"no-cors",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(data),
      keepalive:true
    });
    return {mode:"remote"};
  }

  function loadRemoteSurveyRows(){
    if(!SURVEY_REMOTE_ENABLED) return Promise.resolve(null);
    return new Promise((resolve,reject)=>{
      const callback="__fortisiSurvey_"+Date.now()+"_"+Math.random().toString(36).slice(2);
      const script=document.createElement("script");
      const timer=setTimeout(()=>{
        cleanup();
        reject(new Error("Tiempo de espera agotado al consultar Google Sheets"));
      },10000);
      function cleanup(){
        clearTimeout(timer);
        script.remove();
        try{delete window[callback]}catch{}
      }
      window[callback]=(payload)=>{
        cleanup();
        if(payload && payload.ok===false) reject(new Error(payload.error||"No fue posible leer Google Sheets"));
        else resolve(Array.isArray(payload?.rows)?payload.rows:[]);
      };
      const sep=SURVEY_ENDPOINT.includes("?")?"&":"?";
      script.src=SURVEY_ENDPOINT+sep+"action=list&prefix="+encodeURIComponent(callback)+"&_="+Date.now();
      script.onerror=()=>{cleanup();reject(new Error("No fue posible conectar con Google Sheets"));};
      document.head.appendChild(script);
    });
  }

  surveyForm?.addEventListener("submit",async e=>{
    e.preventDefault();
    if(!surveyForm.reportValidity()) return;
    const fd=new FormData(surveyForm);
    const data=Object.fromEntries(fd.entries());
    data.servicesRemembered=fd.getAll("servicesRemembered");
    data.timestamp=new Date().toISOString();
    data.diagnosticUsed=protoState.diagnosticUsed;
    data.diagnosticCompleted=protoState.diagnosticCompleted;
    data.diagnosticResult=protoState.diagnosticResult;
    data.page=location.href;
    surveyStatus.textContent="Enviando…";
    try{
      await saveSurvey(data);
      surveyStatus.textContent="Gracias. Tu respuesta quedó registrada y nos ayudará a mejorar el prototipo.";
      track("survey_completed",{diagnosticUsed:protoState.diagnosticUsed,diagnosticResult:protoState.diagnosticResult});
      surveyForm.reset();
      setTimeout(()=>{
        closeSurvey();
        document.querySelector("[data-survey-open]").hidden=true;
      },1600);
    }catch{
      surveyStatus.textContent="No fue posible registrar tu respuesta. Intenta nuevamente.";
    }
  });

  // Administrador oculto: 5 clics sobre logo del encabezado
  const adminLogin=document.querySelector("[data-admin-login]");
  const adminPanel=document.querySelector("[data-admin-panel]");
  const loginForm=document.querySelector("[data-admin-login-form]");
  const loginStatus=document.querySelector("[data-admin-login-status]");
  const brand=document.querySelector(".site-header .brand");
  let clickCount=0,timer=null;

  brand?.addEventListener("click",e=>{
    clickCount++;
    clearTimeout(timer);
    timer=setTimeout(()=>clickCount=0,1800);
    if(clickCount>=5){
      e.preventDefault();clickCount=0;
      adminLogin.hidden=false;document.body.style.overflow="hidden";
      setTimeout(()=>document.querySelector("#admin-pass")?.focus(),30);
    }
  });

  function closeAdmin(){
    adminLogin.hidden=true;adminPanel.hidden=true;document.body.style.overflow="";
    loginForm?.reset();if(loginStatus) loginStatus.textContent="";
  }
  document.querySelectorAll("[data-admin-close]").forEach(el=>el.addEventListener("click",closeAdmin));

  function localRows(){return JSON.parse(localStorage.getItem("fortisiPrototypeSurvey")||"[]")}
  async function rows(){
    if(SURVEY_REMOTE_ENABLED){
      try{
        const remote=await loadRemoteSurveyRows();
        if(Array.isArray(remote)) return remote;
      }catch(err){
        console.warn("FÓRTISI: dashboard remoto no disponible; se usa respaldo local.",err);
      }
    }
    return localRows();
  }
  const pct=(n,d)=>d?Math.round(n*100/d)+"%":"—";
  const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  function bars(el,data,total){
    const entries=Object.entries(data);
    el.innerHTML=entries.length?entries.map(([label,value])=>`<div class="admin-bar-row"><span>${esc(label)}</span><div class="admin-bar"><span style="width:${total?value*100/total:0}%"></span></div><strong>${pct(value,total)}</strong></div>`).join(""):'<div class="admin-empty">Sin datos todavía.</div>';
  }
  async function renderAdmin(){
    const refreshBtn=document.querySelector("[data-admin-refresh]");
    if(refreshBtn){refreshBtn.disabled=true;refreshBtn.textContent="Actualizando…";}
    let data=[];
    try{data=await rows();}finally{
      if(refreshBtn){refreshBtn.disabled=false;refreshBtn.textContent="Actualizar";}
    }
    const n=data.length;
    document.querySelector("[data-admin-total]").textContent=n;

    // Indicadores-resumen calculados SOLO con las 8 preguntas vigentes.
    const positiveCount=data.filter(r=>["muy_claro","claro"].includes(r.clarity)).length;
    document.querySelector("[data-admin-positive]").textContent=pct(positiveCount,n);

    const simulatorUsed=data.filter(r=>r.savingsModule && r.savingsModule!=="no_lo_use").length;
    document.querySelector("[data-admin-simulator]").textContent=pct(simulatorUsed,n);

    const contactPositive=data.filter(r=>["muy_probable","probable"].includes(r.contactIntent)).length;
    document.querySelector("[data-admin-contact]").textContent=pct(contactPositive,n);

    const fortisiContactPositive=data.filter(r=>["si_definitivamente","probablemente_si"].includes(r.fortisiContact)).length;
    document.querySelector("[data-admin-fortisi-contact]").textContent=pct(fortisiContactPositive,n);

    const q1Labels={
      muy_claro:"😍 Me encantó",
      claro:"🙂 Me gustó y fue clara",
      poco_claro:"🤔 Me quedaron dudas",
      no_entendi:"😕 Necesita ser más clara"
    };
    const serviceLabels={
      cargadores:"Instalación de cargadores residenciales",
      solar:"Energía solar residencial",
      baterias:"Baterías de almacenamiento",
      mantencion:"Mantención y acompañamiento",
      residuos:"Gestión responsable de residuos eléctricos",
      no_recuerdo:"No lo recuerda"
    };
    const q3Labels={
      muy_util:"Muy útil",util:"Útil",poco_util:"Poco útil",no_lo_use:"No lo utilizó"
    };
    const q4Labels={
      muy_faciles:"Muy fáciles",faciles:"Fáciles",algo_confusos:"Algo confusos",
      muy_confusos:"Muy confusos",no_lo_use:"No lo utilizó"
    };
    const q5Labels={
      muy_util:"Muy útil",util:"Útil",poco_util:"Poco útil",
      no_me_ayudo:"No le ayudó a decidir",no_lo_use:"No lo utilizó"
    };
    const q6Labels={
      si_claramente:"Sí, claramente",mas_o_menos:"Más o menos",
      necesito_asesoria:"Necesitaría asesoría antes de decidir",no:"No"
    };
    const q7Labels={
      muy_probable:"Muy probable",probable:"Probable",poco_probable:"Poco probable",nada_probable:"Nada probable"
    };
    const q8Labels={
      tengo_ev:"Tiene un auto eléctrico",
      pienso_comprar:"Piensa comprar uno en el futuro",
      tengo_combustion_interes:"Tiene auto a combustión y evalúa el cambio",
      sin_auto_interes:"No tiene auto eléctrico, pero le interesa la energía solar",
      sin_interes:"No tiene y por ahora no le interesa"
    };
    const q9Labels={
      si_definitivamente:"Sí, definitivamente",
      probablemente_si:"Probablemente sí",
      tal_vez_mas_info:"Tal vez, necesitaría más información",
      no_lo_creo:"No lo creo"
    };

    function countSingle(field,labels){
      const out={};
      data.forEach(r=>{
        const raw=r[field];
        const label=labels[raw]||raw||"Sin respuesta";
        out[label]=(out[label]||0)+1;
      });
      return out;
    }

    bars(document.querySelector("[data-admin-q1]"),countSingle("clarity",q1Labels),n);

    // Pregunta 2 permite respuesta múltiple: el porcentaje representa % de encuestados que recordó cada servicio.
    const rememberedCounts={};
    data.forEach(r=>{
      const vals=Array.isArray(r.servicesRemembered)?r.servicesRemembered:(r.servicesRemembered?[r.servicesRemembered]:[]);
      vals.forEach(v=>{
        const label=serviceLabels[v]||v;
        rememberedCounts[label]=(rememberedCounts[label]||0)+1;
      });
      if(!vals.length) rememberedCounts["Sin respuesta"]=(rememberedCounts["Sin respuesta"]||0)+1;
    });
    bars(document.querySelector("[data-admin-q2]"),rememberedCounts,n);

    bars(document.querySelector("[data-admin-q3]"),countSingle("savingsModule",q3Labels),n);
    bars(document.querySelector("[data-admin-q4]"),countSingle("savingsClarity",q4Labels),n);
    bars(document.querySelector("[data-admin-q5]"),countSingle("kitAdvisor",q5Labels),n);
    bars(document.querySelector("[data-admin-q6]"),countSingle("solutionFit",q6Labels),n);
    bars(document.querySelector("[data-admin-q7]"),countSingle("contactIntent",q7Labels),n);
    bars(document.querySelector("[data-admin-q8]"),countSingle("vehicleStatus",q8Labels),n);
    bars(document.querySelector("[data-admin-q9]"),countSingle("fortisiContact",q9Labels),n);

    const table=document.querySelector("[data-admin-table]");
    table.innerHTML=n?`<table class="admin-table">
      <thead><tr>
        <th>Fecha</th><th>1. Experiencia</th><th>2. Servicios recordados</th>
        <th>3. Utilidad ahorro</th><th>4. Claridad simulador</th>
        <th>5. Orientación KIT</th><th>6. Identifica solución</th>
        <th>7. Intención diagnóstico</th><th>8. Situación actual</th><th>9. Contactaría FÓRTISI</th>
      </tr></thead>
      <tbody>${data.slice().reverse().map(r=>{
        const remembered=Array.isArray(r.servicesRemembered)
          ? r.servicesRemembered.map(v=>serviceLabels[v]||v).join(", ")
          : (serviceLabels[r.servicesRemembered]||r.servicesRemembered||"");
        return `<tr>
          <td>${esc((r.timestamp||"").replace("T"," ").slice(0,16))}</td>
          <td>${esc(q1Labels[r.clarity]||r.clarity||"")}</td>
          <td>${esc(remembered)}</td>
          <td>${esc(q3Labels[r.savingsModule]||r.savingsModule||"")}</td>
          <td>${esc(q4Labels[r.savingsClarity]||r.savingsClarity||"")}</td>
          <td>${esc(q5Labels[r.kitAdvisor]||r.kitAdvisor||"")}</td>
          <td>${esc(q6Labels[r.solutionFit]||r.solutionFit||"")}</td>
          <td>${esc(q7Labels[r.contactIntent]||r.contactIntent||"")}</td>
          <td>${esc(q8Labels[r.vehicleStatus]||r.vehicleStatus||"")}</td>
          <td>${esc(q9Labels[r.fortisiContact]||r.fortisiContact||"")}</td>
        </tr>`;
      }).join("")}</tbody>
    </table>`:'<div class="admin-empty">Aún no hay respuestas registradas.</div>';
  }

  loginForm?.addEventListener("submit",e=>{
    e.preventDefault();
    const pass=document.querySelector("#admin-pass")?.value||"";
    if(pass!==ADMIN_DEMO_PASSWORD){loginStatus.textContent="Clave incorrecta.";return}
    adminLogin.hidden=true;adminPanel.hidden=false;renderAdmin();
  });
  document.querySelector("[data-admin-refresh]")?.addEventListener("click",renderAdmin);
  document.querySelector("[data-admin-export]")?.addEventListener("click",async()=>{
    const data=await rows();if(!data.length)return;
    const keys=[...new Set(data.flatMap(r=>Object.keys(r)))];
    const q=v=>`"${String(Array.isArray(v)?v.join(" | "):v??"").replaceAll('"','""')}"`;
    const csv=[keys.map(q).join(","),...data.map(r=>keys.map(k=>q(r[k])).join(","))].join("\n");
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));
    a.download="fortisi-validacion-prototipo.csv";a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1200);
  });
})();



// ===== CENTRO DE AHORRO FÓRTISI · SIMULADORES INTUITIVOS =====
(() => {
  const EVS = {"tesla-y": {"name": "Tesla Model Y", "battery": 60.0, "consumption": 16.5}, "tesla-3": {"name": "Tesla Model 3", "battery": 60.0, "consumption": 14.5}, "volvo-ex30": {"name": "Volvo EX30", "battery": 51.0, "consumption": 16.0}, "maxus-ed3": {"name": "Maxus eDeliver 3", "battery": 50.2, "consumption": 23.6}, "renault-kwid": {"name": "Renault Kwid E-Tech", "battery": 26.8, "consumption": 14.0}, "byd-yuan": {"name": "BYD Yuan Plus EV", "battery": 60.5, "consumption": 16.5}, "byd-mini": {"name": "BYD Dolphin Mini", "battery": 38.9, "consumption": 13.5}, "geely-ex2": {"name": "Geely EX2", "battery": 40.2, "consumption": 13.5}, "jac-ignite": {"name": "JAC Ignite 30X", "battery": 41.0, "consumption": 15.5}, "dongfeng-nammi": {"name": "Dongfeng Nammi 001", "battery": 42.3, "consumption": 14.5}};
  const money = n => new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(Math.max(0,Number(n)||0));
  const number = n => new Intl.NumberFormat("es-CL",{maximumFractionDigits:1}).format(Number(n)||0);
  const IVA = 1.19;
  const KIT_GROSS = {
    GENERA:7290000*IVA,
    ALMACENA:9890000*IVA,
    CASA:12490000*IVA
  };

  function byId(id){ return document.getElementById(id); }
  function txt(sel,val){ const el=document.querySelector(sel); if(el) el.textContent=val; }
  function on(el,ev,fn){ el?.addEventListener(ev,fn); }

  // Tabs
  document.querySelectorAll("[data-scenario-tab]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const key=btn.dataset.scenarioTab;
      document.querySelectorAll("[data-scenario-tab]").forEach(b=>b.classList.toggle("is-active",b===btn));
      document.querySelectorAll("[data-scenario-panel]").forEach(p=>p.classList.toggle("is-active",p.dataset.scenarioPanel===key));
    });
  });

  // Fuel reference values (editable starting points)
  const fuelRefs={"93":1478,"95":1510,"97":1545,"diesel":1267};
  const fuelType=byId("sim-fuel-type"), fuelPrice=byId("sim-fuel-price");
  on(fuelType,"change",()=>{ if(fuelPrice) fuelPrice.value=fuelRefs[fuelType.value]||1478; updateComb(); });

  function evSpec(selectId,otherId){
    const sel=byId(selectId);
    if(!sel) return {name:"Eléctrico de referencia",battery:50,consumption:16};
    if(sel.value==="other"){
      return {name:"Vehículo eléctrico",battery:Number(byId(otherId)?.value||50),consumption:16};
    }
    return EVS[sel.value] || {name:"Eléctrico de referencia",battery:50,consumption:16};
  }

  function updateComb(){
    const km=Number(byId("sim-km-month")?.value||1200);
    const eff=Number(byId("sim-efficiency")?.value||12);
    const fp=Number(byId("sim-fuel-price")?.value||1478);
    const rate=Number(byId("sim-home-rate")?.value||170);
    const ev=evSpec("sim-ev-model","sim-other-battery");
    const fuelCost=eff>0 ? (km/eff)*fp : 0;
    const evEnergy=km*ev.consumption/100;
    const evCost=evEnergy*rate;
    const saving=Math.max(0,fuelCost-evCost);
    const equivalentCharges=ev.battery>0 ? evEnergy/ev.battery : 0;

    if(byId("sim-km-month-out")) byId("sim-km-month-out").textContent=`${new Intl.NumberFormat("es-CL").format(km)} km`;
    txt("[data-comb-current-cost]",`${money(fuelCost)}/mes`);
    txt("[data-comb-current-detail]",`${number(km/eff)} litros/mes · ${money(fp)} por litro`);
    txt("[data-comb-ev-cost]",`${money(evCost)}/mes`);
    txt("[data-comb-ev-detail]",`${ev.name} · ${number(evEnergy)} kWh/mes · equivale a aprox. ${number(equivalentCharges)} cargas completas de una batería de ${number(ev.battery)} kWh`);
    txt("[data-comb-save-month]",money(saving));
    txt("[data-comb-save-year]",money(saving*12));
    const combPct = fuelCost>0 ? Math.max(0,Math.min(100,(saving/fuelCost)*100)) : 0;
    txt("[data-comb-save-percent]",`${Math.round(combPct)}%`);
    txt("[data-comb-charges]",`${number(equivalentCharges)} al mes`);
  }

  const combInputs=["sim-fuel-price","sim-efficiency","sim-km-month","sim-ev-model","sim-other-battery","sim-home-rate"];
  combInputs.forEach(id=>{on(byId(id),"input",updateComb);on(byId(id),"change",updateComb);});
  on(byId("sim-ev-model"),"change",()=>{
    if(byId("sim-other-ev-wrap")) byId("sim-other-ev-wrap").hidden=byId("sim-ev-model").value!=="other";
    updateComb();
  });

  function updateEV2(){
    const km=Number(byId("ev2-km")?.value||1200);
    const mode=byId("ev2-current-mode")?.value||"public-ac";
    const homeRate=Number(byId("ev2-home-rate")?.value||170);
    const acRate=Number(byId("ev2-ac-rate")?.value||340);
    const dcRate=Number(byId("ev2-dc-rate")?.value||440);
    const ev=evSpec("ev2-model","ev2-other-battery");
    const energy=km*ev.consumption/100;
    const charges=ev.battery>0 ? energy/ev.battery : 0;
    const homeCost=energy*homeRate;
    let currentCost=homeCost, title="", time="", convenience="", security="", timeBenefit="", kit="KIT INICIA", kitCopy="Si ya tienes el cargador, comenzamos por instalarlo de forma segura y gestionar la certificación correspondiente.";

    if(mode==="public-ac"){
      currentCost=energy*acRate;
      title="Electrolinera · AC";
      const h=ev.battery/22;
      time=`Una carga completa puede requerir aprox. ${number(h)} h conectada, según potencia disponible.`;
      convenience="Requiere desplazarte y depender de disponibilidad.";
      security="Infraestructura de carga dedicada, pero fuera de tu hogar.";
      const hrs=Math.max(0,charges*12*0.5);
      timeBenefit=`≈ ${Math.round(hrs)} h/año de desplazamientos y gestiones evitables`;
      kit="KIT CONECTA";
      kitCopy="Si necesitas una solución completa, FÓRTISI provee, instala y certifica tu cargador residencial.";
    }else if(mode==="public-dc"){
      currentCost=energy*dcRate;
      title="Electrolinera · DC rápida";
      const min=(ev.battery/50)*60;
      time=`Carga rápida de referencia: aprox. ${Math.round(min)} min por carga completa equivalente.`;
      convenience="Menor tiempo de carga, pero requiere desplazamiento.";
      security="Infraestructura dedicada; dependes de ubicación y disponibilidad.";
      const hrs=Math.max(0,charges*12*0.5);
      timeBenefit=`≈ ${Math.round(hrs)} h/año de desplazamientos y gestiones evitables`;
      kit="KIT CONECTA";
      kitCopy="Carga en casa para el uso diario y deja la carga rápida para cuando realmente la necesites.";
    }else{
      currentCost=homeCost;
      title="Cable portátil / enchufe";
      const h=ev.battery/2.3;
      time=`Una carga completa puede tomar aprox. ${number(h)} h a 2,3 kW.`;
      convenience="Carga lenta y condicionada a la instalación existente.";
      security="La instalación debe evaluarse antes de usarla como carga habitual.";
      const homeH=ev.battery/7;
      timeBenefit=`≈ ${number(h-homeH)} h menos por carga completa equivalente`;
      kit="KIT INICIA";
      kitCopy="Si ya tienes cargador, FÓRTISI puede instalarlo con circuito dedicado, protecciones y certificación correspondiente.";
    }

    const saving=Math.max(0,currentCost-homeCost);
    if(byId("ev2-km-out")) byId("ev2-km-out").textContent=`${new Intl.NumberFormat("es-CL").format(km)} km`;
    txt("[data-ev2-current-title]",title);
    txt("[data-ev2-current-cost]",money(currentCost));
    txt("[data-ev2-current-time]",time);
    txt("[data-ev2-current-convenience]",convenience);
    txt("[data-ev2-current-security]",security);
    txt("[data-ev2-home-cost]",money(homeCost));
    txt("[data-ev2-save-month]",money(saving));
    txt("[data-ev2-save-year]",money(saving*12));
    const evPct = currentCost>0 ? Math.max(0,Math.min(100,(saving/currentCost)*100)) : 0;
    txt("[data-ev2-save-percent]",`${Math.round(evPct)}%`);
    txt("[data-ev2-time-benefit]",timeBenefit);
    txt("[data-ev2-kit]",kit);
    txt("[data-ev2-kit-copy]",kitCopy);
  }

  ["ev2-model","ev2-other-battery","ev2-current-mode","ev2-km","ev2-home-rate","ev2-ac-rate","ev2-dc-rate"].forEach(id=>{on(byId(id),"input",updateEV2);on(byId(id),"change",updateEV2);});
  on(byId("ev2-model"),"change",()=>{
    if(byId("ev2-other-wrap")) byId("ev2-other-wrap").hidden=byId("ev2-model").value!=="other";
    updateEV2();
  });
  let solarSolution="genera";

  const solarDefaults={
    genera:{
      reduction:55,
      label:"CON KIT GENERA",
      kit:"KIT GENERA",
      kitCopy:"Genera durante el día y valoriza excedentes mediante Netbilling para compensar parte de la energía que usarás al cargar el vehículo de noche.",
      resultCopy:"Generación solar on-grid + Netbilling para compensar financieramente parte de la carga residencial.",
      flow:'<span>☀️ Genera de día</span><b>→</b><span>🌐 Netbilling</span><b>→</b><span>💰 Compensa energía</span><b>→</b><span>🚗 Carga nocturna</span>',
      flowCopy:"Durante el día los excedentes pueden inyectarse a la red y valorizarse mediante Netbilling. Esa compensación ayuda a reducir el costo de la energía comprada después para cargar el vehículo de noche.",
      assumption:"GENERA parte con un escenario referencial de 55% porque una parte de la energía se autoconsume y otra puede valorizarse mediante Netbilling.",
      benefit3Label:"⚡ Netbilling",
      benefit3:"Excedentes valorizados",
      detailHtml:`<p><strong>KIT GENERA</strong></p><ul>
          <li>Los paneles generan energía durante el día.</li>
          <li>Durante el día los excedentes pueden inyectarse a la red mediante Netbilling.</li>
          <li>La valorización de excedentes compensa parte de la energía que luego se compra para cargar el vehículo.</li>
          <li>Puede integrarse a un cargador existente o incorporar carga residencial al proyecto.</li>
          <li>La versión base no incorpora batería.</li>
        </ul>`,
      gross:7290000*1.19
    },
    almacena:{
      reduction:75,
      label:"CON KIT ALMACENA",
      kit:"KIT ALMACENA",
      kitCopy:"Genera durante el día, almacena energía en batería y utilízala después para apoyar la carga nocturna de tu vehículo.",
      resultCopy:"Solar + inversor híbrido + batería para disponer de energía almacenada al cargar el vehículo fuera del horario solar.",
      flow:'<span>☀️ Paneles</span><b>→</b><span>⚡ Inversor híbrido</span><b>→</b><span>🔋 Batería</span><b>→</b><span>🚗 Carga EV</span>',
      flowCopy:"La energía solar se almacena durante el día y queda disponible para apoyar la carga residencial del vehículo fuera del horario solar.",
      assumption:"ALMACENA parte con un escenario referencial de 75% porque el almacenamiento permite aprovechar una mayor parte de la energía producida fuera del horario solar.",
      benefit3Label:"🔋 Mayor autoconsumo",
      benefit3:"Menor compra nocturna",
      detailHtml:`<p><strong>KIT ALMACENA</strong></p><ul>
          <li>Los paneles generan energía durante el día.</li>
          <li>El inversor híbrido gestiona la carga de la batería.</li>
          <li>La energía almacenada queda disponible para apoyar la carga nocturna del vehículo.</li>
          <li>Puede trabajar con un cargador existente o incorporar uno al proyecto.</li>
          <li>El respaldo adicional depende del diseño de la instalación.</li>
        </ul>`,
      gross:9890000*1.19
    },
    casa:{
      reduction:82,
      label:"CON CASA FÓRTISI",
      kit:"CASA FÓRTISI",
      kitCopy:"Integra generación solar, batería de mayor capacidad, carga del vehículo y consumos del hogar, sumando FÓRTISI CUIDA.",
      resultCopy:"Ecosistema integrado para vivienda + movilidad, con almacenamiento robusto y acompañamiento posventa.",
      flow:'<span>☀️ Solar</span><b>+</b><span>🔋 Batería</span><b>+</b><span>🏡 Hogar</span><b>+</b><span>🚗 Carga EV</span>',
      flowCopy:"CASA FÓRTISI gestiona generación, almacenamiento, consumos del hogar y carga del vehículo para maximizar el autoconsumo y reducir al mínimo posible la compra de energía a la red.",
      assumption:"CASA FÓRTISI parte con un escenario referencial de 82% al integrar generación, almacenamiento y movilidad. El resultado real depende especialmente del perfil de consumo y de carga del vehículo.",
      benefit3Label:"🏡 Integración energética",
      benefit3:"Casa + batería + vehículo",
      detailHtml:`<p><strong>CASA FÓRTISI</strong></p><ul>
          <li>Paneles e inversor híbrido gestionan energía para vivienda y movilidad.</li>
          <li>Una batería de mayor capacidad almacena energía para uso posterior.</li>
          <li>La energía puede destinarse a consumos priorizados del hogar y a la carga del vehículo.</li>
          <li>FÓRTISI CUIDA agrega mantención anual sin costo durante el primer año, asistencia y soporte remoto cuando sea técnicamente posible.</li>
          <li>Al final de la vida útil coordinamos la gestión directa de equipos con gestores autorizados.</li>
        </ul>`,
      gross:12490000*1.19
    }
  };

  function getSolarBill(){
    const custom=Number(byId("solar2-custom-bill")?.value||0);
    if(custom>0) return custom;
    return Number(byId("solar2-bill")?.value||80000);
  }

  function setSolarSolution(key, resetReduction=true){
    solarSolution=key;
    const cfg=solarDefaults[key];
    document.querySelectorAll("[data-solar-solution]").forEach(b=>b.classList.toggle("is-active",b.dataset.solarSolution===key));
    if(resetReduction && byId("solar2-reduction")) byId("solar2-reduction").value=cfg.reduction;
    txt("[data-solar2-result-label]",cfg.label);
    txt("[data-solar2-result-copy]",cfg.resultCopy);
    txt("[data-solar2-kit]",cfg.kit);
    txt("[data-solar2-kit-copy]",cfg.kitCopy);
    txt("[data-solar-flow-copy]",cfg.flowCopy);
    txt("[data-solar-assumption-note]",cfg.assumption);
    txt("[data-solar2-benefit3-label]",cfg.benefit3Label);
    txt("[data-solar2-benefit3]",cfg.benefit3);
    const flow=document.querySelector("[data-solar-flow-steps]");
    if(flow) flow.innerHTML=cfg.flow;
    const detail=document.querySelector("[data-solar-detail-content]");
    if(detail) detail.innerHTML=cfg.detailHtml;
    updateSolar2();
  }

  document.querySelectorAll("[data-solar-solution]").forEach(btn=>{
    btn.addEventListener("click",()=>setSolarSolution(btn.dataset.solarSolution,true));
  });

  function humanMonths(months){
    if(!isFinite(months)||months<=0) return "—";
    months=Math.round(months);
    if(months<12) return `${months} meses`;
    const y=Math.floor(months/12), m=months%12;
    return m ? `${y} ${y===1?"año":"años"} y ${m} ${m===1?"mes":"meses"}` : `${y} ${y===1?"año":"años"}`;
  }

  function updateSolar2(){
    const bill=getSolarBill();
    const pct=Number(byId("solar2-reduction")?.value||solarDefaults[solarSolution].reduction)/100;
    const cfg=solarDefaults[solarSolution];
    const save=bill*pct;
    const newBill=Math.max(0,bill-save);
    const months=save>0 ? cfg.gross/save : 0;

    if(byId("solar2-bill-out")) byId("solar2-bill-out").textContent=money(Number(byId("solar2-bill")?.value||80000));
    if(byId("solar2-reduction-out")) byId("solar2-reduction-out").textContent=`${Math.round(pct*100)}%`;

    txt("[data-solar2-current]",`${money(bill)}/mes`);
    txt("[data-solar2-new]",`${money(newBill)}/mes`);
    txt("[data-solar2-month]",money(save));
    txt("[data-solar2-year]",money(save*12));
    txt("[data-solar2-save-percent]",`${Math.round(pct*100)}%`);
    txt("[data-solar2-payback]",humanMonths(months));

    let potential="Moderado", potentialCopy="El ahorro depende del dimensionamiento y del perfil de consumo del hogar.";
    if(bill>=180000 && bill<350000){
      potential="Alto";
      potentialCopy="Por tu nivel de gasto eléctrico, una evaluación personalizada puede representar un ahorro importante.";
    }else if(bill>=350000){
      potential="Muy alto";
      potentialCopy="Tu nivel de gasto eléctrico justifica una evaluación técnica detallada para dimensionar correctamente el sistema.";
    }else if(bill<70000){
      potential="Bajo a moderado";
      potentialCopy="Conviene dimensionar con cuidado para evitar una inversión mayor a la necesaria.";
    }
    txt("[data-solar2-potential]",potential);
    txt("[data-solar2-potential-copy]",potentialCopy);
  }

  ["solar2-bill","solar2-custom-bill","solar2-reduction"].forEach(id=>{
    on(byId(id),"input",updateSolar2);
    on(byId(id),"change",updateSolar2);
  });


  updateComb();
  updateEV2();
  setSolarSolution("genera",true);
})();



// ===== BENEFIT DETAIL TOGGLES =====
(() => {
  const togglePanel = (btn, panel) => {
    if(!btn || !panel) return;
    const open = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!open));
    panel.hidden = open;
    const mark = btn.querySelector("span");
    if(mark) mark.textContent = open ? "＋" : "−";
    if(btn.matches("[data-benefit-toggle]")) {
      btn.textContent = open ? "Ver detalle" : "Ocultar detalle";
    }
  };

  document.querySelectorAll("[data-benefit-toggle]").forEach(btn => {
    const panel = btn.nextElementSibling;
    btn.addEventListener("click", () => togglePanel(btn, panel));
  });

  document.querySelectorAll("[data-kit-detail-toggle]").forEach(btn => {
    const panel = btn.nextElementSibling;
    btn.addEventListener("click", () => togglePanel(btn, panel));
  });

  const solarBtn = document.querySelector("[data-solar-detail-toggle]");
  const solarPanel = document.querySelector("[data-solar-detail-panel]");
  if(solarBtn && solarPanel){
    solarBtn.addEventListener("click", () => togglePanel(solarBtn, solarPanel));
  }
})();

// Casa FÓRTISI · V5.2 premium · evolución acumulativa y rutas energéticas reales
(() => {
  const experience = document.querySelector('[data-casa-fortisi]');
  if (!experience) return;

  const tabs = [...experience.querySelectorAll('[data-casa-stage]')];
  const progress = [...experience.querySelectorAll('.casa-progress span')];
  const kicker = experience.querySelector('[data-casa-kicker]');
  const title = experience.querySelector('[data-casa-title]');
  const copy = experience.querySelector('[data-casa-copy]');
  const route = experience.querySelector('[data-casa-route]');
  const rep = experience.querySelector('[data-casa-rep]');


  const stages = {
    1: {
      badge:'INICIA', kicker:'INICIA · SEGURIDAD',
      title:'Todo parte con una base segura.',
      copy:'El tablero es el punto 1: preparamos la instalación eléctrica e instalamos el cargador que ya compraste, dejando una base segura para evolucionar a las siguientes etapas.',
      route:'1 · Tablero + cargador EV'
    },
    2: {
      badge:'CONECTA', kicker:'CONECTA · COMODIDAD',
      title:'Tu auto siempre listo.',
      copy:'El tablero alimenta el cargador residencial y el vehículo recibe energía mientras permanece estacionado en casa.',
      route:'1 + 2 · Tablero → cargador → auto'
    },
    3: {
      badge:'GENERA', kicker:'GENERA · AHORRO',
      title:'Ahora produces parte de tu propia energía.',
      copy:'Durante el día los paneles generan energía y los excedentes pueden valorizarse mediante Netbilling. Esa compensación ayuda a reducir el costo de la energía que luego compras para cargar tu vehículo de noche. Puede trabajar con tu cargador actual o incorporar uno al proyecto.',
      route:'3 · Día: solar → Netbilling · Noche: red → cargador → auto' 
    },
    4: {
      badge:'ALMACENA', kicker:'ALMACENA · CONTROL',
      title:'Tu energía sigue trabajando cuando el sol ya no está.',
      copy:'Aquí la energía sí se almacena: paneles, inversor híbrido y batería guardan energía durante el día para utilizarla después, especialmente al cargar el vehículo de noche. Puede integrarse al cargador que ya tengas o incorporar uno.',
      route:'4 · Solar → inversor híbrido → batería → cargador → auto' 
    },
    5: {
      badge:'CASA FÓRTISI', kicker:'CASA FÓRTISI · TRANQUILIDAD',
      title:'Todo el ecosistema trabaja como uno solo.',
      copy:'CASA FÓRTISI amplía la energía hacia toda la vivienda: solar, batería de mayor capacidad, carga EV y consumos del hogar trabajan bajo una misma gestión. El punto 5 conecta con nuestros técnicos y representa FÓRTISI CUIDA: garantía extendida, mantención anual sin costo durante 2 años, monitoreo en línea y gestión directa de equipos al final de su vida útil.',
      route:'5 · Vivienda + movilidad + FÓRTISI CUIDA'
    }
  };

  function setStage(stage, focus = true){
    const n = Math.max(1, Math.min(5, Number(stage) || 1));
    experience.dataset.stage = String(n);
    tabs.forEach(btn => {
      const tabStage = Number(btn.dataset.casaStage);
      const active = tabStage === n;
      const complete = tabStage < n;
      btn.classList.toggle('is-active', active);
      btn.classList.toggle('is-complete', complete);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      btn.setAttribute('aria-label', `${tabStage}. ${btn.querySelector('strong')?.textContent || 'Etapa'}${complete ? ', incorporada' : active ? ', seleccionada' : ''}`);
      btn.tabIndex = active ? 0 : -1;
    });
    progress.forEach((bar, i) => bar.classList.toggle('is-on', i < n));
    const data = stages[n];
    if (kicker) kicker.textContent = data.kicker;
    if (title) title.textContent = data.title;
    if (copy) copy.textContent = data.copy;
    if (route) route.textContent = data.route;
    if (rep) rep.hidden = n !== 5;


    if (focus && window.matchMedia('(prefers-reduced-motion: reduce)').matches === false) {
      experience.classList.remove('is-stage-changing');
      requestAnimationFrame(() => experience.classList.add('is-stage-changing'));
    }
  }

  tabs.forEach((btn, index) => {
    btn.addEventListener('click', () => setStage(btn.dataset.casaStage));
    btn.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      tabs[next].focus();
      setStage(tabs[next].dataset.casaStage, false);
    });
  });

  setStage(1, false);
})();


// FÓRTISI V6.9 · CTA único de WhatsApp al final
(() => {
  const link = document.querySelector('[data-whatsapp-link]');
  if (!link) return;
  const cfg = window.FORTISI_CONFIG || {};
  const number = String(cfg.whatsappNumber || '').replace(/\D/g, '');
  const message = cfg.whatsappMessage || 'Hola, conocí FÓRTISI a través de su web y me gustaría recibir orientación sobre una solución para mi hogar.';
  // En modo prototipo, si aún no existe un número comercial definitivo,
  // abrimos WhatsApp con el mensaje precargado para demostrar la experiencia.
  if (!number) {
    link.href = `https://wa.me/?text=${encodeURIComponent(message)}`;
    link.setAttribute('aria-label','Abrir WhatsApp con un mensaje para FÓRTISI');
    return;
  }
  link.href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
})();
