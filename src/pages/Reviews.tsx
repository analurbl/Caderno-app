import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { Empty, Icon, Sheet, TopBar } from "../components/ui";
import { addDays, dayKey, fmtShortDate } from "../lib/time";

export default function Reviews() {
  const reviews = useStore((s) => s.reviews);
  const topics = useStore((s) => s.topics);
  const subjects = useStore((s) => s.subjects);
  const sessions = useStore((s) => s.sessions);
  const errors = useStore((s) => s.errors);
  const { toggleReview, removeReview, addReview } = useStore.getState();
  const [adding, setAdding] = useState(false);
  const today = dayKey();

  const pending = reviews.filter((r) => !r.done).sort((a, b) => a.date.localeCompare(b.date));
  const overdue = pending.filter((r) => r.date <= today);
  const future = pending.filter((r) => r.date > today);
  const done = reviews.filter((r) => r.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)).slice(0, 10);

  // Sugestões: assuntos com erros pendentes ou sem contato há mais de 14 dias, sem revisão agendada.
  const scheduled = new Set(pending.map((r) => r.topicId));
  const lastTouch = new Map<string, number>();
  for (const s of sessions) if (s.topicId) lastTouch.set(s.topicId, Math.max(lastTouch.get(s.topicId) ?? 0, s.end));
  const suggestions = topics
    .filter((t) => !scheduled.has(t.id))
    .map((t) => {
      const errCount = errors.filter((e) => e.status === "pendente" && e.subjectId === t.subjectId && e.question.assunto.toLowerCase() === t.name.toLowerCase()).length;
      const last = lastTouch.get(t.id);
      const stale = last ? (Date.now() - last) / 86_400_000 : null;
      let reason = "";
      if (errCount >= 2) reason = `${errCount} erros pendentes`;
      else if (t.status === "revisar") reason = "marcado para revisar";
      else if (stale !== null && stale > 14) reason = `${Math.floor(stale)} dias sem contato`;
      return { t, reason };
    })
    .filter((x) => x.reason)
    .slice(0, 5);

  const row = (r: (typeof reviews)[number]) => {
    const t = topics.find((x) => x.id === r.topicId);
    const sub = subjects.find((x) => x.id === t?.subjectId);
    return (
      <div key={r.id} className="list-item">
        <input type="checkbox" checked={r.done} onChange={() => toggleReview(r.id)} aria-label={`Marcar revisão de ${t?.name} como feita`} style={{ width: 24, height: 24 }} />
        <Link to={t ? `/assunto/${t.id}` : "#"} className="grow card-link" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, textDecoration: r.done ? "line-through" : undefined }} className="truncate">
            {t?.name ?? "Assunto removido"}
          </div>
          <div className="tiny muted">
            {sub?.name} · {r.date === today ? "hoje" : fmtShortDate(r.date)}
          </div>
        </Link>
        <button className="icon-btn" aria-label="Remover revisão" onClick={() => removeReview(r.id)}>
          <Icon name="x" size={18} />
        </button>
      </div>
    );
  };

  return (
    <>
      <TopBar
        title="Revisões"
        back
        action={
          <button className="icon-btn" aria-label="Agendar revisão" onClick={() => setAdding(true)}>
            <Icon name="plus" />
          </button>
        }
      />
      <main className="page">
        <h2 className="section-title">Para hoje</h2>
        {overdue.length ? <div className="list">{overdue.map(row)}</div> : <p className="small muted">Nenhuma revisão pendente para hoje.</p>}

        <h2 className="section-title">Próximas</h2>
        {future.length ? <div className="list">{future.map(row)}</div> : <p className="small muted">Nenhuma revisão agendada.</p>}

        {suggestions.length > 0 && (
          <>
            <h2 className="section-title">Sugestões</h2>
            <div className="list">
              {suggestions.map(({ t, reason }) => (
                <div key={t.id} className="list-item">
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }} className="truncate">
                      {t.name}
                    </div>
                    <div className="tiny muted">{reason}</div>
                  </div>
                  <button className="btn btn-soft btn-sm" onClick={() => addReview(t.id, dayKey(addDays(Date.now(), 1)))}>
                    Agendar p/ amanhã
                  </button>
                </div>
              ))}
            </div>
            <p className="tiny muted">Sugestões são só sugestões: nada é agendado sem a sua confirmação.</p>
          </>
        )}

        {done.length > 0 && (
          <>
            <h2 className="section-title">Feitas recentemente</h2>
            <div className="list">{done.map(row)}</div>
          </>
        )}

        {reviews.length === 0 && suggestions.length === 0 && <Empty mood="revisao" title="Sem revisões por enquanto" text="Agende revisões a partir de um assunto ou pelo botão +." />}
      </main>
      <AddReviewSheet open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

function AddReviewSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const topics = useStore((s) => s.topics);
  const subjects = useStore((s) => s.subjects);
  const [topicId, setTopicId] = useState("");
  const [date, setDate] = useState(dayKey(addDays(Date.now(), 1)));
  return (
    <Sheet open={open} onClose={onClose} title="Agendar revisão">
      {topics.length === 0 ? (
        <p className="small muted">Crie assuntos dentro das matérias para agendar revisões.</p>
      ) : (
        <>
          <label className="field">
            <span>Assunto</span>
            <select className="select" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
              <option value="">Escolha um assunto</option>
              {subjects.map((s) => (
                <optgroup key={s.id} label={s.name}>
                  {topics
                    .filter((t) => t.subjectId === s.id)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Data</span>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <div className="row wrap">
            {[1, 3, 7, 15, 30].map((d) => (
              <button key={d} className="chip" onClick={() => setDate(dayKey(addDays(Date.now(), d)))}>
                +{d} dia{d > 1 ? "s" : ""}
              </button>
            ))}
          </div>
          <button
            className="btn btn-primary btn-block"
            disabled={!topicId || !date}
            onClick={() => {
              useStore.getState().addReview(topicId, date);
              onClose();
            }}
          >
            Agendar
          </button>
        </>
      )}
    </Sheet>
  );
}
