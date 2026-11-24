import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { Bar, Empty, Icon, Mascot, Ring } from "../components/ui";
import { addDays, fmtDuration, fmtLongDate, greeting, startOfDay, startOfWeek, streak, sumSessions, daysUntil } from "../lib/time";
import { dailyMessage, dailyTargetMin, goalProgress, reviewsDue, suggestion } from "../lib/stats";
import { useNow } from "../lib/hooks";
import { KitCard } from "../components/KitCard";
import { activeElapsed } from "../lib/time";

export default function Home() {
  const s = useStore();
  const nav = useNavigate();
  const now = useNow(s.active?.runningSince ? 1000 : 30_000);
  const firstName = s.account?.name.split(" ")[0] ?? "";

  const liveSec = s.active ? activeElapsed(s.active, now) : 0;
  const today = startOfDay(now);
  const todaySec = sumSessions(s.sessions, today, addDays(today, 1)) + liveSec;
  const weekSec = sumSessions(s.sessions, startOfWeek(now), addDays(startOfWeek(now), 7)) + liveSec;
  const target = dailyTargetMin(s.goals, s.prefs.dailyMinutes, s.prefs.studyDays, now);
  const ratio = target ? todaySec / 60 / target : 0;
  const goalDone = target !== null && target > 0 && ratio >= 1;
  const days = streak(s.sessions, now);
  const activeNotebooks = s.notebooks.filter((n) => !n.archived);
  const due = reviewsDue(s.reviews, now);
  const sug = suggestion({ topics: s.topics, subjects: s.subjects, sessions: s.sessions, errors: s.errors, reviewsDueToday: due });
  const planGoals = s.goals.filter((g) => !g.paused && g.type !== "daily_time");
  const lastNb = [...activeNotebooks].filter((n) => n.lastAccess).sort((a, b) => (b.lastAccess ?? 0) - (a.lastAccess ?? 0))[0];
  const nextExam = activeNotebooks
    .map((n) => ({ n, d: daysUntil(n.examDate) }))
    .filter((x) => x.d !== null && x.d >= 0)
    .sort((a, b) => a.d! - b.d!)[0];
  const isRestDay = target === 0 || (target === null && !s.prefs.studyDays.includes(new Date(now).getDay()));

  return (
    <main className="page" style={{ paddingTop: 20 }}>
      <header className="row between">
        <div>
          <p className="muted small">
            {fmtLongDate(new Date(now))}
          </p>
          <h1 className="big-title">
            {greeting(new Date(now))}, {firstName}!
          </h1>
        </div>
        <Link to="/perfil" className="icon-btn" aria-label="Perfil">
          <Mascot mood="foco" size={40} />
        </Link>
      </header>

      <KitCard />

      {activeNotebooks.length === 0 ? (
        <div className="card">
          <Empty mood="motivacao" title="Vamos criar seu primeiro caderno?" text="Um caderno reúne as matérias de uma prova ou objetivo. Depois é só começar a estudar.">
            <Link to="/cadernos/novo" className="btn btn-primary">
              <Icon name="plus" /> Criar caderno
            </Link>
          </Empty>
        </div>
      ) : null}

      {/* Meta do dia */}
      <section className="card tint" style={{ background: goalDone ? "var(--mint)" : "var(--lavender)" }} aria-label="Meta do dia">
        <div className="row" style={{ gap: 16 }}>
          <Ring value={target ? ratio : 0} size={112} color={goalDone ? "#1f7a63" : "#7f4fcf"} label={`Progresso da meta diária: ${Math.round(ratio * 100)}%`}>
            {goalDone ? (
              <span className="celebrate" style={{ fontSize: "1.8rem" }} aria-hidden>
                ✓
              </span>
            ) : (
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.2rem" }}>{target ? `${Math.min(999, Math.round(ratio * 100))}%` : "—"}</div>
              </div>
            )}
          </Ring>
          <div className="stack grow" style={{ gap: 4 }}>
            <span className="small" style={{ fontWeight: 700 }}>
              Meta de hoje
            </span>
            <span style={{ fontSize: "1.35rem", fontWeight: 800 }}>
              {fmtDuration(todaySec)}
              {target ? <span className="muted" style={{ fontSize: "1rem" }}> / {fmtDuration(target * 60)}</span> : null}
            </span>
            <span className="small muted">
              {target === null
                ? "Sem meta definida."
                : isRestDay
                  ? "Hoje é dia de descanso. Se quiser, uma sessão livre também conta."
                  : goalDone
                    ? "Meta concluída! Pode encerrar por hoje ou seguir no seu ritmo."
                    : `Faltam ${fmtDuration(Math.max(0, target * 60 - todaySec))}.`}
            </span>
            {target === null && (
              <Link to="/metas" className="link-btn small" style={{ alignSelf: "flex-start" }}>
                Configurar uma meta
              </Link>
            )}
          </div>
        </div>
      </section>

      <button className="btn btn-primary btn-lg btn-block" onClick={() => nav("/estudar")}>
        <Icon name="play" /> {s.active ? "Voltar à sessão em andamento" : isRestDay || target === null ? "Iniciar sessão livre" : "Começar a estudar"}
      </button>

      <div className="grid-2">
        <div className="card tint" style={{ background: "var(--sky)" }}>
          <div className="stat">
            <span className="stat-label">Nesta semana</span>
            <span className="stat-value">{fmtDuration(weekSec)}</span>
          </div>
        </div>
        <div className="card tint" style={{ background: "var(--butter)" }}>
          <div className="stat">
            <span className="stat-label">Sequência</span>
            <span className="stat-value">
              {days} {days === 1 ? "dia" : "dias"}
            </span>
            <span className="tiny">{days === 0 ? "Toda sequência começa com um dia." : "Siga no seu ritmo."}</span>
          </div>
        </div>
      </div>

      {nextExam && (
        <div className="banner">
          <Icon name="calendar" />
          <span className="small">
            <strong>{nextExam.n.name}</strong>: prova {nextExam.d === 0 ? "hoje!" : `em ${nextExam.d} dia(s).`}
          </span>
        </div>
      )}

      {/* Plano de hoje */}
      <section className="stack">
        <div className="row between">
          <h2 className="section-title">Seu plano de hoje</h2>
          <Link to="/metas" className="link-btn small">
            Metas
          </Link>
        </div>
        {planGoals.length === 0 ? (
          <div className="card small muted">
            Nenhuma meta semanal ou por matéria ainda. <Link to="/metas" className="link-btn">Criar uma meta</Link>
          </div>
        ) : (
          planGoals.slice(0, 4).map((g) => {
            const p = goalProgress(g, s.sessions, s.lists, now);
            const sub = s.subjects.find((x) => x.id === g.subjectId);
            const name = g.type === "subject_time" ? sub?.name ?? "Matéria" : g.type === "weekly_time" ? "Tempo na semana" : g.type === "weekly_questions" ? "Questões na semana" : "Assuntos na semana";
            const done = p.done >= p.target;
            return (
              <div key={g.id} className="card stack" style={{ gap: 8 }}>
                <div className="row between">
                  <span style={{ fontWeight: 700 }}>{name}</span>
                  <span className={`pill ${done ? "ok" : ""}`}>
                    {done ? "✓ " : ""}
                    {p.unit === "min" ? `${fmtDuration(p.done * 60)} / ${fmtDuration(p.target * 60)}` : `${p.done} / ${p.target} ${p.unit}`}
                  </span>
                </div>
                <Bar value={p.done / p.target} color={done ? "var(--mint)" : "var(--pink)"} label={name} />
              </div>
            );
          })
        )}
      </section>

      {lastNb && (
        <Link to={`/caderno/${lastNb.id}`} className="card card-link row">
          <div className="swatch" style={{ background: lastNb.color }}>
            {lastNb.icon}
          </div>
          <div className="grow">
            <div className="small muted">Continuar de onde parou</div>
            <div style={{ fontWeight: 800 }} className="truncate">
              {lastNb.name}
            </div>
          </div>
          <span style={{ transform: "rotate(180deg)", display: "inline-flex" }} aria-hidden>
            <Icon name="back" size={18} />
          </span>
        </Link>
      )}

      {sug && (
        <Link to={sug.to} className="card card-link row">
          <Mascot mood={sug.kind === "errors" ? "duvida" : sug.kind === "questions" ? "foco" : "revisao"} size={48} />
          <div className="grow">
            <div className="small muted">Sugestão</div>
            <div style={{ fontWeight: 700 }}>{sug.text}</div>
          </div>
        </Link>
      )}

      <div className="grid-2">
        <Link to="/erros" className="card card-link">
          <div style={{ fontWeight: 800 }}>Caderno de erros</div>
          <div className="small muted">{s.errors.filter((e) => e.status === "pendente").length} pendente(s)</div>
        </Link>
        <Link to="/revisoes" className="card card-link">
          <div style={{ fontWeight: 800 }}>Revisões</div>
          <div className="small muted">{due} para hoje</div>
        </Link>
      </div>

      <p className="center small muted" style={{ padding: "4px 0 8px" }}>
        {dailyMessage(new Date(now))}
      </p>
    </main>
  );
}
