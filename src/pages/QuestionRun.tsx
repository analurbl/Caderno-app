import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../store";
import { Empty, Icon, Mascot, Sheet, TopBar, confirmAction } from "../components/ui";
import { explainMore } from "../lib/api";
import { bancaName } from "./QuestionsHub";
import type { Answer, Question, QuestionList } from "../types";

export function finishList(list: QuestionList) {
  const st = useStore.getState();
  st.updateList(list.id, { finishedAt: Date.now() });
  st.completePlannedPractice(list.config.subjectId);
  if (st.prefs.autoSaveErrors) saveErrors(list);
}

export function saveErrors(list: QuestionList, onlyIds?: string[]) {
  const st = useStore.getState();
  const wrong = list.questions.filter((q) => {
    const a = list.answers[q.id];
    return (onlyIds ? onlyIds.includes(q.id) : a?.correct === false) && a;
  });
  st.addErrors(
    wrong.map((q) => ({
      question: q,
      banca: list.config.banca,
      bancaOutra: list.config.bancaOutra,
      notebookId: list.config.notebookId,
      subjectId: list.config.subjectId,
      choice: list.answers[q.id]?.choice ?? "",
      status: "pendente" as const,
      personalNote: "",
      manual: Boolean(onlyIds),
    })),
  );
  return wrong.length;
}

