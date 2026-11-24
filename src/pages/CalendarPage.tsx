import { useState, type FormEvent } from "react";
import { useStore } from "../store";
import { Icon, Sheet, TopBar, confirmAction } from "../components/ui";
import { WEEKDAY_SHORT, addDays, dayKey, fmtDuration, fmtLongDate, monthLabel, parseDayKey, secondsByDay, startOfDay } from "../lib/time";
import { dailyTargetMin } from "../lib/stats";
import type { StudySession } from "../types";

export default function CalendarPage() {
  const s = useStore();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(dayKey());
  const [editing, setEditing] = useState<StudySession | "new" | null>(null);

  const byDay = secondsByDay(s.sessions);
  const todayKey = dayKey();
  const first = month.getTime();
  const lead = (month.getDay() + 6) % 7; // semana começa na segunda
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => dayKey(addDays(first, i)))];
  const maxSec = Math.max(3600, ...[...byDay.values()]);

  const reviewDays = new Set(s.reviews.map((r) => r.date));
  const listDays = new Set(s.lists.filter((l) => l.finishedAt).map((l) => dayKey(l.finishedAt!)));

  const sel = parseDayKey(selected);
  const selSessions = s.sessions.filter((x) => dayKey(x.start) === selected).sort((a, b) => a.start - b.start);
  const selTotal = selSessions.reduce((a, x) => a + x.durationSec, 0);
  const selTarget = dailyTargetMin(s.goals, s.prefs.dailyMinutes, s.prefs.studyDays, sel.getTime() + 12 * 3600_000);
  const selReviews = s.reviews.filter((r) => r.date === selected);
  const selLists = s.lists.filter((l) => l.finishedAt && dayKey(l.finishedAt) === selected);
  const isFuture = selected > todayKey;
  const isRest = !s.prefs.studyDays.includes(sel.getDay());

  const ordered = WEEKDAY_SHORT.slice(1).concat(WEEKDAY_SHORT[0]);

  return (
    <>
      <TopBar title="Calendário" back />
      <main className="page">
        <section className="card stack">
          <div className="row between">
            <button className="icon-btn" aria-label="Mês anterior" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
              <Icon name="back" />
            </button>
            <h2 style={{ fontWeight: 800 }}>{monthLabel(month)}</h2>
            <button className="icon-btn" aria-label="Próximo mês" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={{ transform: "rotate(180deg)" }}>
              <Icon name="back" />
            </button>
          </div>
          <div className="cal" role="grid" aria-label={`Calendário de ${monthLabel(month)}`}>
            {ordered.map((d) => (
              <div key={d} className="cal-head" aria-hidden>
                {d}
              </div>
            ))}
            {cells.map((k, i) => {
              if (!k) return <div key={`e${i}`} />;
              const d = parseDayKey(k);
              const sec = byDay.get(k) ?? 0;
              const future = k > todayKey;
              const rest = !s.prefs.studyDays.includes(d.getDay());
              const intensity = sec ? 0.25 + 0.75 * Math.min(1, sec / maxSec) : 0;
              const cls = ["cal-day", future ? "future" : "", !sec && !future && rest ? "rest" : "", k === todayKey ? "today" : "", k === selected ? "sel" : ""].join(" ");
              return (
                <button
                  key={k}
                  className={cls}
                  style={sec ? { background: `color-mix(in srgb, var(--lilac) ${Math.round(intensity * 100)}%, var(--surface))` } : undefined}
                  aria-label={`${d.getDate()}: ${sec ? fmtDuration(sec) + " estudados" : future ? "ainda não chegou" : rest ? "dia de descanso" : "sem registro"}${reviewDays.has(k) ? ", revisão agendada" : ""}${listDays.has(k) ? ", questões resolvidas" : ""}`}
                  aria-pressed={k === selected}
                  onClick={() => setSelected(k)}
                >
                  {d.getDate()}
                  <span className="row" style={{ gap: 2, height: 6 }}>
                    {reviewDays.has(k) && <span className="dot" style={{ background: "var(--coral)" }} />}
                    {listDays.has(k) && <span className="dot" style={{ background: "#3d6fb6" }} />}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="row wrap tiny muted" style={{ gap: 12 }}>
            <span className="row" style={{ gap: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: "var(--lilac)" }} /> estudo (mais forte = mais tempo)
            </span>
            <span className="row" style={{ gap: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, border: "1.5px solid var(--border)" }} /> descanso
            </span>
            <span className="row" style={{ gap: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, border: "1.5px dashed var(--border)" }} /> ainda não chegou
            </span>
            <span className="row" style={{ gap: 4 }}>
              <span className="dot" style={{ width: 8, height: 8, borderRadius: 9, background: "var(--coral)" }} /> revisão
            </span>
            <span className="row" style={{ gap: 4 }}>
              <span className="dot" style={{ width: 8, height: 8, borderRadius: 9, background: "#3d6fb6" }} /> questões
            </span>
          </div>
        </section>

        <section className="card stack">
          <h2 className="section-title">
            {fmtLongDate(sel)}
          </h2>
          {isFuture ? (
            <p className="small muted">Este dia ainda não chegou.</p>
          ) : (
            <p>
              <strong>{fmtDuration(selTotal)}</strong> estudados
              {selTarget ? <span className="muted"> · meta {fmtDuration(selTarget * 60)}{selTotal >= selTarget * 60 ? " ✓ cumprida" : ""}</span> : null}
              {!selTotal && isRest ? <span className="muted"> · dia de descanso</span> : null}
            </p>
          )}
          {selSessions.map((x) => (
            <div key={x.id} className="list-item small">
              <Icon name="clock" size={18} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="truncate" style={{ fontWeight: 700 }}>
                  {s.subjects.find((m) => m.id === x.subjectId)?.name ?? "Sessão livre"}
                  {x.topicId ? ` · ${s.topics.find((t) => t.id === x.topicId)?.name ?? ""}` : ""}
                </div>
                <div className="tiny muted">
                  {new Date(x.start).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}–{new Date(x.end).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  {x.pauseSec > 0 ? ` · ${fmtDuration(x.pauseSec)} de pausa` : ""}
                  {x.editedAt ? " · editada" : ""}
                  {x.note ? ` · ${x.note}` : ""}
                </div>
              </div>
              <strong>{fmtDuration(x.durationSec)}</strong>
              <button className="icon-btn" aria-label="Editar sessão" onClick={() => setEditing(x)}>
                <Icon name="edit" size={18} />
              </button>
            </div>
          ))}
          {selReviews.map((r) => (
            <div key={r.id} className="list-item small">
              <span aria-hidden>🔁</span>
              <span className="grow">Revisão: {s.topics.find((t) => t.id === r.topicId)?.name}</span>
              <span className={`pill ${r.done ? "ok" : ""}`}>{r.done ? "✓ feita" : "pendente"}</span>
            </div>
          ))}
          {selLists.map((l) => (
            <div key={l.id} className="list-item small">
              <span aria-hidden>✦</span>
              <span className="grow truncate">{l.title}</span>
              <span className="pill">
                {l.questions.filter((q) => l.answers[q.id]?.correct).length}/{l.questions.length}
              </span>
            </div>
          ))}
          {!isFuture && (
            <button className="btn btn-ghost btn-block" onClick={() => setEditing("new")}>
              <Icon name="plus" /> Registrar sessão manualmente
            </button>
          )}
        </section>
      </main>
      <SessionSheet session={editing} day={selected} onClose={() => setEditing(null)} />
    </>
  );
}

function SessionSheet({ session, day, onClose }: { session: StudySession | "new" | null; day: string; onClose: () => void }) {
  const subjects = useStore((s) => s.subjects);
  const existing = session && session !== "new" ? session : null;
  const [minutes, setMinutes] = useState("");
  const [time, setTime] = useState("09:00");
  const [subjectId, setSubjectId] = useState("");
  const [note, setNote] = useState("");
  const [last, setLast] = useState<typeof session>(null);
  const [error, setError] = useState("");

  if (session !== last) {
    setLast(session);
    if (session) {
      setMinutes(existing ? String(Math.round(existing.durationSec / 60)) : "30");
      setTime(existing ? new Date(existing.start).toTimeString().slice(0, 5) : "09:00");
      setSubjectId(existing?.subjectId ?? "");
      setNote(existing?.note ?? "");
      setError("");
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const m = parseInt(minutes, 10);
    if (!m || m <= 0 || m > 16 * 60) return setError("Informe uma duração entre 1 minuto e 16 horas.");
    const [hh, mm] = time.split(":").map(Number);
    const start = startOfDay(parseDayKey(existing ? dayKey(existing.start) : day)) + (hh * 60 + mm) * 60_000;
    const sub = subjects.find((x) => x.id === subjectId);
    const data = {
      start,
      end: start + m * 60_000,
      durationSec: m * 60,
      subjectId: sub?.id,
      notebookId: sub?.notebookId,
      topicId: existing && existing.subjectId === sub?.id ? existing.topicId : undefined,
      note,
    };
    const st = useStore.getState();
    if (existing) st.updateSession(existing.id, data);
    else st.addSession({ ...data, pauseSec: 0 });
    onClose();
  };

  return (
    <Sheet open={Boolean(session)} onClose={onClose} title={existing ? "Corrigir sessão" : "Registrar sessão"}>
      <form className="stack" onSubmit={submit} noValidate>
        <div className="grid-2">
          <label className="field">
            <span>Início</span>
            <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <label className="field">
            <span>Duração (min)</span>
            <input className="input" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ""))} />
          </label>
        </div>
        <label className="field">
          <span>Matéria</span>
          <select className="select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">Sessão livre</option>
            {subjects.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Observação</span>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {error && <p className="field-error">{error}</p>}
        <button className="btn btn-primary btn-block" type="submit">
          Salvar
        </button>
        {existing && (
          <button
            type="button"
            className="btn btn-danger btn-block"
            onClick={async () => {
              if (await confirmAction("Excluir este registro de estudo? Ele deixará de contar nas metas e estatísticas.")) {
                useStore.getState().removeSession(existing.id);
                onClose();
              }
            }}
          >
            <Icon name="trash" /> Excluir registro
          </button>
        )}
      </form>
    </Sheet>
  );
}
