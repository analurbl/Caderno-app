import { Link } from "react-router-dom";
import { useStore } from "../store";
import { PLAN_KIND, fmtSpan, planLink } from "../lib/plan";
import type { PlanItem } from "../types";
import { Icon } from "./ui";

/** Lista de blocos do cronograma de um dia, com marcar como feito e atalho para estudar. */
export function PlanBlocks({ items, canAct = true }: { items: PlanItem[]; canAct?: boolean }) {
  const subjects = useStore((s) => s.subjects);
  const topics = useStore((s) => s.topics);
  const setPlanDone = useStore((s) => s.setPlanDone);
  return (
    <div className="list">
      {items.map((p) => {
        const sub = subjects.find((x) => x.id === p.subjectId);
        const topic = topics.find((x) => x.id === p.topicId);
        const link = canAct ? planLink(p) : null;
        const kind = PLAN_KIND[p.kind];
        return (
          <div key={p.id} className="list-item" style={{ alignItems: "flex-start", opacity: p.done ? 0.65 : 1 }}>
            {p.kind !== "marco" && (
              <input
                type="checkbox"
                checked={p.done}
                onChange={(e) => setPlanDone(p.id, e.target.checked)}
                aria-label={`Marcar "${p.title}" como feito`}
                style={{ width: 22, height: 22, marginTop: 2, flexShrink: 0 }}
              />
            )}
            <div className="grow stack" style={{ gap: 3, minWidth: 0 }}>
              <div className="row wrap" style={{ gap: 6 }}>
                <span className="tiny" style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                  {fmtSpan(p)}
                </span>
                <span className={`pill ${kind.pill}`}>{kind.label}</span>
                {p.done && <span className="pill ok">✓ Feito</span>}
              </div>
              {topic ? (
                <Link to={`/assunto/${topic.id}`} style={{ fontWeight: 700, textDecoration: p.done ? "line-through" : "none" }}>
                  {p.title}
                </Link>
              ) : (
                <span style={{ fontWeight: 700, textDecoration: p.done ? "line-through" : "none" }}>{p.title}</span>
              )}
              {sub && <span className="tiny muted">{sub.name}</span>}
              {p.note && <span className="tiny muted">{p.note}</span>}
            </div>
            {link && !p.done && (
              <Link to={link} className="btn btn-soft btn-sm" aria-label={`${p.kind === "questoes" || p.kind === "simulado" ? "Praticar" : "Estudar"}: ${p.title}`}>
                <Icon name={p.kind === "questoes" || p.kind === "simulado" ? "spark" : "play"} size={16} />
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
