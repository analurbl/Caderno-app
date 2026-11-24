import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { Chips, Mascot } from "../components/ui";
import { KitCard } from "../components/KitCard";
import { WEEKDAY_SHORT, fmtDuration } from "../lib/time";
import type { Preferences } from "../types";

const OBJETIVOS = ["Concurso público", "Faculdade", "Residência", "Certificação", "Estudo livre"];
const BANCAS: { value: Preferences["banca"]; label: string }[] = [
  { value: "FGV", label: "FGV" },
  { value: "AOCP", label: "AOCP" },
  { value: "Instituto Avalia", label: "Instituto Avalia" },
  { value: "Outra", label: "Outra" },
  { value: "nao_sei", label: "Ainda não sei" },
];
const SUGESTOES = ["Língua Portuguesa", "Direito Constitucional", "Direito Administrativo", "Raciocínio Lógico", "Informática", "Conhecimentos Específicos"];

export default function Setup() {
  const prefs = useStore((s) => s.prefs);
  const { setPrefs, addNotebook, addSubject } = useStore.getState();
  const name = useStore((s) => s.account?.name.split(" ")[0] ?? "");
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState({ ...prefs });
  const [materias, setMaterias] = useState<string[]>([]);
  const [custom, setCustom] = useState("");

  const finish = (save: boolean) => {
    if (save) {
      setPrefs({ ...draft, setupDone: true });
      if (materias.length) {
        const nbId = addNotebook({ name: draft.prova.trim() || draft.objetivo || "Meu caderno", objetivo: draft.objetivo });
        materias.forEach((m) => addSubject({ name: m, notebookId: nbId }));
      }
    } else {
      setPrefs({ setupDone: true });
    }
    nav("/", { replace: true });
  };

  const steps = [
    {
      title: `Olá, ${name}! Qual é seu objetivo?`,
      mood: "motivacao" as const,
      body: (
        <>
          <Chips label="Objetivo" options={OBJETIVOS.map((o) => ({ value: o, label: o }))} value={draft.objetivo} onChange={(v) => setDraft({ ...draft, objetivo: v })} />
          <label className="field">
            <span>Qual prova ou concurso? (opcional)</span>
            <input className="input" placeholder="Ex.: TRT 2ª Região — Analista" value={draft.prova} onChange={(e) => setDraft({ ...draft, prova: e.target.value })} />
          </label>
        </>
      ),
    },
    {
      title: "Qual banca deseja priorizar?",
      mood: "foco" as const,
      body: (
        <>
          <Chips label="Banca" options={BANCAS} value={draft.banca} onChange={(v) => setDraft({ ...draft, banca: v })} />
          <p className="small muted">Ela vem pré-selecionada ao gerar questões. Dá para trocar a qualquer momento.</p>
        </>
      ),
    },
    {
      title: "Quanto tempo pretende estudar por dia?",
      mood: "calma" as const,
      body: (
        <>
          <Chips
            label="Minutos por dia"
            options={[30, 60, 90, 120, 180, 240].map((m) => ({ value: m, label: fmtDuration(m * 60) }))}
            value={draft.dailyMinutes}
            onChange={(v) => setDraft({ ...draft, dailyMinutes: v })}
          />
          <span className="label">Em quais dias costuma estudar?</span>
          <div className="chips" role="group" aria-label="Dias de estudo">
            {WEEKDAY_SHORT.map((d, i) => {
              const on = draft.studyDays.includes(i);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  className={`chip ${on ? "chip-on" : ""}`}
                  onClick={() => setDraft({ ...draft, studyDays: on ? draft.studyDays.filter((x) => x !== i) : [...draft.studyDays, i].sort() })}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <p className="small muted">Os outros dias contam como descanso — sem cobrança.</p>
        </>
      ),
    },
    {
      title: "Quais matérias quer adicionar primeiro?",
      mood: "conquista" as const,
      body: (
        <>
          <div className="chips" role="group" aria-label="Matérias sugeridas">
            {[...new Set([...SUGESTOES, ...materias])].map((m) => {
              const on = materias.includes(m);
              return (
                <button key={m} type="button" aria-pressed={on} className={`chip ${on ? "chip-on" : ""}`} onClick={() => setMaterias(on ? materias.filter((x) => x !== m) : [...materias, m])}>
                  {m}
                </button>
              );
            })}
          </div>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              const v = custom.trim();
              if (v && !materias.includes(v)) setMaterias([...materias, v]);
              setCustom("");
            }}
          >
            <input className="input grow" placeholder="Outra matéria" value={custom} onChange={(e) => setCustom(e.target.value)} />
            <button className="btn btn-soft" type="submit">
              Adicionar
            </button>
          </form>
          <p className="small muted">Criaremos um caderno com essas matérias. Você pode reorganizar depois.</p>
        </>
      ),
    },
  ];

  const s = steps[step];
  return (
    <main className="page" style={{ paddingTop: 24, minHeight: "100dvh" }}>
      <div className="row between">
        <span className="small muted">
          Passo {step + 1} de {steps.length}
        </span>
        <button className="link-btn" onClick={() => finish(false)}>
          Pular configuração
        </button>
      </div>
      <div className="row" style={{ gap: 6 }} aria-hidden>
        {steps.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 6, borderRadius: 9, background: i <= step ? "var(--lilac)" : "var(--track)" }} />
        ))}
      </div>
      {step === 0 && <KitCard onApplied={() => nav("/", { replace: true })} />}
      <Mascot mood={s.mood} size={76} />
      <h1 className="big-title">{s.title}</h1>
      <div className="stack">{s.body}</div>
      <div className="row" style={{ marginTop: "auto", paddingBottom: 16 }}>
        {step > 0 && (
          <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>
            Voltar
          </button>
        )}
        <button className="btn btn-primary grow btn-lg" onClick={() => (step < steps.length - 1 ? setStep(step + 1) : finish(true))}>
          {step < steps.length - 1 ? "Continuar" : "Começar"}
        </button>
      </div>
    </main>
  );
}
