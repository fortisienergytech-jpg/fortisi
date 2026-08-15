/**
 * FÓRTISI · Dashboard conectado al Google Forms oficial
 *
 * 1) Abre la Google Sheet vinculada al formulario FÓRTISI.
 * 2) Extensiones > Apps Script.
 * 3) Reemplaza Code.gs por este archivo.
 * 4) Ejecuta configurarFortisi() una vez y autoriza.
 * 5) Implementar > Nueva implementación > Aplicación web.
 *    Ejecutar como: tú. Acceso: cualquier persona.
 * 6) Copia la URL /exec en surveyEndpoint de assets/js/config.js.
 */

function configurarFortisi() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Abre este Apps Script desde la hoja vinculada al Google Forms de FÓRTISI.');
  PropertiesService.getScriptProperties().setProperty('FORTISI_SPREADSHEET_ID', ss.getId());
  const sh = findResponseSheet_(ss);
  return 'FÓRTISI listo. Hoja detectada: ' + sh.getName();
}

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || 'health');
    if (action === 'list') return jsonOrJsonp_({ok:true, rows:readRows_()}, e);
    return jsonOrJsonp_({ok:true, service:'FORTISI Forms dashboard', status:'ready'}, e);
  } catch (err) {
    return jsonOrJsonp_({ok:false, error:String(err && err.message || err)}, e);
  }
}

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('FORTISI_SPREADSHEET_ID');
  if (!id) throw new Error('Primero ejecuta configurarFortisi() una vez.');
  return SpreadsheetApp.openById(id);
}

function findResponseSheet_(ss) {
  for (const sh of ss.getSheets()) {
    if (sh.getLastRow() < 1 || sh.getLastColumn() < 2) continue;
    const headers = sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(normalize_);
    const hasTimestamp = headers.some(h => h === 'marca temporal' || h === 'timestamp');
    const hasClarity = headers.some(h => h.includes('que tan claro te quedo que hace fortisi'));
    if (hasTimestamp && hasClarity) return sh;
  }
  throw new Error('No encontré la hoja de respuestas del Google Forms oficial.');
}

function readRows_() {
  const sh = findResponseSheet_(getSpreadsheet_());
  if (sh.getLastRow() < 2) return [];
  const values = sh.getRange(1,1,sh.getLastRow(),sh.getLastColumn()).getValues();
  const headers = values.shift().map(v => normalize_(v));
  return values.filter(row => row.some(v => String(v).trim() !== '')).map(row => {
    const answer = needle => {
      const i = headers.findIndex(h => h.includes(needle));
      return i >= 0 ? row[i] : '';
    };
    const timestamp = row[headers.findIndex(h => h === 'marca temporal' || h === 'timestamp')];
    return {
      timestamp: timestamp instanceof Date ? timestamp.toISOString() : String(timestamp || ''),
      clarity: code_(answer('que tan claro te quedo que hace fortisi'), {
        'muy claro':'muy_claro','bastante claro':'claro','poco claro':'poco_claro','nada claro':'no_entendi'
      }),
      servicesRemembered: services_(answer('que servicios recuerdas que ofrece fortisi')),
      savingsModule: code_(answer('que tan util te parecio el modulo para calcular'), {
        'muy util':'muy_util','util':'util','poco util':'poco_util','no lo utilice':'no_lo_use'
      }),
      savingsClarity: code_(answer('resultados del simulador de ahorro te parecieron faciles'), {
        'muy faciles':'muy_faciles','faciles':'faciles','algo confusos':'algo_confusos','muy confusos':'muy_confusos','no lo utilice':'no_lo_use'
      }),
      kitAdvisor: code_(answer('que tan util te parecio que la pagina te orientara'), {
        'muy util':'muy_util','util':'util','poco util':'poco_util','no me ayudo a decidir':'no_me_ayudo','no lo utilice':'no_lo_use'
      }),
      solutionFit: code_(answer('sientes que podrias identificar cual solucion'), {
        'si claramente':'si_claramente','mas o menos':'mas_o_menos','necesitaria asesoria antes de decidir':'necesito_asesoria','no':'no'
      }),
      contactIntent: code_(answer('que tan probable seria que solicitaras un diagnostico'), {
        'muy probable':'muy_probable','probable':'probable','poco probable':'poco_probable','nada probable':'nada_probable'
      }),
      vehicleStatus: code_(answer('cual de estas opciones describe mejor tu situacion actual'), {
        'tengo un auto electrico':'tengo_ev','pienso comprar uno en el futuro':'pienso_comprar',
        'tengo auto a combustion y me interesa evaluar el cambio':'tengo_combustion_interes',
        'no tengo auto electrico pero me interesa la energia solar':'sin_auto_interes',
        'no tengo y por ahora no me interesa':'sin_interes'
      }),
      helpfulElement: code_(answer('que fue lo que mas te ayudo a entender la propuesta'), {
        'el simulador de ahorro':'simulador','los kit y la evolucion de las soluciones':'kits',
        'la casa fortisi':'casa','aun me quedaron dudas':'dudas'
      }),
      improvement: String(answer('que mejorarias en esta pagina') || '')
    };
  });
}

function services_(value) {
  const v = normalize_(value);
  if (v === 'todas las anteriores') return ['cargadores','solar','baterias','mantencion','residuos'];
  const map = {
    'instalacion de cargadores residenciales':'cargadores',
    'energia solar residencial':'solar',
    'baterias de almacenamiento':'baterias',
    'mantencion y acompanamiento':'mantencion',
    'gestion responsable de residuos electricos':'residuos',
    'no lo recuerdo':'no_recuerdo'
  };
  return map[v] ? [map[v]] : [];
}

function code_(value, map) {
  const v = normalize_(value);
  return map[v] || String(value || '');
}

function normalize_(value) {
  return String(value == null ? '' : value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[¿?¡!.,:;()]/g,' ')
    .replace(/\s+/g,' ').trim().toLowerCase();
}

function jsonOrJsonp_(obj, e) {
  const prefix = String((e && e.parameter && e.parameter.prefix) || '');
  if (prefix && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(prefix)) {
    return ContentService.createTextOutput(prefix + '(' + JSON.stringify(obj) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
