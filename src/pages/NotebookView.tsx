import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useStore } from "../store";
import { Bar, Chips, Empty, Icon, Sheet, TopBar } from "../components/ui";
import { daysUntil, fmtDuration, relativeDay } from "../lib/time";
import { PRIORITY_LABEL, notebookSeconds, subjectSeconds, topicsProgress } from "../lib/stats";
import { NotebookActions } from "./Notebooks";
import type { Priority } from "../types";

export default function NotebookView() {
  const { id } = useParams();
  const nb = useStore((s) => s.notebooks.find((n) => n.id === id));
  const allSubjects = useStore((s) => s.subjects);
  const topics = useStore((s) => s.topics);
  const sessions = useStore((s) => s.sessions);
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState(params.get("adicionar") === "1");
  const [menu, setMenu] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    if (nb) useStore.getState().touchNotebook(nb.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nb?.id]);

  if (!nb) {
    return (
      <>
        <TopBar title="Caderno" back="/cadernos" />
        <Empty mood="duvida" title="Caderno não encontrado" />
      </>
    );
  }

  const subjects = allSubjects.filter((s) => s.notebookId === nb.id).sort((a, b) => a.order - b.order);
  const visible = subjects.filter((s) => showArchived || !s.archived);
  const subIds = new Set(subjects.filter((s) => !s.archived).map((s) => s.id));
  const nbTopics = topics.filter((t) => subIds.has(t.subjectId));
  const prog = topicsProgress(nbTopics);
  const exam = daysUntil(nb.examDate);

  return (
    <>
      <TopBar
        title={nb.name}
        back="/cadernos"
        action={
          <button className="icon-btn" aria-label="Ações do caderno" onClick={() => setMenu(true)}>
            <Icon name="more" />
          </button>
        }
      />
      <main className="page">
        <section className="card tint stack" style={{ background: nb.color }}>
          <div className="row">
            <div className="swatch" style={{ background: "rgba(255,255,255,.55)" }}>
              {nb.icon}
            </div>
            <div className="grow">
              <h2 style={{ fontWeight: 800, fontSize: "1.25rem" }}>{nb.name}</h2>
              {nb.objetivo && <div className="small muted">{nb.objetivo}</div>}
            </div>
          </div>
          {nb.description && <p className="small">{nb.description}</p>}
          <div className="row between small" style={{ fontWeight: 700 }}>
            <span>Progresso {Math.round(prog * 100)}%</span>
            <span>{fmtDuration(notebookSeconds(sessions, nb.id))} estudadas</span>
          </div>
          <Bar value={prog} color="rgba(37,35,43,.75)" label="Progresso do caderno" />
          {exam !== null && exam >= 0 && <span className="pill">Prova em {exam} dia(s)</span>}
        </section>

        <div className="grid-2">
          <button className="btn btn-primary" onClick={() => nav(`/estudar?caderno=${nb.id}`)}>
            <Icon name="play" /> Estudar
          </button>
          <button className="btn btn-soft" onClick={() => nav(`/questoes?caderno=${nb.id}`)}>
            <Icon name="spark" /> Gerar questões
          </button>
        </div>

        <div className="row between">
          <h2 className="section-title">Matérias</h2>
          {subjects.some((s) => s.archived) && (
            <button className="link-btn small" onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? "Ocultar arquivadas" : "Ver arquivadas"}
            </button>
          )}
        </div>

        {visible.length === 0 ? (
          <Empty mood="calma" title="Nenhuma matéria ainda" text="Adicione as disciplinas que você vai estudar neste caderno." />
        ) : (
          <div className="list">
            {visible.map((s) => {
              const ts = topics.filter((t) => t.subjectId === s.id);
              const p = topicsProgress(ts);
              return (
                <Link key={s.id} to={`/materia/${s.id}`} className="card card-link stack" style={{ gap: 8, opacity: s.archived ? 0.6 : 1 }}>
                  <div className="row between">
                    <span style={{ fontWeight: 800 }} className="truncate">
                      {s.name}
                    </span>
                    {s.priority === "alta" && <span className="pill bad">Prioridade alta</span>}
                    {s.archived && <span className="pill">Arquivada</span>}
                  </div>
                  <div className="small muted">
                    {ts.length} assunto(s) · {fmtDuration(subjectSeconds(sessions, s.id))} · último acesso {relativeDay(s.lastAccess)}
                  </div>
                  <Bar value={p} color={nb.color} label={`Progresso de ${s.name}`} />
                </Link>
              );
            })}
          </div>
        )}
        <button className="btn btn-soft btn-block" onClick={() => setAdding(true)}>
          <Icon name="plus" /> Adicionar matéria
        </button>
      </main>

      <SubjectFormSheet
        open={adding}
        notebookId={nb.id}
        onClose={() => {
          setAdding(false);
          if (params.get("adicionar")) setParams({}, { replace: true });
        }}
      />
      <NotebookActions notebook={menu ? nb : null} onClose={() => setMenu(false)} afterDelete={() => nav("/cadernos", { replace: true })} />
    </>
  );
}

