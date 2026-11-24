import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { NOTEBOOK_COLORS, NOTEBOOK_ICONS, useStore } from "../store";
import { Mascot, Sheet, TopBar } from "../components/ui";
import { Field } from "./Auth";

export default function NotebookForm() {
  const { id } = useParams();
  const existing = useStore((s) => s.notebooks.find((n) => n.id === id));
  const count = useStore((s) => s.notebooks.length);
  const objetivoPadrao = useStore((s) => s.prefs.prova || s.prefs.objetivo);
  const { addNotebook, updateNotebook } = useStore.getState();
  const nav = useNavigate();
  const [f, setF] = useState({
    name: existing?.name ?? "",
    description: existing?.description ?? "",
    color: existing?.color ?? NOTEBOOK_COLORS[count % NOTEBOOK_COLORS.length],
    icon: existing?.icon ?? NOTEBOOK_ICONS[0],
    objetivo: existing?.objetivo ?? objetivoPadrao ?? "",
    examDate: existing?.examDate ?? "",
    weeklyGoalHours: existing ? String(existing.weeklyGoalMin / 60 || "") : "",
  });
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) {
      setError("Dê um nome ao caderno.");
      return;
    }
    const data = {
      name: f.name.trim(),
      description: f.description.trim(),
      color: f.color,
      icon: f.icon,
      objetivo: f.objetivo.trim(),
      examDate: f.examDate,
      weeklyGoalMin: Math.max(0, Math.round((parseFloat(f.weeklyGoalHours.replace(",", ".")) || 0) * 60)),
    };
    if (existing) {
      updateNotebook(existing.id, data);
      nav(-1);
    } else {
      setSavedId(addNotebook(data));
    }
  };

  return (
    <>
      <TopBar title={existing ? "Editar caderno" : "Novo caderno"} back />
      <form className="page" onSubmit={submit} noValidate>
        <div className="card row" style={{ background: f.color, border: "none" }}>
          <div className="swatch" style={{ background: "rgba(255,255,255,.6)" }}>
            {f.icon}
          </div>
          <div style={{ fontWeight: 800, color: "#25232b" }} className="truncate">
            {f.name || "Nome do caderno"}
          </div>
        </div>
        <Field label="Nome do caderno" error={error}>
          <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex.: Conhecimentos específicos" autoFocus />
        </Field>
        <Field label="Descrição (opcional)">
          <textarea className="textarea" style={{ minHeight: 70 }} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
        <div className="field">
          <span className="label">Cor</span>
          <div className="row wrap" role="radiogroup" aria-label="Cor">
            {NOTEBOOK_COLORS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={f.color === c} aria-label={`Cor ${c}`} className="color-dot" style={{ background: c }} onClick={() => setF({ ...f, color: c })} />
            ))}
          </div>
        </div>
        <div className="field">
          <span className="label">Ícone</span>
          <div className="row wrap" role="radiogroup" aria-label="Ícone">
            {NOTEBOOK_ICONS.map((ic) => (
              <button key={ic} type="button" role="radio" aria-checked={f.icon === ic} className="emoji-pick" onClick={() => setF({ ...f, icon: ic })}>
                {ic}
              </button>
            ))}
          </div>
        </div>
        <Field label="Objetivo ou concurso (opcional)">
          <input className="input" value={f.objetivo} onChange={(e) => setF({ ...f, objetivo: e.target.value })} />
        </Field>
        <div className="grid-2">
          <Field label="Data da prova">
            <input className="input" type="date" value={f.examDate} onChange={(e) => setF({ ...f, examDate: e.target.value })} />
          </Field>
          <Field label="Meta semanal (h)">
            <input className="input" inputMode="decimal" placeholder="Ex.: 6" value={f.weeklyGoalHours} onChange={(e) => setF({ ...f, weeklyGoalHours: e.target.value })} />
          </Field>
        </div>
        <button className="btn btn-primary btn-lg btn-block" type="submit">
          Salvar
        </button>
      </form>

      <Sheet open={Boolean(savedId)} onClose={() => nav(`/caderno/${savedId}`, { replace: true })} title="Caderno criado!">
        <div className="row">
          <Mascot mood="conquista" size={60} />
          <p>Quer adicionar as matérias agora?</p>
        </div>
        <button className="btn btn-primary btn-block" onClick={() => nav(`/caderno/${savedId}?adicionar=1`, { replace: true })}>
          Adicionar matérias agora
        </button>
        <button className="btn btn-ghost btn-block" onClick={() => nav("/cadernos", { replace: true })}>
          Fazer isso depois
        </button>
      </Sheet>
    </>
  );
}
