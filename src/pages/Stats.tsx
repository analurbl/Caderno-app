import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { Bar, Chips, Empty, TopBar } from "../components/ui";
import { WEEKDAY_SHORT, addDays, fmtDuration, fmtShortDate, secondsByDay, startOfDay, startOfMonth, startOfWeek, sumSessions, dayKey } from "../lib/time";
import { answeredQuestionsBetween, goalProgress, performanceByTopic } from "../lib/stats";

type Period = "semana" | "mes" | "total";

export default function Stats() {
  const s = useStore();
  const [period, setPeriod] = useState<Period>("semana");
  const now = Date.now();
  const from = period === "semana" ? startOfWeek(now) : period === "mes" ? startOfMonth(now) : 0;
  const to = addDays(startOfDay(now), 1);
  const inPeriod = s.sessions.filter((x) => x.start >= from && x.start < to);
  const listsInPeriod = s.lists.filter((l) => (l.finishedAt ?? l.createdAt) >= from);

  const today = sumSessions(s.sessions, startOfDay(now), to);
  const week = sumSessions(s.sessions, startOfWeek(now), to);
  const month = sumSessions(s.sessions, startOfMonth(now), to);
  const total = sumSessions(s.sessions, 0, to);
  const activeDays = new Set(inPeriod.map((x) => dayKey(x.start))).size;
  const q = answeredQuestionsBetween(s.lists, from, Infinity);
  const goalsDone = s.goals.filter((g) => !g.paused).filter((g) => {
    const p = goalProgress(g, s.sessions, s.lists, now);
    return p.done >= p.target;
  }).length;

  // Tempo por matéria e caderno
  const bySubject = new Map<string, number>();
  const byNotebook = new Map<string, number>();
  for (const x of inPeriod) {
    const k = x.subjectId ?? "_";
    bySubject.set(k, (bySubject.get(k) ?? 0) + x.durationSec);
    const n = x.notebookId ?? "_";
    byNotebook.set(n, (byNotebook.get(n) ?? 0) + x.durationSec);
  }
  const subjectRows = [...bySubject.entries()].sort((a, b) => b[1] - a[1]);
  const maxSub = Math.max(1, ...subjectRows.map((r) => r[1]));
  const nbRows = [...byNotebook.entries()].sort((a, b) => b[1] - a[1]);

  // Últimos 14 dias
  const byDay = secondsByDay(s.sessions);
  const days = Array.from({ length: 14 }, (_, i) => addDays(startOfDay(now), i - 13));
  const maxDay = Math.max(60, ...days.map((d) => byDay.get(dayKey(d)) ?? 0));

  // Acertos por matéria
  const subjQ = new Map<string, { t: number; c: number }>();
  for (const l of listsInPeriod) {
    const key = l.config.subjectId ?? "_";
    for (const qq of l.questions) {
      const a = l.answers[qq.id];
      if (!a?.confirmed || a.correct === null) continue;
      const cur = subjQ.get(key) ?? { t: 0, c: 0 };
      cur.t++;
      if (a.correct) cur.c++;
      subjQ.set(key, cur);
    }
  }

  // Evolução: aproveitamento por lista finalizada (últimas 10)
  const evolution = s.lists
    .filter((l) => l.finishedAt)
    .sort((a, b) => a.finishedAt! - b.finishedAt!)
    .slice(-10)
    .map((l) => {
      const graded = l.questions.filter((x) => l.answers[x.id]?.confirmed && l.answers[x.id]?.correct !== null);
      return { id: l.id, at: l.finishedAt!, pct: graded.length ? graded.filter((x) => l.answers[x.id]?.correct).length / graded.length : 0, n: graded.length };
    })
    .filter((e) => e.n > 0);

  const perf = performanceByTopic(listsInPeriod).filter((p) => p.total >= 2);
  const best = [...perf].sort((a, b) => b.correct / b.total - a.correct / a.total).slice(0, 3);
  const worst = [...perf].sort((a, b) => a.correct / a.total - b.correct / b.total).slice(0, 3);

  const subName = (id: string) => (id === "_" ? "Sessão livre" : s.subjects.find((x) => x.id === id)?.name ?? "Matéria removida");
  const nbName = (id: string) => (id === "_" ? "Sem caderno" : s.notebooks.find((x) => x.id === id)?.name ?? "Caderno removido");

  return (
    <>
      <TopBar title="Estatísticas" back />
      <main className="page">
        <div className="grid-2">
          {[
            ["Hoje", today, "var(--lavender)"],
            ["Nesta semana", week, "var(--sky)"],
            ["Neste mês", month, "var(--pink)"],
            ["Total", total, "var(--butter)"],
          ].map(([label, v, bg]) => (
            <div key={label as string} className="card tint stat" style={{ background: bg as string }}>
              <span className="stat-label">{label}</span>
              <span className="stat-value">{fmtDuration(v as number)}</span>
            </div>
          ))}
        </div>

        <section className="card stack">
          <div className="row between">
            <h2 className="section-title">Últimos 14 dias</h2>
            <Link to="/calendario" className="link-btn small">
              Calendário
            </Link>
          </div>
          <div className="chart-bars" role="img" aria-label="Minutos estudados por dia nos últimos 14 dias" style={{ gap: 4 }}>
            {days.map((d) => {
              const v = byDay.get(dayKey(d)) ?? 0;
              return (
                <div key={d} className="chart-col" title={`${fmtShortDate(d)}: ${fmtDuration(v)}`}>
                  <div className={`chart-bar ${d === startOfDay(now) ? "today" : ""}`} style={{ height: `${(v / maxDay) * 100}%` }} />
                  <span className="chart-x" style={{ fontSize: "0.6rem" }}>
                    {WEEKDAY_SHORT[new Date(d).getDay()][0]}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="tiny muted">Cada barra é um dia (de {fmtShortDate(days[0])} a hoje). Altura = minutos estudados.</p>
        </section>

        <Chips<Period>
          label="Período"
          value={period}
          onChange={setPeriod}
          options={[
            { value: "semana", label: "Semana" },
            { value: "mes", label: "Mês" },
            { value: "total", label: "Tudo" },
          ]}
        />

        <div className="grid-2">
          <div className="card stat">
            <span className="stat-label muted">Dias ativos</span>
            <span className="stat-value">{activeDays}</span>
          </div>
          <div className="card stat">
            <span className="stat-label muted">Metas cumpridas agora</span>
            <span className="stat-value">
              {goalsDone}/{s.goals.filter((g) => !g.paused).length}
            </span>
          </div>
          <div className="card stat">
            <span className="stat-label muted">Questões resolvidas</span>
            <span className="stat-value">{q.total}</span>
          </div>
          <div className="card stat">
            <span className="stat-label muted">Acertos</span>
            <span className="stat-value">{q.total ? `${Math.round((q.correct / q.total) * 100)}%` : "—"}</span>
          </div>
        </div>

        <section className="card stack">
          <h2 className="section-title">Tempo por matéria</h2>
          {subjectRows.length === 0 ? (
            <p className="small muted">Nenhuma sessão neste período.</p>
          ) : (
            subjectRows.map(([id, sec]) => (
              <div key={id} className="stack" style={{ gap: 4 }}>
                <div className="row between small">
                  <span className="truncate">{subName(id)}</span>
                  <strong>{fmtDuration(sec)}</strong>
                </div>
                <Bar value={sec / maxSub} color="var(--sky)" label={subName(id)} />
              </div>
            ))
          )}
        </section>

        {nbRows.length > 0 && (
          <section className="card stack">
            <h2 className="section-title">Tempo por caderno</h2>
            {nbRows.map(([id, sec]) => (
              <div key={id} className="row between small">
                <span className="truncate">{nbName(id)}</span>
                <strong>{fmtDuration(sec)}</strong>
              </div>
            ))}
          </section>
        )}

        <section className="card stack">
          <h2 className="section-title">Acertos por matéria</h2>
          {subjQ.size === 0 ? (
            <p className="small muted">Resolva questões para ver seu desempenho.</p>
          ) : (
            [...subjQ.entries()].map(([id, v]) => (
              <div key={id} className="stack" style={{ gap: 4 }}>
                <div className="row between small">
                  <span className="truncate">{id === "_" ? "Sem matéria" : subName(id)}</span>
                  <strong>
                    {Math.round((v.c / v.t) * 100)}% <span className="muted">({v.t})</span>
                  </strong>
                </div>
                <Bar value={v.c / v.t} color={v.c / v.t >= 0.7 ? "var(--mint)" : v.c / v.t >= 0.5 ? "var(--butter)" : "var(--coral)"} label={subName(id)} />
              </div>
            ))
          )}
        </section>

        {evolution.length >= 2 && (
          <section className="card stack">
            <h2 className="section-title">Evolução do aproveitamento</h2>
            <EvolutionChart points={evolution.map((e) => e.pct)} />
            <p className="tiny muted">Aproveitamento nas últimas {evolution.length} listas finalizadas, da mais antiga (esquerda) à mais recente.</p>
          </section>
        )}

        {perf.length > 0 ? (
          <section className="card stack">
            <h2 className="section-title">Assuntos</h2>
            <div className="small">
              <strong>Melhor desempenho:</strong> {best.map((p) => `${p.assunto} (${p.correct}/${p.total})`).join(", ")}
            </div>
            <div className="small">
              <strong>Precisam de reforço:</strong> {worst.map((p) => `${p.assunto} (${p.correct}/${p.total})`).join(", ")}
            </div>
            <p className="tiny muted">Considerando assuntos com pelo menos 2 questões respondidas.</p>
          </section>
        ) : (
          s.sessions.length === 0 && <Empty mood="calma" title="Seus números aparecem aqui" text="Registre sessões de estudo e resolva questões para acompanhar sua evolução." />
        )}
      </main>
    </>
  );
}

function EvolutionChart({ points }: { points: number[] }) {
  const w = 300;
  const h = 110;
  const pad = 10;
  const step = (w - pad * 2) / Math.max(1, points.length - 1);
  const xy = points.map((p, i) => [pad + i * step, h - pad - p * (h - pad * 2)] as const);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={`Aproveitamento: ${points.map((p) => `${Math.round(p * 100)}%`).join(", ")}`}>
      {[0, 0.5, 1].map((g) => (
        <g key={g}>
          <line x1={pad} x2={w - pad} y1={h - pad - g * (h - pad * 2)} y2={h - pad - g * (h - pad * 2)} stroke="var(--border)" strokeDasharray="3 4" />
          <text x={w - pad} y={h - pad - g * (h - pad * 2) - 3} fontSize="9" textAnchor="end" fill="var(--text-2)">
            {g * 100}%
          </text>
        </g>
      ))}
      <polyline points={xy.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--lilac-strong)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {xy.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="var(--surface)" stroke="var(--lilac-strong)" strokeWidth="2" />
      ))}
    </svg>
  );
}
