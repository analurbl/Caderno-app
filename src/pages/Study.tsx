import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "../store";
import { Bar, Chips, Icon, Mascot, Sheet, TopBar, confirmAction } from "../components/ui";
import { useNow } from "../lib/hooks";
import { activeElapsed, activePaused, addDays, fmtClock, fmtDuration, startOfDay, sumSessions } from "../lib/time";
import { dailyTargetMin } from "../lib/stats";
import type { StudySession } from "../types";

export default function Study() {
  const s = useStore();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const active = s.active;

  // Contexto inicial a partir da URL (caderno/matéria/assunto) ou do último estudo.
  const initial = useMemo(() => {
    const topicId = params.get("assunto") ?? undefined;
    const topic = s.topics.find((t) => t.id === topicId);
    const subjectId = topic?.subjectId ?? params.get("materia") ?? undefined;
    const sub = s.subjects.find((x) => x.id === subjectId);
    const notebookId = sub?.notebookId ?? params.get("caderno") ?? undefined;
    if (notebookId || subjectId || topicId) return { notebookId, subjectId: sub?.id, topicId: topic?.id };
    const last = s.lastContext;
    if (last && (!last.notebookId || s.notebooks.some((n) => n.id === last.notebookId))) return last;
    return {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [ctx, setCtx] = useState<{ notebookId?: string; subjectId?: string; topicId?: string }>(active ? { notebookId: active.notebookId, subjectId: active.subjectId, topicId: active.topicId } : initial);
  // Vindo de um bloco do cronograma (?min=90), a sessão já começa com a duração do bloco.
  const presetMin = Number(params.get("min")) || 0;
  const presetChoices = [0, 25, 50, 90];
  const [target, setTarget] = useState(presetMin ? (presetChoices.includes(presetMin) ? presetMin : -1) : 25);
  const [customMin, setCustomMin] = useState(presetMin && !presetChoices.includes(presetMin) ? String(presetMin) : "");
  const [finished, setFinished] = useState<StudySession | null>(null);

  useEffect(() => {
    if (active) setCtx({ notebookId: active.notebookId, subjectId: active.subjectId, topicId: active.topicId });
  }, [active?.notebookId, active?.subjectId, active?.topicId]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateCtx = (next: typeof ctx) => {
    setCtx(next);
    if (active) s.setActiveContext(next);
  };

  const notebooks = s.notebooks.filter((n) => !n.archived).sort((a, b) => a.order - b.order);
  const subjects = s.subjects.filter((x) => x.notebookId === ctx.notebookId && !x.archived).sort((a, b) => a.order - b.order);
  const topics = s.topics.filter((t) => t.subjectId === ctx.subjectId);

  const contextSelectors = (
    <section className="card stack" aria-label="O que você vai estudar">
      <label className="field">
        <span>Caderno</span>
        <select className="select" value={ctx.notebookId ?? ""} onChange={(e) => updateCtx({ notebookId: e.target.value || undefined })}>
          <option value="">Sessão livre (sem caderno)</option>
          {notebooks.map((n) => (
            <option key={n.id} value={n.id}>
              {n.icon} {n.name}
            </option>
          ))}
        </select>
      </label>
      {ctx.notebookId && (
        <label className="field">
          <span>Matéria</span>
          <select className="select" value={ctx.subjectId ?? ""} onChange={(e) => updateCtx({ notebookId: ctx.notebookId, subjectId: e.target.value || undefined })}>
            <option value="">Todas / geral</option>
            {subjects.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {ctx.subjectId && (
        <label className="field">
          <span>Assunto</span>
          <select className="select" value={ctx.topicId ?? ""} onChange={(e) => updateCtx({ ...ctx, topicId: e.target.value || undefined })}>
            <option value="">Geral da matéria</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </section>
  );

  if (finished) return <FinishedView session={finished} onDone={() => nav("/")} onAgain={() => setFinished(null)} />;

  if (!active) {
    const minutes = target === -1 ? parseInt(customMin, 10) || 0 : target;
    return (
      <>
        <TopBar title="Estudar" />
        <main className="page">
          <div className="row">
            <Mascot mood="foco" size={56} />
            <p className="muted">Escolha o que vai estudar e inicie o cronômetro. O tempo pausado não entra no total.</p>
          </div>
          {contextSelectors}
          <section className="card stack">
            <span className="label">Tipo de sessão</span>
            <Chips<number>
              label="Duração da sessão"
              value={target}
              onChange={setTarget}
              options={[
                { value: 0, label: "Livre" },
                { value: 25, label: "25 min" },
                { value: 50, label: "50 min" },
                { value: 90, label: "1h30" },
                { value: -1, label: "Personalizada" },
              ]}
            />
            {target === -1 && (
              <label className="field">
                <span>Minutos</span>
                <input className="input" inputMode="numeric" value={customMin} onChange={(e) => setCustomMin(e.target.value.replace(/\D/g, ""))} placeholder="Ex.: 40" />
              </label>
            )}
          </section>
          <button className="btn btn-primary btn-lg btn-block" onClick={() => s.startSession({ ...ctx, targetMin: Math.max(0, minutes) })}>
            <Icon name="play" /> Iniciar cronômetro
          </button>
          <Link to="/calendario" className="link-btn center small">
            Ver ou corrigir sessões anteriores
          </Link>
        </main>
      </>
    );
  }

  return <ActiveTimer contextSelectors={contextSelectors} onFinished={setFinished} />;
}

function ActiveTimer({ contextSelectors, onFinished }: { contextSelectors: React.ReactNode; onFinished: (s: StudySession) => void }) {
  const active = useStore((s) => s.active)!;
  const sessions = useStore((s) => s.sessions);
  const goals = useStore((s) => s.goals);
  const prefs = useStore((s) => s.prefs);
  const { pauseSession, resumeSession, finishSession, discardSession, setActiveNote } = useStore.getState();
  const now = useNow(active.runningSince ? 500 : 5000);
  const elapsed = activeElapsed(active, now);
  const paused = activePaused(active, now);
  const running = Boolean(active.runningSince);
  const targetSec = active.targetMin * 60;
  const reached = targetSec > 0 && elapsed >= targetSec;
  const notified = useRef(false);
  const [showNote, setShowNote] = useState(Boolean(active.note));

  useEffect(() => {
    if (reached && !notified.current) {
      notified.current = true;
      if ("vibrate" in navigator) navigator.vibrate?.(200);
    }
  }, [reached]);

  useEffect(() => {
    document.title = `${fmtClock(elapsed)} · Caderno`;
    return () => {
      document.title = "Caderno";
    };
  }, [elapsed]);

  const today = startOfDay(now);
  const todaySec = sumSessions(sessions, today, addDays(today, 1)) + elapsed;
  const dailyTarget = dailyTargetMin(goals, prefs.dailyMinutes, prefs.studyDays, now);

  const finish = () => {
    const saved = finishSession();
    if (saved) onFinished(saved);
  };

  return (
    <>
      <TopBar title={running ? "Estudando" : "Pausado"} />
      <main className="page">
        <section className="card timer-wrap" aria-live="off">
          <Mascot mood={reached ? "conquista" : running ? "foco" : "calma"} size={64} />
          <div className={`timer ${running ? "" : "paused"}`} role="timer" aria-label={`Tempo estudado: ${fmtDuration(elapsed)}`}>
            {fmtClock(elapsed)}
          </div>
          {targetSec > 0 ? (
            <div className="stack" style={{ width: "100%", maxWidth: 320, gap: 6 }}>
              <Bar value={elapsed / targetSec} color={reached ? "var(--mint)" : "var(--lilac)"} label="Meta da sessão" />
              <span className="small muted center">
                {reached ? "Meta da sessão atingida! Encerre ou continue no seu ritmo." : `Meta da sessão: ${fmtDuration(targetSec)} · faltam ${fmtDuration(targetSec - elapsed)}`}
              </span>
            </div>
          ) : (
            <span className="small muted">Sessão livre</span>
          )}
          {!running && (
            <span className="pill warn" role="status">
              Em pausa · {fmtClock(paused)} de intervalo (não conta no total)
            </span>
          )}
          <div className="row" style={{ gap: 28, marginTop: 12, alignItems: "flex-start" }}>
            <div className="stack" style={{ alignItems: "center", gap: 0 }}>
              <button className="round-btn alt" aria-label="Finalizar sessão" onClick={finish}>
                <Icon name="stop" size={28} />
              </button>
              <span className="btn-label">Finalizar</span>
            </div>
            <div className="stack" style={{ alignItems: "center", gap: 0 }}>
              <button className="round-btn main" aria-label={running ? "Pausar" : "Continuar"} onClick={() => (running ? pauseSession() : resumeSession())}>
                <Icon name={running ? "pause" : "play"} size={36} />
              </button>
              <span className="btn-label">{running ? "Pausar / intervalo" : "Continuar"}</span>
            </div>
          </div>
        </section>

        {dailyTarget ? (
          <div className="card stack" style={{ gap: 6 }}>
            <div className="row between small">
              <strong>Meta de hoje</strong>
              <span>
                {fmtDuration(todaySec)} / {fmtDuration(dailyTarget * 60)}
              </span>
            </div>
            <Bar value={todaySec / 60 / dailyTarget} color="var(--pink)" label="Meta diária" />
          </div>
        ) : null}

        {contextSelectors}

        {showNote ? (
          <label className="field">
            <span>Anotação da sessão</span>
            <textarea className="textarea" value={active.note} onChange={(e) => setActiveNote(e.target.value)} placeholder="O que você estudou, dúvidas que surgiram..." />
          </label>
        ) : (
          <button className="btn btn-ghost btn-block" onClick={() => setShowNote(true)}>
            <Icon name="edit" /> Adicionar anotação
          </button>
        )}

        <button
          className="link-btn small"
          style={{ color: "var(--bad)" }}
          onClick={async () => {
            if (await confirmAction("Descartar esta sessão? O tempo não será registrado.")) discardSession();
          }}
        >
          Descartar sessão
        </button>
      </main>
    </>
  );
}

function FinishedView({ session, onDone, onAgain }: { session: StudySession; onDone: () => void; onAgain: () => void }) {
  const updateSession = useStore((s) => s.updateSession);
  const subjects = useStore((s) => s.subjects);
  const topics = useStore((s) => s.topics);
  const [feeling, setFeeling] = useState<StudySession["feeling"]>();
  const [note, setNote] = useState(session.note);
  const [open, setOpen] = useState(true);
  const subName = subjects.find((x) => x.id === session.subjectId)?.name;
  const topicName = topics.find((t) => t.id === session.topicId)?.name;

  const save = () => {
    updateSession(session.id, { feeling, note });
    setOpen(false);
  };

  return (
    <>
      <TopBar title="Sessão concluída" />
      <main className="page">
        <div className="empty celebrate">
          <Mascot mood="conquista" size={96} />
          <h2 className="big-title">{fmtDuration(session.durationSec)}</h2>
          <p className="muted">
            {subName ? `${subName}${topicName ? ` · ${topicName}` : ""}` : "Sessão livre"} — somado às suas metas e ao histórico.
          </p>
        </div>
        <button className="btn btn-primary btn-lg btn-block" onClick={onDone}>
          Ver meu dia
        </button>
        <button className="btn btn-ghost btn-block" onClick={onAgain}>
          Iniciar outra sessão
        </button>
      </main>
      <Sheet open={open} onClose={() => setOpen(false)} title="Como foi o estudo?">
        <p className="small muted">Opcional — ajuda a entender sua rotina.</p>
        <Chips<string>
          label="Como foi"
          value={feeling ?? ""}
          onChange={(v) => setFeeling(v as StudySession["feeling"])}
          options={[
            { value: "otimo", label: "😊 Ótimo" },
            { value: "bom", label: "🙂 Bom" },
            { value: "dificil", label: "😮‍💨 Difícil" },
          ]}
        />
        <label className="field">
          <span>Observação</span>
          <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button className="btn btn-primary btn-block" onClick={save}>
          Salvar
        </button>
        <button className="btn btn-ghost btn-block" onClick={() => setOpen(false)}>
          Pular
        </button>
      </Sheet>
    </>
  );
}
