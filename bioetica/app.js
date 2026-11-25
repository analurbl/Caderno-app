/* Bioética em casos — lógica do site. Os casos ficam em casos.js e o ranking em config.js. */
const app = document.getElementById("app");
const TOTAL = CASOS.length * PRINCIPIOS.length;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rotulo = v => (OPCOES.find(o => o.v === v) || {}).t;
let refreshTimer = null;

/* ---------- armazenamento local (só neste aparelho) ---------- */
function lerLocal(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
function gravarLocal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function apagarLocal(k) { try { localStorage.removeItem(k); } catch (e) {} }

/* ---------- endereços ---------- */
function baseUrl() { return lerLocal("bioetica-base") || location.href.split("#")[0]; }
function parametros() {
  const q = location.hash.split("?")[1] || "";
  return Object.fromEntries(new URLSearchParams(q));
}
function linkJogo(turma) { return `${baseUrl()}#/jogo${turma ? "?turma=" + encodeURIComponent(turma) : ""}`; }

/* ---------- ranking (Google Apps Script) ---------- */
async function enviarPontuacao(jogo, caso) {
  if (!RANKING_URL) return "sem-ranking";
  try {
    const r = await fetch(RANKING_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        id: jogo.id, nome: jogo.nome, turma: jogo.turma, pontos: jogo.pontos,
        feitos: Object.keys(jogo.respostas).length,
        segundos: Math.round(((jogo.fim || Date.now()) - jogo.inicio) / 1000),
        resposta: caso ? respostaParaPlanilha(caso, jogo.respostas[caso]) : null
      })
    });
    const d = await r.json();
    return d.ok ? "ok" : "erro";
  } catch (e) { return "erro"; }
}

/* Uma linha da aba "Respostas": o que o aluno marcou em cada princípio, com ✔ ou ✘. */
function respostaParaPlanilha(n, resp) {
  const c = CASOS[n - 1];
  const linha = { caso: n, titulo: c.titulo, acertos: 0 };
  for (const p of PRINCIPIOS) {
    const ok = resp[p.id] === c.gabarito[p.id][0];
    if (ok) linha.acertos++;
    linha[p.id] = `${rotulo(resp[p.id])} ${ok ? "✔" : "✘ (certo: " + rotulo(c.gabarito[p.id][0]) + ")"}`;
  }
  return linha;
}

async function buscarRanking(turma) {
  const url = RANKING_URL + (turma ? "?turma=" + encodeURIComponent(turma) : "");
  const r = await fetch(url);
  const d = await r.json();
  return d.jogadores || [];
}

function tempo(s) { const m = Math.floor(s / 60); return `${m}min ${String(s % 60).padStart(2, "0")}s`; }

function tabelaRanking(lista, meuId) {
  if (!lista.length) return `<p class="muted">Ninguém pontuou ainda. Os nomes aparecem aqui assim que alguém responde o primeiro caso.</p>`;
  return `<ol class="rank">${lista.map((j, i) => `
    <li class="${j.id === meuId ? "me" : ""}">
      <span class="pos">${i + 1}º</span>
      <span class="who"><b>${esc(j.nome)}</b>${j.id === meuId ? " <em>(você)</em>" : ""}
        <small>${j.turma ? esc(j.turma) + " · " : ""}${j.feitos} de ${CASOS.length} casos · ${tempo(j.segundos)}</small></span>
      <span class="pts">${j.pontos}<small>pts</small></span>
    </li>`).join("")}</ol>`;
}

async function preencherRanking(el, turma, meuId) {
  if (!RANKING_URL) { el.innerHTML = `<p class="muted">O ranking ainda não foi ligado. Veja o passo a passo no README.</p>`; return; }
  try { el.innerHTML = tabelaRanking(await buscarRanking(turma), meuId); }
  catch (e) { el.innerHTML = `<p class="err">Não foi possível carregar o ranking. Confira a internet e tente de novo.</p>`; }
}