export default function QuestionRun() {
  const { id } = useParams();
  const list = useStore((s) => s.lists.find((l) => l.id === id));
  const subjects = useStore((s) => s.subjects);
  const nav = useNavigate();
  const { setAnswer, updateList } = useStore.getState();
  const shownAt = useRef(Date.now());
  const [draft, setDraft] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [doubt, setDoubt] = useState<{ open: boolean; text: string; loading: boolean; answer: string; error: string }>({ open: false, text: "", loading: false, answer: "", error: "" });

  const idx = list?.current ?? 0;
  const q = list?.questions[idx];
  const ans: Answer | undefined = q ? list?.answers[q.id] : undefined;

  useEffect(() => {
    shownAt.current = Date.now();
    setDraft(ans?.choice ?? "");
    setDoubt({ open: false, text: "", loading: false, answer: "", error: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, list?.id]);

  if (!list || !q) {
    return (
      <>
        <TopBar title="Questões" back="/questoes" />
        <Empty mood="duvida" title="Lista não encontrada" />
      </>
    );
  }
  if (list.finishedAt) return <Navigate to={`/questoes/resultado/${list.id}`} replace />;

  const simulado = list.config.modo === "simulado";
  const discursiva = q.alternativas.length === 0;
  const revealed = !simulado && Boolean(ans?.confirmed);
  const total = list.questions.length;
  const sub = subjects.find((x) => x.id === list.config.subjectId);

  const spent = () => Math.round((Date.now() - shownAt.current) / 1000);
  const go = (i: number) => {
    if (i < 0 || i >= total) return;
    if (q && !ans?.confirmed) setAnswer(list.id, q.id, { timeSec: (ans?.timeSec ?? 0) + spent() });
    updateList(list.id, { current: i, totalSec: list.totalSec + spent() });
  };

  const confirm = () => {
    if (!draft.trim()) return;
    const correct = discursiva ? null : draft === q.correta;
    setAnswer(list.id, q.id, { choice: draft, correct, confirmed: true, timeSec: (ans?.timeSec ?? 0) + spent() });
    updateList(list.id, { totalSec: list.totalSec + spent() });
    shownAt.current = Date.now();
    if (simulado && idx < total - 1) updateList(list.id, { current: idx + 1 });
  };

  const finish = async () => {
    const unanswered = list.questions.filter((x) => !list.answers[x.id]?.confirmed).length;
    if (unanswered && !(await confirmAction(`${unanswered} questão(ões) sem resposta. Encerrar mesmo assim?`, { confirmLabel: "Encerrar" }))) return;
    updateList(list.id, { totalSec: list.totalSec + spent() });
    finishList(useStore.getState().lists.find((l) => l.id === list.id)!);
    nav(`/questoes/resultado/${list.id}`, { replace: true });
  };

  const askDoubt = async () => {
    setDoubt((d) => ({ ...d, loading: true, error: "" }));
    try {
      const res = await explainMore({
        materia: sub?.name,
        assunto: q.assunto,
        enunciado: q.enunciado,
        alternativas: q.alternativas,
        correta: discursiva ? "" : q.correta,
        escolhida: ans?.choice,
        explicacao: q.explicacao,
        duvida: doubt.text,
      });
      setDoubt((d) => ({ ...d, loading: false, answer: res.text }));
    } catch (err) {
      setDoubt((d) => ({ ...d, loading: false, error: (err as Error).message }));
    }
  };

  const answeredCount = Object.values(list.answers).filter((a) => a.confirmed).length;
  const isLast = idx === total - 1;

  return (
    <>
      <TopBar
        title={`Questão ${idx + 1} de ${total}`}
        back="/questoes"
        action={
          <button className="icon-btn" aria-label={ans?.flagged ? "Desmarcar revisão" : "Marcar para revisar"} aria-pressed={Boolean(ans?.flagged)} onClick={() => setAnswer(list.id, q.id, { flagged: !ans?.flagged })}>
            <span style={{ color: ans?.flagged ? "#b58a00" : undefined }}>
              <Icon name="flag" />
            </span>
          </button>
        }
      />
      <main className="page">
        <div className="row wrap" style={{ gap: 6 }}>
          <span className="pill ai">✦ Gerada por IA</span>
          <span className="pill">{bancaName(list.config)}</span>
          {sub && <span className="pill">{sub.name}</span>}
          {q.assunto && <span className="pill">{q.assunto}</span>}
          <span className="pill">{simulado ? "Simulado" : "Treino"}</span>
        </div>

        <nav className="qdots" aria-label="Navegar entre questões">
          {list.questions.map((x, i) => {
            const a = list.answers[x.id];
            return (
              <button
                key={x.id}
                className={`qdot ${a?.confirmed ? "answered" : ""} ${i === idx ? "current" : ""} ${a?.flagged ? "flagged" : ""}`}
                aria-label={`Questão ${i + 1}${a?.confirmed ? ", respondida" : ""}${a?.flagged ? ", marcada para revisar" : ""}`}
                aria-current={i === idx}
                onClick={() => go(i)}
              >
                {i + 1}
              </button>
            );
          })}
        </nav>

        {list.aviso && idx === 0 && (
          <div className="banner warn small">
            <Icon name="alert" />
            <span>{list.aviso}</span>
          </div>
        )}

        <article className="card stack">
          <p className="statement">{q.enunciado}</p>
        </article>

        {discursiva ? (
          <label className="field">
            <span>Sua resposta</span>
            <textarea className="textarea" style={{ minHeight: 160 }} value={draft} disabled={revealed} onChange={(e) => setDraft(e.target.value)} />
          </label>
        ) : (
          <div className="stack" role="radiogroup" aria-label="Alternativas">
            {q.alternativas.map((alt) => {
              const chosen = (revealed ? ans?.choice : draft) === alt.letra;
              const isCorrect = alt.letra === q.correta;
              let cls = chosen ? "selected" : "";
              let status = "";
              if (revealed) {
                if (isCorrect) {
                  cls = "correct";
                  status = "✓ Correta";
                } else if (chosen) {
                  cls = "wrong";
                  status = "✗ Sua resposta";
                } else cls = "";
              }
              return (
                <button key={alt.letra} role="radio" aria-checked={chosen} className={`option ${cls}`} disabled={revealed} onClick={() => setDraft(alt.letra)}>
                  <span className="letter">{alt.letra}</span>
                  <span className="grow">{alt.texto}</span>
                  {status && <span className="option-status">{status}</span>}
                </button>
              );
            })}
          </div>
        )}

        {!revealed && (
          <button className="btn btn-primary btn-lg btn-block" disabled={!draft.trim() || (simulado && ans?.confirmed && ans.choice === draft)} onClick={confirm}>
            {simulado && ans?.confirmed ? (ans.choice === draft ? "Resposta registrada" : "Alterar resposta") : "Confirmar resposta"}
          </button>
        )}

        {revealed && <Feedback q={q} ans={ans!} onSelfAssess={(ok) => setAnswer(list.id, q.id, { correct: ok })} />}

        {revealed && (
          <>
            {doubt.answer ? (
              <div className="card stack">
                <div className="row">
                  <Mascot mood="duvida" size={40} />
                  <strong>Explicando de outro jeito</strong>
                </div>
                <p className="explain small">{doubt.answer}</p>
                <span className="tiny muted">Resposta gerada por IA. Em caso de legislação, confira na fonte oficial.</span>
              </div>
            ) : doubt.open ? (
              <div className="card stack">
                <label className="field">
                  <span>Qual é a sua dúvida? (opcional)</span>
                  <textarea className="textarea" style={{ minHeight: 80 }} value={doubt.text} onChange={(e) => setDoubt((d) => ({ ...d, text: e.target.value }))} placeholder="Ex.: por que a alternativa C não está correta?" />
                </label>
                {doubt.error && <p className="field-error">{doubt.error}</p>}
                <button className="btn btn-soft" onClick={askDoubt} disabled={doubt.loading}>
                  {doubt.loading ? "Pensando..." : "Pedir nova explicação"}
                </button>
              </div>
            ) : null}
            <div className="grid-2">
              <button className="btn btn-ghost" onClick={() => setDoubt((d) => ({ ...d, open: true }))} disabled={doubt.open}>
                Ainda tenho dúvida
              </button>
              {isLast ? (
                <button className="btn btn-primary" onClick={finish}>
                  Ver resultado
                </button>
              ) : (
                <button className="btn btn-primary" onClick={() => go(idx + 1)}>
                  Entendi
                </button>
              )}
            </div>
          </>
        )}

        <div className="row between">
          <button className="btn btn-ghost btn-sm" onClick={() => go(idx - 1)} disabled={idx === 0}>
            ← Anterior
          </button>
          <button className="link-btn small" onClick={() => setReportOpen(true)}>
            {q.reported ? "Questão reportada ✓" : "Reportar problema"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => go(idx + 1)} disabled={isLast}>
            Próxima →
          </button>
        </div>

        <button className={`btn btn-block ${answeredCount === total ? "btn-primary" : "btn-soft"}`} onClick={finish}>
          {simulado ? "Encerrar simulado e ver correção" : "Encerrar lista"} ({answeredCount}/{total})
        </button>
      </main>

      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} onReport={(r) => useStore.getState().reportQuestion(list.id, q.id, r)} />
    </>
  );
}

export function Feedback({ q, ans, onSelfAssess }: { q: Question; ans: Answer; onSelfAssess?: (ok: boolean) => void }) {
  const discursiva = q.alternativas.length === 0;
  return (
    <section className="card stack" aria-live="polite">
      {discursiva ? (
        <>
          <strong>Resposta esperada</strong>
          <p className="explain small">{q.resposta_esperada || q.explicacao}</p>
          {onSelfAssess && (
            <>
              <span className="label">Comparando com a sua resposta, você acertou?</span>
              <div className="row">
                <button className={`btn btn-sm grow ${ans.correct === true ? "btn-primary" : "btn-ghost"}`} onClick={() => onSelfAssess(true)}>
                  ✓ Acertei
                </button>
                <button className={`btn btn-sm grow ${ans.correct === false ? "btn-danger" : "btn-ghost"}`} onClick={() => onSelfAssess(false)}>
                  ✗ Errei / parcial
                </button>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="row">
          <Mascot mood={ans.correct ? "conquista" : "calma"} size={48} />
          <div>
            <strong style={{ color: ans.correct ? "var(--ok)" : "var(--bad)", fontSize: "1.1rem" }}>{ans.correct ? "✓ Resposta correta!" : ans.choice ? "✗ Resposta incorreta" : "Sem resposta"}</strong>
            <div className="small">Gabarito: alternativa {q.correta}</div>
          </div>
        </div>
      )}
      {!discursiva && (
        <>
          <strong>Explicação</strong>
          <p className="explain small">{q.explicacao}</p>
        </>
      )}
      {q.comentarios_alternativas.length > 0 && (
        <>
          <strong>Sobre as alternativas</strong>
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
            {q.comentarios_alternativas.map((c) => (
              <li key={c.letra}>
                <strong>{c.letra})</strong> {c.comentario}
              </li>
            ))}
          </ul>
        </>
      )}
      {q.dica && (
        <div className="banner small">
          <span aria-hidden>💡</span>
          <span>
            <strong>Dica de prova:</strong> {q.dica}
          </span>
        </div>
      )}
      {q.incerteza && (
        <div className="banner warn small">
          <Icon name="alert" />
          <span>
            <strong>Confira na fonte oficial:</strong> {q.incerteza}
          </span>
        </div>
      )}
      <span className="tiny muted">{q.base === "material_do_usuario" ? "Baseada no material que você forneceu." : "Baseada em conhecimento geral."}</span>
    </section>
  );
}

export function ReportSheet({ open, onClose, onReport }: { open: boolean; onClose: () => void; onReport: (reason: string) => void }) {
  const [reason, setReason] = useState("Resposta incorreta");
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (open) setSent(false);
  }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title="Reportar questão">
      {sent ? (
        <>
          <p>Obrigado! A questão foi marcada e você pode desconsiderá-la nos estudos.</p>
          <button className="btn btn-primary btn-block" onClick={onClose}>
            Fechar
          </button>
        </>
      ) : (
        <>
          <div className="stack">
            {["Resposta incorreta", "Questão ambígua", "Mal formulada", "Informação desatualizada ou inventada", "Outro"].map((r) => (
              <label key={r} className="list-item" style={{ cursor: "pointer" }}>
                <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} />
                <span>{r}</span>
              </label>
            ))}
          </div>
          <button
            className="btn btn-primary btn-block"
            onClick={() => {
              onReport(reason);
              setSent(true);
            }}
          >
            Enviar
          </button>
        </>
      )}
    </Sheet>
  );
}
