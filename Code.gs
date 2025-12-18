/**************************************
 * Dashboard Hormigón – WebApp (Apps Script)
 * - Lee listas desde hoja: DATOS
 * - Guarda registros en hoja: HORMIGONES (o REGISTRO si tú lo prefieres)
 *
 * IMPORTANTE:
 * 1) Debes usar un GOOGLE SHEET (no Excel local).
 * 2) Pega tu ID real de Google Sheet en SPREADSHEET_ID.
 **************************************/

const SPREADSHEET_ID = "PEGA_AQUI_TU_SPREADSHEET_ID";

/** Hojas */
const SHEET_DATOS    = "DATOS";
const SHEET_REGISTRO = "HORMIGONES";   // Cambia a "REGISTRO" si tu historial se llama así

/** Zona Minas/Posturas en DATOS:
 *  - Encabezados (nombres de mina) en fila 1
 *  - Posturas debajo (desde fila 2)
 *  - Columnas de minas desde MINAS_COL_START a MINAS_COL_END
 *  Ajusta si tu plantilla cambia.
 */
const MINAS_COL_START = 10; // Col J
const MINAS_COL_END   = 27; // Col AA

/** Columnas de listas simples en DATOS (desde fila 2):
 * Ajusta SOLO si tu hoja cambia.
 */
const COL_GRADO       = 1;  // A
const COL_SUMINISTRO  = 3;  // C
const COL_TURNO       = 5;  // E
const COL_GRUPO       = 7;  // G
const COL_SALACTRL    = 8;  // H (Sala de Control)

/** CNC (por filas) en DATOS (desde fila 2):
 * Ajusta SOLO si tu hoja cambia.
 */
const COL_CNC_N2      = 29; // AC
const COL_CNC_N1      = 30; // AD
const COL_RESP_CNC    = 31; // AE

/**************************************
 * HELPERS
 **************************************/
function _ss_() { return SpreadsheetApp.openById(SPREADSHEET_ID); }

function _sheet_(name) {
  const sh = _ss_().getSheetByName(name);
  if (!sh) throw new Error("No se encontró la hoja: " + name);
  return sh;
}

function _unique_(arr) { return [...new Set(arr.filter(v => v !== "" && v != null))]; }

function _colValues_(sh, col, startRow) {
  const last = sh.getLastRow();
  if (last < startRow) return [];
  const rng = sh.getRange(startRow, col, last - startRow + 1, 1).getValues();
  return rng.map(r => r[0]).filter(v => v !== "" && v != null);
}

function _asJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**************************************
 * GET
 **************************************/
function doGet(e) {
  const action = (e.parameter.action || "").toLowerCase();
  if (action === "datos") return getDatos();
  if (action === "historial") return getHistorial();
  if (action === "ping") return _asJson_({ok:true, ts: new Date().toISOString()});
  return _asJson_({ error: "Acción no válida. Usa ?action=datos | ?action=historial | ?action=ping" });
}

/** Devuelve:
 *  listas: grados, suministros, turnos, grupos, salaControl, minas
 *  cncRows: [{RESPONSABLE_CNC, CNC_NIVEL_1, CNC_NIVEL_2}, ...]
 *  posturasPorMina: { "TENIENTE": ["C-49 IZ", ...], ... }
 */
function getDatos() {
  const sh = _sheet_(SHEET_DATOS);

  // Listas simples
  const grados      = _unique_(_colValues_(sh, COL_GRADO, 2));
  const suministros = _unique_(_colValues_(sh, COL_SUMINISTRO, 2));
  const turnos      = _unique_(_colValues_(sh, COL_TURNO, 2));
  const grupos      = _unique_(_colValues_(sh, COL_GRUPO, 2));
  const salaControl = _unique_(_colValues_(sh, COL_SALACTRL, 2));

  // CNC por filas
  const respList = _colValues_(sh, COL_RESP_CNC, 2);
  const cnc1List = _colValues_(sh, COL_CNC_N1, 2);
  const cnc2List = _colValues_(sh, COL_CNC_N2, 2);

  const cncRows = [];
  const maxLen = Math.max(respList.length, cnc1List.length, cnc2List.length);
  for (let i = 0; i < maxLen; i++) {
    const resp = respList[i] || "";
    const c1   = cnc1List[i] || "";
    const c2   = cnc2List[i] || "";
    if (resp || c1 || c2) cncRows.push({ RESPONSABLE_CNC: resp, CNC_NIVEL_1: c1, CNC_NIVEL_2: c2 });
  }

  // Minas/Posturas por columnas (encabezados en fila 1)
  const headerRow = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const minas = [];
  const posturasPorMina = {};

  for (let c = MINAS_COL_START; c <= MINAS_COL_END; c++) {
    const minaName = headerRow[c - 1];
    if (!minaName) continue;
    minas.push(minaName);
    posturasPorMina[minaName] = _unique_(_colValues_(sh, c, 2));
  }

  return _asJson_({
    listas: { grados, suministros, turnos, grupos, salaControl, minas },
    cncRows,
    posturasPorMina
  });
}

/** Últimos 100 registros */
function getHistorial() {
  const sh = _sheet_(SHEET_REGISTRO);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return _asJson_({ registros: [] });

  const headers = values[0];
  const body = values.slice(1);
  const ultimos = body.slice(-100);

  const registros = ultimos.map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[String(h).trim()] = row[i]);
    return obj;
  });

  return _asJson_({ registros });
}

/**************************************
 * POST (guardar)
 **************************************/
function doPost(e) {
  const sh = _sheet_(SHEET_REGISTRO);

  const body = (e.postData && e.postData.contents) ? e.postData.contents : "{}";
  const data = JSON.parse(body);

  // Campos esperados del front:
  // usuario, grado, suministro, turno, grupo, mina, postura, resp, cnc1, cnc2, salaControl, observacion, userAgent
  const ahora = new Date();

  // Si tu hoja HORMIGONES tiene un encabezado distinto, usa appendRow igual,
  // pero mantén el mismo orden que tu encabezado.
  sh.appendRow([
    ahora,
    data.usuario      || "",
    data.grado        || "",
    data.suministro   || "",
    data.turno        || "",
    data.grupo        || "",
    data.mina         || "",
    data.postura      || "",
    data.resp         || "",
    data.cnc1         || "",
    data.cnc2         || "",
    data.salaControl  || "",
    data.observacion  || "",
    data.userAgent    || ""
  ]);

  return _asJson_({ status: "OK" });
}

/**************************************
 * (Opcional) Setup rápido de encabezados
 **************************************/
function setupHojaRegistro() {
  const ss = _ss_();
  let sh = ss.getSheetByName(SHEET_REGISTRO);
  if (!sh) sh = ss.insertSheet(SHEET_REGISTRO);

  const headers = [
    "Fecha", "Usuario", "Grado", "Suministro", "Turno", "Grupo",
    "Mina", "Postura", "ResponsableCNC", "CNCNivel1", "CNCNivel2",
    "SalaControl", "Observacion", "UserAgent"
  ];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  sh.setFrozenRows(1);
}
