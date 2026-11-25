/**
 * Ranking do jogo "Bioética em casos".
 * Cole este código em Extensões > Apps Script de uma planilha Google
 * e implante como App da Web (veja README.md).
 *
 * Cada jogador é uma linha da aba "Ranking", atualizada a cada caso respondido.
 */
const ABA = "Ranking";
const COLUNAS = ["id", "Nome", "Turma", "Pontos", "Casos feitos", "Tempo (s)", "Atualizado em"];

function aba_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(ABA) || ss.insertSheet(ABA);
  if (sh.getLastRow() === 0) sh.appendRow(COLUNAS);
  return sh;
}

// Evita que um nome como "=SOMA(...)" vire fórmula na planilha.
function texto_(v, max) {
  let s = String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function numero_(v, max) {
  const n = Math.floor(Number(v));
  if (!isFinite(n) || n < 0) return 0;
  return Math.min(n, max);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, erro: "json" }); }
  const id = texto_(d.id, 40);
  const nome = texto_(d.nome, 40);
  if (!/^[a-z0-9]{8,40}$/.test(id) || !nome) return json_({ ok: false, erro: "dados" });

  const linha = [
    id, nome, texto_(d.turma, 30),
    numero_(d.pontos, 400), numero_(d.feitos, 100), numero_(d.segundos, 86400),
    new Date()
  ];

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = aba_();
    const n = sh.getLastRow();
    const ids = n > 1 ? sh.getRange(2, 1, n - 1, 1).getValues() : [];
    const i = ids.findIndex(r => r[0] === id);
    if (i >= 0) sh.getRange(i + 2, 1, 1, linha.length).setValues([linha]);
    else sh.appendRow(linha);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

function doGet(e) {
  const turma = String((e.parameter && e.parameter.turma) || "").trim().toLowerCase();
  const sh = aba_();
  const n = sh.getLastRow();
  const linhas = n > 1 ? sh.getRange(2, 1, n - 1, 6).getValues() : [];
  const jogadores = linhas
    .map(r => ({ id: String(r[0]), nome: String(r[1]).replace(/^'/, ""), turma: String(r[2]).replace(/^'/, ""),
                 pontos: Number(r[3]) || 0, feitos: Number(r[4]) || 0, segundos: Number(r[5]) || 0 }))
    .filter(j => j.id && (!turma || j.turma.toLowerCase() === turma))
    .sort((a, b) => b.pontos - a.pontos || a.segundos - b.segundos)
    .slice(0, 100);
  return json_({ jogadores: jogadores });
}
