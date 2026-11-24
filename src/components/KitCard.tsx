import { useState } from "react";
import { useStore } from "../store";
import { BUNDLED_KIT, kitCounts } from "../lib/kit";
import { Mascot } from "./ui";

/** Oferece o plano de estudos embutido na build, enquanto ele ainda não foi carregado. */
export function KitCard({ onApplied }: { onApplied?: () => void }) {
  const applied = useStore((s) => (BUNDLED_KIT ? s.prefs.appliedKits.includes(BUNDLED_KIT.id) : true));
  const [hidden, setHidden] = useState(false);
  if (!BUNDLED_KIT || applied || hidden) return null;
  const k = BUNDLED_KIT;
  const c = kitCounts(k);
  return (
    <section className="card tint stack" style={{ background: "var(--butter)" }} aria-label="Plano de estudos pronto">
      <div className="row" style={{ alignItems: "flex-start" }}>
        <Mascot mood="conquista" size={52} />
        <div className="stack" style={{ gap: 4 }}>
          <strong style={{ fontSize: "1.05rem" }}>Seu plano está pronto para carregar</strong>
          <span className="small">{k.title}</span>
          {k.summary && <span className="small muted">{k.summary}</span>}
          <span className="tiny muted">
            {c.subjects} matérias · {c.topics} assuntos com anotações · {c.goals} metas · {c.reviews} revisões · {c.sessions} sessões já feitas
          </span>
        </div>
      </div>
      <div className="row">
        <button
          className="btn btn-primary grow"
          onClick={() => {
            useStore.getState().applyKit(k);
            onApplied?.();
          }}
        >
          Carregar meu plano
        </button>
        <button className="btn btn-ghost" onClick={() => setHidden(true)}>
          Agora não
        </button>
      </div>
    </section>
  );
}