export function SubjectFormSheet({ open, onClose, notebookId, subjectId }: { open: boolean; onClose: () => void; notebookId: string; subjectId?: string }) {
  const existing = useStore((s) => s.subjects.find((x) => x.id === subjectId));
  const notebooks = useStore((s) => s.notebooks);
  const { addSubject, updateSubject } = useStore.getState();
  const [name, setName] = useState("");
  const [priority, setPriority] = useState<Priority>("media");
  const [goalH, setGoalH] = useState("");
  const [nbId, setNbId] = useState(notebookId);
  const [error, setError] = useState("");
  const [addedCount, setAddedCount] = useState(0);

  useEffect(() => {
    if (!open) return;
    setName(existing?.name ?? "");
    setPriority(existing?.priority ?? "media");
    setGoalH(existing?.goalMinPerWeek ? String(existing.goalMinPerWeek / 60) : "");
    setNbId(existing?.notebookId ?? notebookId);
    setError("");
    setAddedCount(0);
  }, [open, existing, notebookId]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Informe o nome da matéria.");
      return;
    }
    const goalMinPerWeek = Math.round((parseFloat(goalH.replace(",", ".")) || 0) * 60);
    if (existing) {
      updateSubject(existing.id, { name: name.trim(), priority, goalMinPerWeek, notebookId: nbId });
      onClose();
    } else {
      addSubject({ name: name.trim(), priority, goalMinPerWeek, notebookId });
      setAddedCount((c) => c + 1);
      setName("");
      setError("");
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={existing ? "Editar matéria" : "Nova matéria"}>
      <form className="stack" onSubmit={submit} noValidate>
        <label className="field">
          <span>Nome</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Direito Constitucional" />
          {error && <span className="field-error">{error}</span>}
        </label>
        <div className="field">
          <span className="label">Prioridade</span>
          <Chips<Priority> label="Prioridade" value={priority} onChange={setPriority} options={(["baixa", "media", "alta"] as Priority[]).map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))} />
        </div>
        <label className="field">
          <span>Meta semanal de tempo (h, opcional)</span>
          <input className="input" inputMode="decimal" value={goalH} onChange={(e) => setGoalH(e.target.value)} />
        </label>
        {existing && (
          <label className="field">
            <span>Caderno</span>
            <select className="select" value={nbId} onChange={(e) => setNbId(e.target.value)}>
              {notebooks.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {addedCount > 0 && (
          <p className="small" role="status" style={{ color: "var(--ok)", fontWeight: 700 }}>
            ✓ {addedCount} matéria(s) adicionada(s). Adicione outra ou feche.
          </p>
        )}
        <button className="btn btn-primary btn-block" type="submit">
          {existing ? "Salvar" : "Adicionar"}
        </button>
        {!existing && addedCount > 0 && (
          <button type="button" className="btn btn-ghost btn-block" onClick={onClose}>
            Concluir
          </button>
        )}
      </form>
    </Sheet>
  );
}