/* ---------- rotas ---------- */
function render() {
  clearInterval(refreshTimer);
  const h = location.hash.split("?")[0];
  const m = h.match(/^#\/caso\/(\d+)/);
  if (m && CASOS[+m[1] - 1]) return renderTreino(+m[1]);
  if (h === "#/jogo") return renderJogo();
  if (h === "#/ranking") return renderRanking();
  if (h === "#/qrcodes") return renderQR();
  renderInicio();
}

function principiosHtml() {
  return `<div class="principles">${PRINCIPIOS.map(p => `<div><b>${p.nome}</b>${p.def}</div>`).join("")}</div>`;
}

function renderInicio() {
  document.title = "Bioética em Casos";
  app.innerHTML = `
    <span class="tag">Bioética</span>
    <h1>Bioética em casos</h1>
    <p class="muted">Analise cada situação e diga se cada princípio foi respeitado, ferido ou não é o foco.</p>
    <section class="card hero">
      <h2>Jogo completo</h2>
      <p>${CASOS.length} casos em sequência, ${TOTAL} pontos possíveis, com ranking da turma.</p>
      <div class="actions"><a class="btn" href="#/jogo">Começar o jogo</a><a class="btn secondary" href="#/ranking">Ver ranking</a></div>
    </section>
    <section class="card"><h2>Os quatro princípios</h2>${principiosHtml()}</section>
    <section class="card"><h2>Treinar um caso</h2>
      <p class="muted small">Casos avulsos não contam para o ranking.</p>
      <ul class="case-list">${CASOS.map((c, i) => `
        <li><a href="#/caso/${i + 1}"><b>Caso ${i + 1}: ${esc(c.titulo)}</b><small>${esc(c.tema)}</small></a></li>`).join("")}
      </ul>
    </section>
    <p><a href="#/qrcodes">Professor: QR codes para imprimir ou projetar</a></p>`;
}

/* Monta o formulário de um caso e chama onCorrigir(respostas, acertos) após a correção. */
function htmlCaso(n, cabecalho) {
  const c = CASOS[n - 1];
  return `
    ${cabecalho}
    <span class="tag">${esc(c.tema)}</span>
    <h1>${esc(c.titulo)}</h1>
    <section class="card story">${c.texto.map(p => `<p>${esc(p)}</p>`).join("")}</section>
    <form class="card" id="form" novalidate>
      <h2>Como ficou cada princípio?</h2>
      ${PRINCIPIOS.map(p => `
        <fieldset data-p="${p.id}">
          <legend>${p.nome}</legend>
          <div class="seg">${OPCOES.map(o => `
            <label><input type="radio" name="${p.id}" value="${o.v}"><span>${o.t}</span></label>`).join("")}
          </div>
          <div class="fb-slot"></div>
        </fieldset>`).join("")}
      <p class="err" id="err" hidden>Responda os quatro princípios antes de ver a correção.</p>
      <div class="actions"><button type="submit">Ver correção</button></div>
    </form>
    <div id="result"></div>`;
}

function ligarFormulario(n, onCorrigir) {
  const c = CASOS[n - 1];
  const form = document.getElementById("form");
  form.addEventListener("submit", e => {
    e.preventDefault();
    const resp = {};
    for (const p of PRINCIPIOS) {
      const sel = form.querySelector(`input[name="${p.id}"]:checked`);
      if (!sel) {
        document.getElementById("err").hidden = false;
        form.querySelector(`[data-p="${p.id}"]`).scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      resp[p.id] = sel.value;
    }
    document.getElementById("err").hidden = true;
    let acertos = 0;
    for (const p of PRINCIPIOS) {
      const [certo, explica] = c.gabarito[p.id];
      const ok = resp[p.id] === certo;
      if (ok) acertos++;
      form.querySelector(`[data-p="${p.id}"] .fb-slot`).innerHTML = `
        <div class="fb ${ok ? "ok" : "bad"}">
          <strong class="${ok ? "ok" : "bad"}">${ok ? "Correto" : "Revise"}: ${rotulo(certo)}.</strong>
          ${ok ? "" : `Você marcou "${rotulo(resp[p.id])}". `}${esc(explica)}
        </div>`;
    }
    form.querySelectorAll("input").forEach(el => el.disabled = true);
    form.querySelector(".actions").remove();
    onCorrigir(resp, acertos);
    document.getElementById("result").scrollIntoView({ behavior: "smooth" });
  });
}

const AVISO = `<p class="note">Este é um gabarito sugerido para discussão: em bioética, bons argumentos podem levar a conclusões diferentes.</p>`;

/* ---------- treino de um caso avulso ---------- */
function renderTreino(n) {
  document.title = `Caso ${n}: ${CASOS[n - 1].titulo}`;
  app.innerHTML = htmlCaso(n, `<div class="top"><a href="#/">← Início</a><span class="muted">Caso ${n} de ${CASOS.length}</span></div>`);
  ligarFormulario(n, (resp, acertos) => {
    const prox = n < CASOS.length ? `<a class="btn" href="#/caso/${n + 1}">Próximo caso</a>` : "";
    document.getElementById("result").innerHTML = `
      <section class="card">
        <p class="score">Você acertou ${acertos} de ${PRINCIPIOS.length}.</p>${AVISO}
        <div class="actions">${prox}<button class="secondary" type="button" id="again">Responder de novo</button></div>
      </section>`;
    document.getElementById("again").onclick = () => { renderTreino(n); window.scrollTo(0, 0); };
  });
}

/* ---------- jogo completo ---------- */
function novoId() {
  const a = new Uint8Array(12);
  (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => a[i] = Math.random() * 256);
  return Array.from(a, b => (b % 36).toString(36)).join("");
}

function renderJogo() {
  const turmaQr = (parametros().turma || "").trim();
  const jogo = lerLocal("bioetica-jogo");
  if (!jogo) return renderEntrada(turmaQr);
  const feitos = Object.keys(jogo.respostas).length;
  if (feitos >= CASOS.length) return renderFim(jogo);
  renderRodada(jogo, feitos + 1);
}

function renderEntrada(turmaQr) {
  document.title = "Jogo: Bioética em Casos";
  app.innerHTML = `
    <div class="top"><a href="#/">← Início</a></div>
    <span class="tag">Jogo completo</span>
    <h1>Bioética em casos</h1>
    <p class="muted">${CASOS.length} casos. Cada princípio certo vale 1 ponto (${TOTAL} no total). Em caso de empate, ganha quem terminar mais rápido.</p>
    <form class="card" id="entrar" novalidate>
      <label class="lbl" for="nome">Seu nome</label>
      <input class="inp" id="nome" maxlength="40" autocomplete="given-name" placeholder="Como vai aparecer no ranking">
      <label class="lbl" for="turma">Turma</label>
      <input class="inp" id="turma" maxlength="30" value="${esc(turmaQr)}" ${turmaQr ? "readonly" : ""} placeholder="Opcional">
      <p class="err" id="err" hidden>Escreva seu nome para entrar no ranking.</p>
      <div class="actions"><button type="submit">Começar</button></div>
      ${RANKING_URL ? "" : `<p class="muted small">O ranking ainda não está ligado: sua pontuação fica só neste aparelho.</p>`}
    </form>`;
  document.getElementById("entrar").addEventListener("submit", e => {
    e.preventDefault();
    const nome = document.getElementById("nome").value.replace(/\s+/g, " ").trim();
    if (!nome) { document.getElementById("err").hidden = false; return; }
    const jogo = { id: novoId(), nome, turma: document.getElementById("turma").value.trim(), inicio: Date.now(), pontos: 0, respostas: {} };
    gravarLocal("bioetica-jogo", jogo);
    renderRodada(jogo, 1);
    window.scrollTo(0, 0);
  });
}

function renderRodada(jogo, n) {
  document.title = `Jogo: caso ${n}`;
  const placar = `
    <div class="top"><span><b>${esc(jogo.nome)}</b> · ${jogo.pontos} pts</span><span class="muted">Caso ${n} de ${CASOS.length}</span></div>
    <div class="bar"><i style="width:${((n - 1) / CASOS.length) * 100}%"></i></div>`;
  app.innerHTML = htmlCaso(n, placar);
  ligarFormulario(n, async (resp, acertos) => {
    jogo.respostas[n] = resp;
    jogo.pontos += acertos;
    if (n === CASOS.length) jogo.fim = Date.now();
    gravarLocal("bioetica-jogo", jogo);
    const ultimo = n === CASOS.length;
    document.getElementById("result").innerHTML = `
      <section class="card">
        <p class="score">+${acertos} ${acertos === 1 ? "ponto" : "pontos"} · total ${jogo.pontos} de ${n * PRINCIPIOS.length}</p>
        <p class="muted small" id="envio">${RANKING_URL ? "Enviando para o ranking…" : ""}</p>
        <div class="actions"><button type="button" id="seguir">${ultimo ? "Ver resultado final" : "Próximo caso"}</button></div>
      </section>`;
    document.getElementById("seguir").onclick = () => { renderJogo(); window.scrollTo(0, 0); };
    const st = await enviarPontuacao(jogo, n);
    if (st === "ok") { marcarEnviado(jogo, n); sincronizar(); }
    const el = document.getElementById("envio");
    if (el && st === "ok") el.textContent = "Pontuação enviada para o ranking.";
    if (el && st === "erro") el.textContent = "Não foi possível enviar agora; a pontuação será enviada no próximo caso.";
  });
}

function renderFim(jogo) {
  document.title = "Resultado: Bioética em Casos";
  const seg = Math.round((jogo.fim - jogo.inicio) / 1000);
  app.innerHTML = `
    <div class="top"><a href="#/">← Início</a></div>
    <span class="tag">Fim de jogo</span>
    <h1>${esc(jogo.nome)}, você fez ${jogo.pontos} de ${TOTAL} pontos</h1>
    <p class="muted">Tempo: ${tempo(seg)}${jogo.turma ? " · Turma " + esc(jogo.turma) : ""}</p>
    <section class="card">
      <h2>Seu desempenho por caso</h2>
      <ul class="resumo">${CASOS.map((c, i) => {
        const r = jogo.respostas[i + 1] || {};
        const ac = PRINCIPIOS.filter(p => r[p.id] === c.gabarito[p.id][0]).length;
        return `<li><a href="#/caso/${i + 1}">${i + 1}. ${esc(c.titulo)}</a><span class="${ac === 4 ? "ok" : ""}">${ac}/4</span></li>`;
      }).join("")}</ul>
      ${AVISO}
    </section>
    <section class="card">
      <div class="row-between"><h2>Ranking${jogo.turma ? " · " + esc(jogo.turma) : ""}</h2><button class="secondary small-btn" id="atualizar">Atualizar</button></div>
      <div id="rank"><p class="muted">Carregando…</p></div>
    </section>
    <div class="actions"><button class="secondary" type="button" id="denovo">Jogar de novo</button></div>
    <p class="muted small">Jogar de novo cria uma nova entrada no ranking; a anterior continua lá.</p>`;
  const el = document.getElementById("rank");
  const carregar = () => preencherRanking(el, jogo.turma, jogo.id);
  enviarPontuacao(jogo).finally(carregar);
  document.getElementById("atualizar").onclick = carregar;
  document.getElementById("denovo").onclick = () => { apagarLocal("bioetica-jogo"); renderEntrada(jogo.turma); window.scrollTo(0, 0); };
}

/* ---------- ranking para projetar ---------- */
function renderRanking() {
  document.title = "Ranking: Bioética em Casos";
  const turma = (parametros().turma || "").trim();
  const jogo = lerLocal("bioetica-jogo");
  app.innerHTML = `
    <div class="top"><a href="#/">← Início</a><span class="muted">Atualiza sozinho a cada 10 segundos</span></div>
    <span class="tag">Ao vivo</span>
    <h1>Ranking${turma ? " · " + esc(turma) : ""}</h1>
    <section class="card"><div id="rank"><p class="muted">Carregando…</p></div></section>
    <div class="actions"><a class="btn" href="#/jogo${turma ? "?turma=" + encodeURIComponent(turma) : ""}">Entrar no jogo</a></div>`;
  const el = document.getElementById("rank");
  const carregar = () => preencherRanking(el, turma, jogo && jogo.id);
  carregar();
  if (RANKING_URL) refreshTimer = setInterval(carregar, 10000);
}

/* ---------- QR codes ---------- */
function qrSvg(texto) {
  if (typeof qrcode !== "function") return `<p class="err">Não foi possível gerar o QR code.</p>`;
  const q = qrcode(0, "M");
  q.addData(texto);
  q.make();
  return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
}

function renderQR() {
  document.title = "QR codes: Bioética em Casos";
  const base = baseUrl();
  const turma = lerLocal("bioetica-turma") || "";
  const local = !/^https?:/.test(base);
  const jogoUrl = linkJogo(turma);
  const rankUrl = `${base}#/ranking${turma ? "?turma=" + encodeURIComponent(turma) : ""}`;
  app.innerHTML = `
    <div class="top no-print"><a href="#/">← Início</a></div>
    <h1 class="no-print">QR codes</h1>
    <section class="card no-print">
      <p class="muted">Projete ou imprima o QR do jogo completo. Os QR dos casos avulsos servem para treino e não contam no ranking.</p>
      ${local ? `<p class="note">Este arquivo está aberto no computador, não num site. Cole o endereço do site publicado, senão os QR codes não abrem no celular dos alunos.</p>` : ""}
      <label class="lbl" for="base">Endereço do site</label>
      <input class="inp" id="base" value="${esc(base)}">
      <label class="lbl" for="turma">Turma (opcional: separa o ranking por turma)</label>
      <input class="inp" id="turma" value="${esc(turma)}" maxlength="30" placeholder="Ex.: Enfermagem 3A">
      <div class="actions"><button type="button" id="save">Atualizar QR codes</button><button class="secondary" type="button" onclick="window.print()">Imprimir</button></div>
    </section>
    <div class="qr-main">
      <div class="qr-card big"><b>Jogo completo${turma ? " · " + esc(turma) : ""}</b><div>Leia, digite seu nome e jogue</div>${qrSvg(jogoUrl)}<div class="url">${esc(jogoUrl)}</div></div>
      <div class="qr-card"><b>Ranking ao vivo</b><div>Para projetar na sala</div>${qrSvg(rankUrl)}<div class="url"><a href="${esc(rankUrl)}">${esc(rankUrl)}</a></div></div>
    </div>
    <h2 class="sec">Casos avulsos (treino)</h2>
    <div class="qr-grid">${CASOS.map((c, i) => {
      const url = `${base}#/caso/${i + 1}`;
      return `<div class="qr-card"><b>Caso ${i + 1}</b><div>${esc(c.titulo)}</div>${qrSvg(url)}<div class="url">${esc(url)}</div></div>`;
    }).join("")}</div>`;
  document.getElementById("save").onclick = () => {
    gravarLocal("bioetica-base", document.getElementById("base").value.trim().split("#")[0]);
    gravarLocal("bioetica-turma", document.getElementById("turma").value.trim());
    renderQR();
  };
}

/* ---------- envio do que ficou guardado no celular ----------
   Jogos feitos sem internet, ou antes de o ranking ser ligado, ficam guardados
   neste aparelho. Ao abrir o site, as respostas que ainda não chegaram à
   planilha são enviadas, uma por caso. */
function marcarEnviado(jogo, n) {
  const atual = lerLocal("bioetica-jogo");
  if (!atual || atual.id !== jogo.id) return;
  atual.enviados = Array.from(new Set([...(atual.enviados || []), n]));
  jogo.enviados = atual.enviados;
  gravarLocal("bioetica-jogo", atual);
}

let sincronizando = false;
async function sincronizar() {
  if (!RANKING_URL || sincronizando) return;
  const jogo = lerLocal("bioetica-jogo");
  if (!jogo || !jogo.respostas) return;
  const faltam = Object.keys(jogo.respostas).map(Number).filter(n => !(jogo.enviados || []).includes(n)).sort((a, b) => a - b);
  if (!faltam.length) return;
  sincronizando = true;
  try {
    for (const n of faltam) {
      if (await enviarPontuacao(jogo, n) !== "ok") break;
      marcarEnviado(jogo, n);
    }
  } finally { sincronizando = false; }
}

window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
render();
sincronizar();
