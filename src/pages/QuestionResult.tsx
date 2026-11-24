import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../store";
import { Bar, Chips, Empty, Icon, Mascot, Ring, TopBar } from "../components/ui";
import { fmtDuration, uid } from "../lib/time";
import { bancaName } from "./QuestionsHub";
import { Feedback, saveErrors } from "./QuestionRun";
import type { QuestionList } from "../types";

type Filter = "todas" | "erradas" | "marcadas";

export default function QuestionResult() {
  const { id } = useParams();
  const list = useStore((s) => s.lists.find((l) => l.id === id));
  const errors = useStore((s) => s.errors);
  const nav = useNavigate();
  const [filter, setFilter] = useState<Filter>("todas");
  const [open, setOpen] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState("");

  if (!list) {
    return (
      <>
        <TopBar title="Resultado" back="/questoes" />
        <Empty mood="duvida" title="Lista não encontrada" />
      </>
    );
  }

  const total = list.questions.length;
  const graded = list.questions.filter((q) => list.answers[q.id]?.confirmed && list.answers[q.id]?.correct !== null);
  const correct = graded.filter((q) => list.answers[q.id]?.correct).length;
  const wrongQs = list.questions.filter((q) => list.answers[q.id]?.correct === false || !list.answers[q.id]?.confirmed);
  const flaggedQs = list.questions.filter((q) => list.answers[q.id]?.flagged);
  const pendingSelf = list.questions.filter((q) => q.alternativas.length === 0 && list.answers[q.id]?.confirmed && list.answers[q.id]?.correct === null).length;
  const pct = graded.length ? correct / graded.length : 0;
  const savedIds = new Set(errors.map((e) => e.question.id));

  // Desempenho por assunto
  const byTopic = new Map<string, { total: number; correct: number }>();
  for (const q of graded) {
    const cur = byTopic.get(q.assunto) ?? { total: 0, correct: 0 };
    cur.total++;
    if (list.answers[q.id]?.correct) cur.correct++;
    byTopic.set(q.assunto, cur);
  }
  const topicRows = [...byTopic.entries()].sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total);
  const strong = topicRows.filter(([, v]) => v.total >= 2 && v.correct / v.total >= 0.75).map(([k]) => k);
  const weak = topicRows.filter(([, v]) => v.correct / v.total < 0.5).map(([k]) => k);

  const shown = filter === "erradas" ? wrongQs : filter === "marcadas" ? flaggedQs : list.questions;

  const redo = (qs = wrongQs) => {
    if (!qs.length) return;
    const newList: QuestionList = {
      id: uid(),
      title: `Refazer · ${list.title}`,
      config: { ...list.config, modo: "treino" },
      questions: qs.map((q) => ({ ...q })),
      answers: {},
      aviso: "",
      createdAt: Date.now(),
      totalSec: 0,
      current: 0,
      origin: "refazer",
    };
    useStore.getState().addList(newList);
    nav(`/questoes/lista/${newList.id}`);
  };

  const saveToNotebook = () => {
    const ids = [...new Set([...wrongQs, ...flaggedQs].map((q) => q.id))].filter((qid) => !savedIds.has(qid));
    const n = saveErrors(list, ids);
    setSavedMsg(n ? `${n} questão(ões) salvas no caderno de erros.` : "Essas questões já estão no caderno de erros.");
  };

  const newListUrl = `/questoes?${list.config.subjectId ? `materia=${list.config.subjectId}` : list.config.notebookId ? `caderno=${list.config.notebookId}` : ""}`;

  return (
    <>
      <TopBar title="Resultado" back="/questoes" />
      <main className="page">
        <section className="card tint stack" style={{ background: pct >= 0.7 ? "var(--mint)" : "var(--lavender)", alignItems: "center", textAlign: "center" }}>
          <Ring value={pct} size={130} color={pct >= 0.7 ? "#1f7a63" : "#7f4fcf"} label={`Aproveitamento ${Math.round(pct * 100)}%`}>
            <div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800 }}>{Math.round(pct * 100)}%</div>
              <div className="tiny">aproveitamento</div>
            </div>
          </Ring>
          <h2 style={{ fontWeight: 800 }}>{list.title}</h2>
          <span className="small">
            {bancaName(list.config)} · {list.config.modo === "simulado" ? "Simulado" : "Treino"}
          </span>
          <div className="row" style={{ gap: 18, justifyContent: "center" }}>
            <div className="stat">
              <span className="stat-value">{total}</span>
              <span className="stat-label">questões</span>
            </div>
            <div className="stat">
              <span className="stat-value">✓ {correct}</span>
              <span className="stat-label">acertos</span>
            </div>
            <div className="stat">
              <span className="stat-value">✗ {graded.length - correct}</span>
              <span className="stat-label">erros</span>
            </div>
            <div className="stat">
              <span className="stat-value">{fmtDuration(list.totalSec)}</span>
              <span className="stat-label">tempo</span>
            </div>
          </div>
          {total - graded.length - pendingSelf > 0 && <span className="small">{total - graded.length - pendingSelf} questão(ões) sem resposta.</span>}
          {pendingSelf > 0 && <span className="small">{pendingSelf} discursiva(s) aguardando sua autoavaliação abaixo.</span>}
        </section>

        {topicRows.length > 0 && (
          <section className="card stack">
            <h2 className="section-title">Desempenho por assunto</h2>
            {topicRows.map(([name, v]) => (
              <div key={name} className="stack" style={{ gap: 4 }}>
                <div className="row between small">
                  <span className="truncate">{name}</span>
                  <strong>
                    {v.correct}/{v.total}
                  </strong>
                </div>
                <Bar value={v.correct / v.total} color={v.correct / v.total >= 0.7 ? "var(--mint)" : v.correct / v.total >= 0.5 ? "var(--butter)" : "var(--coral)"} label={name} />
              </div>
            ))}
            <div className="row" style={{ alignItems: "flex-start" }}>
              <Mascot mood="revisao" size={40} />
              <p className="small">
                {graded.length < 8 ? "Com poucas questões, este resultado é só um primeiro indicativo. " : ""}
                {strong.length ? `Bom desempenho em: ${strong.join(", ")}. ` : ""}
                {weak.length ? `Vale reforçar: ${weak.join(", ")}. Próximo passo sugerido: revisar a explicação desses itens e refazer os erros.` : "Próximo passo sugerido: gerar uma nova lista com dificuldade um pouco maior."}
              </p>
            </div>
          </section>
        )}

        <div className="grid-2">
          <button className="btn btn-primary" onClick={() => redo()} disabled={!wrongQs.length}>
            <Icon name="refresh" /> Refazer erros
          </button>
          <Link to={newListUrl} className="btn btn-soft">
            <Icon name="spark" /> Gerar nova lista
          </Link>
        </div>
        <button className="btn btn-ghost btn-block" onClick={saveToNotebook} disabled={!wrongQs.length && !flaggedQs.length}>
          <Icon name="flag" /> Salvar erros e marcadas no caderno de erros
        </button>
        {savedMsg && (
          <p className="small center" role="status" style={{ color: "var(--ok)", fontWeight: 700 }}>
            {savedMsg} <Link to="/erros" className="link-btn">Abrir</Link>
          </p>
        )}

        <h2 className="section-title">Correção comentada</h2>
        <Chips<Filter>
          label="Filtrar questões"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "todas", label: `Todas (${total})` },
            { value: "erradas", label: `Erradas (${wrongQs.length})` },
            { value: "marcadas", label: `Marcadas (${flaggedQs.length})` },
          ]}
        />
        <div className="list">
          {shown.map((q) => {
            const a = list.answers[q.id];
            const i = list.questions.indexOf(q);
            const status = !a?.confirmed ? { t: "Sem resposta", c: "" } : a.correct === null ? { t: "Autoavaliar", c: "warn" } : a.correct ? { t: "✓ Acertou", c: "ok" } : { t: "✗ Errou", c: "bad" };
            const isOpen = open === q.id;
            return (
              <div key={q.id} className="card stack">
                <button className="card-link row" style={{ background: "none", border: "none", padding: 0 }} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : q.id)}>
                  <strong>{i + 1}.</strong>
                  <span className="grow truncate small">{q.enunciado}</span>
                  {a?.flagged && <span aria-label="Marcada">🚩</span>}
                  <span className={`pill ${status.c}`}>{status.t}</span>
                </button>
                {isOpen && (
                  <>
                    <p className="statement small">{q.enunciado}</p>
                    {q.alternativas.map((alt) => (
                      <div key={alt.letra} className={`option ${alt.letra === q.correta ? "correct" : a?.choice === alt.letra ? "wrong" : ""}`} style={{ cursor: "default" }}>
                        <span className="letter">{alt.letra}</span>
                        <span className="grow small">{alt.texto}</span>
                        {alt.letra === q.correta && <span className="option-status">✓ Correta</span>}
                        {alt.letra !== q.correta && a?.choice === alt.letra && <span className="option-status">✗ Sua</span>}
                      </div>
                    ))}
                    {q.alternativas.length === 0 && a?.choice && (
                      <div className="small">
                        <strong>Sua resposta:</strong>
                        <p className="explain">{a.choice}</p>
                      </div>
                    )}
                    {a && <Feedback q={q} ans={a} onSelfAssess={(ok) => useStore.getState().setAnswer(list.id, q.id, { correct: ok })} />}
                    {savedIds.has(q.id) && <span className="tiny muted">No caderno de erros.</span>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
