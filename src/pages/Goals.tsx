import { useState, type FormEvent } from "react";
import { useStore } from "../store";
import { Bar, Chips, Empty, Icon, Sheet, TopBar, confirmAction } from "../components/ui";
import { GOAL_LABEL, goalProgress } from "../lib/stats";
import { WEEKDAY_SHORT, addDays, fmtDuration, startOfDay, sumSessions } from "../lib/time";
import type { Goal, GoalType } from "../types";

export default function Goals() {
  const goals = useStore((s) => s.goals);
  const sessions = useStore((s) => s.sessions);
  const lists = useStore((s) => s.lists);
  const subjects = useStore((s) => s.subjects);
  const prefs = useStore((s) => s.prefs);
  const { updateGoal, removeGoal } = useStore.getState();
  const [editing, setEditing] = useState<Goal | "new" | null>(null);

  const daily = goals.find((g) => g.type === "daily_time" && !g.paused);
  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(), i - 6));
  const planned = (ts: number) => {
    const dow = new Date(ts).getDay();
    if (daily) return daily.days.includes(dow) ? daily.target : 0;
    return prefs.studyDays.includes(dow) ? prefs.dailyMinutes : 0;
  };
  const maxMin = Math.max(30, ...days.map((d) => Math.max(planned(d), sumSessions(sessions, d, addDays(d, 1)) / 60)));

  return (
    <>
      <TopBar
        title="Metas e planejamento"
        back
        action={
          <button className="icon-btn" aria-label="Nova meta" onClick={() => setEditing("new")}>
            <Icon name="plus" />
          </button>
        }
      />
      <main className="page">
        <section className="card stack">
          <h2 className="section-title">Planejado x realizado (7 dias)</h2>
          <div className="chart-bars" role="img" aria-label="Minutos planejados e estudados nos últimos 7 dias">
            {days.map((d) => {
              const done = sumSessions(sessions, d, addDays(d, 1)) / 60;
              const plan = planned(d);
              return (
                <div key={d} className="chart-col">
                  <span className="chart-val">{Math.round(done)}</span>
                  <div style={{ position: "relative", width: "100%", maxWidth: 34, height: "100%", display: "flex", alignItems: "flex-end" }}>
                    {plan > 0 && <div style={{ position: "absolute", left: -3, right: -3, bottom: `${(plan / maxMin) * 100}%`, borderTop: "2px dashed var(--text-2)" }} aria-hidden />}
                    <div className={`chart-bar ${d === startOfDay() ? "today" : ""}`} style={{ height: `${(done / maxMin) * 100}%`, background: plan > 0 && done >= plan ? "var(--mint)" : undefined }} />
                  </div>
                  <span className="chart-x">{WEEKDAY_SHORT[new Date(d).getDay()]}</span>
                </div>
              );
            })}
          </div>
          <p className="tiny muted">Barras: minutos estudados. Linha tracejada: minutos planejados. Dias sem linha são de descanso.</p>
        </section>

        {goals.length === 0 ? (
          <Empty mood="motivacao" title="Nenhuma meta ainda" text="Metas pequenas e realistas ajudam a manter a constância. Você pode ajustar ou pausar quando quiser.">
            <button className="btn btn-primary" onClick={() => setEditing("new")}>
              <Icon name="plus" /> Criar meta
            </button>
          </Empty>
        ) : (
          <div className="list">
            {goals.map((g) => {
              const p = goalProgress(g, sessions, lists);
              const done = p.done >= p.target;
              const sub = subjects.find((x) => x.id === g.subjectId);
              return (
                <div key={g.id} className="card stack" style={{ opacity: g.paused ? 0.6 : 1 }}>
                  <div className="row between">
                    <div>
                      <div style={{ fontWeight: 800 }}>{GOAL_LABEL[g.type]}</div>
                      <div className="small muted">
                        {sub ? `${sub.name} · ` : ""}
                        {p.unit === "min" ? fmtDuration(g.target * 60) : `${g.target} ${p.unit}`} por {g.type === "daily_time" ? "dia" : "semana"}
                        {g.type === "daily_time" ? ` · ${g.days.map((d) => WEEKDAY_SHORT[d]).join(", ")}` : ""}
                      </div>
                    </div>
                    {g.paused ? <span className="pill">Pausada</span> : done ? <span className="pill ok">✓ Cumprida</span> : null}
                  </div>
                  {!g.paused && (
                    <>
                      <Bar value={p.done / p.target} color={done ? "var(--mint)" : "var(--pink)"} label={GOAL_LABEL[g.type]} />
                      <span className="small">
                        {p.period === "hoje" ? "Hoje" : "Nesta semana"}: {p.unit === "min" ? fmtDuration(p.done * 60) : `${p.done} ${p.unit}`}
                        {!p.activeToday && " · hoje é dia de descanso"}
                      </span>
                    </>
                  )}
                  <div className="row">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(g)}>
                      Ajustar
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => updateGoal(g.id, { paused: !g.paused })}>
                      {g.paused ? "Retomar" : "Pausar"}
                    </button>
                    <button className="btn btn-ghost btn-sm" aria-label="Excluir meta" onClick={async () => (await confirmAction("Excluir esta meta?")) && removeGoal(g.id)}>
                      <Icon name="trash" size={18} />
                    </button>
                  </div>
                  {g.history.length > 1 && (
                    <span className="tiny muted">
                      Ajustada {g.history.length - 1} vez(es) · histórico preservado
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <button className="btn btn-soft btn-block" onClick={() => setEditing("new")}>
          <Icon name="plus" /> Nova meta
        </button>
        <p className="small muted center">Dica: não precisa estudar o mesmo tanto todo dia. Escolha os dias que cabem na sua rotina.</p>
      </main>
      <GoalSheet goal={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function GoalSheet({ goal, onClose }: { goal: Goal | "new" | null; onClose: () => void }) {
  const allSubjects = useStore((s) => s.subjects);
  const subjects = allSubjects.filter((x) => !x.archived);
  const prefs = useStore((s) => s.prefs);
  const existing = goal && goal !== "new" ? goal : null;
  const [type, setType] = useState<GoalType>("daily_time");
  const [target, setTarget] = useState("60");
  const [subjectId, setSubjectId] = useState("");
  const [days, setDays] = useState<number[]>(prefs.studyDays);
  const [error, setError] = useState("");
  const [lastOpen, setLastOpen] = useState<typeof goal>(null);

  if (goal !== lastOpen) {
    setLastOpen(goal);
    if (goal) {
      setType(existing?.type ?? "daily_time");
      setTarget(String(existing?.target ?? prefs.dailyMinutes ?? 60));
      setSubjectId(existing?.subjectId ?? subjects[0]?.id ?? "");
      setDays(existing?.days ?? prefs.studyDays);
      setError("");
    }
  }

  const isTime = type === "daily_time" || type === "weekly_time" || type === "subject_time";
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = parseInt(target, 10);
    if (!n || n <= 0) return setError("Informe um valor maior que zero.");
    if (type === "subject_time" && !subjectId) return setError("Escolha uma matéria.");
    if (type === "daily_time" && days.length === 0) return setError("Escolha ao menos um dia.");
    const { addGoal, updateGoal } = useStore.getState();
    const data = { type, target: n, subjectId: type === "subject_time" ? subjectId : undefined, days };
    if (existing) updateGoal(existing.id, data);
    else addGoal(data);
    onClose();
  };

  return (
    <Sheet open={Boolean(goal)} onClose={onClose} title={existing ? "Ajustar meta" : "Nova meta"}>
      <form className="stack" onSubmit={submit} noValidate>
        {!existing && (
          <div className="field">
            <span className="label">Tipo</span>
            <Chips<GoalType> label="Tipo de meta" value={type} onChange={setType} options={(Object.keys(GOAL_LABEL) as GoalType[]).map((t) => ({ value: t, label: GOAL_LABEL[t] }))} />
          </div>
        )}
        {type === "subject_time" && (
          <label className="field">
            <span>Matéria</span>
            <select className="select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {subjects.length === 0 && <option value="">Crie uma matéria primeiro</option>}
              {subjects.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          <span>{isTime ? "Minutos" : "Quantidade"}</span>
          <input className="input" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/\D/g, ""))} />
          {isTime && Number(target) > 0 && <span className="hint">= {fmtDuration(Number(target) * 60)}</span>}
        </label>
        {type === "daily_time" && (
          <div className="field">
            <span className="label">Dias da semana</span>
            <div className="chips">
              {WEEKDAY_SHORT.map((d, i) => {
                const on = days.includes(i);
                return (
                  <button key={d} type="button" aria-pressed={on} className={`chip ${on ? "chip-on" : ""}`} onClick={() => setDays(on ? days.filter((x) => x !== i) : [...days, i].sort())}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {error && <p className="field-error">{error}</p>}
        <button className="btn btn-primary btn-block" type="submit">
          Salvar
        </button>
        {existing && <p className="tiny muted">O progresso já registrado não é alterado ao ajustar a meta.</p>}
      </form>
    </Sheet>
  );
}
