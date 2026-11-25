/**
 * Ranking do jogo "Bioética em casos".
 * Cole este código em Extensões > Apps Script de uma planilha Google
 * e implante como App da Web (veja README.md).
 *
 * Aba "Ranking": uma linha por jogador, atualizada a cada caso respondido.
 * Aba "Respostas": uma linha por caso respondido, com o que o aluno marcou
 * em cada princípio (✔ certo, ✘ errado).
 */
const ABA = "Ranking";
const COLUNAS = ["id", "Nome", "Turma", "Pontos", "Casos feitos", "Tempo (s)", "Atualizado em"];

const ABA_RESP = "Respostas";
const COLUNAS_RESP = ["Data", "Nome", "Turma", "Caso", "Título", "Autonomia", "Beneficência", "Não maleficência", "Justiça", "Acertos"];

function aba_(nome, colunas) {
  nome = nome || ABA; colunas = colunas || COLUNAS;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(nome) || ss.insertSheet(nome);
  if (sh.getLastRow() === 0) { sh.appendRow(colunas); sh.setFrozenRows(1); }
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

    const r = d.resposta;
    if (r && typeof r === "object") {
      aba_(ABA_RESP, COLUNAS_RESP).appendRow([
        new Date(), linha[1], linha[2], numero_(r.caso, 100), texto_(r.titulo, 80),
        texto_(r.autonomia, 60), texto_(r.beneficencia, 60), texto_(r.naoMaleficencia, 60), texto_(r.justica, 60),
        numero_(r.acertos, 4)
      ]);
    }
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
