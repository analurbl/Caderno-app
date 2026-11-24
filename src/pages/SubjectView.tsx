import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../store";
import { Bar, Empty, Icon, Sheet, TopBar, confirmAction } from "../components/ui";
import { fmtDuration, fmtShortDate, relativeDay } from "../lib/time";
import { PRIORITY_LABEL, STATUS_LABEL, subjectSeconds, topicSeconds, topicsProgress } from "../lib/stats";
import { SubjectFormSheet } from "./NotebookView";
import type { Topic } from "../types";

export const STATUS_PILL: Record<Topic["status"], string> = { nao_iniciado: "", estudando: "info", revisar: "warn", concluido: "ok" };

export default function SubjectView() {
  const { id } = useParams();
  const sub = useStore((s) => s.subjects.find((x) => x.id === id));
  const nb = useStore((s) => s.notebooks.find((n) => n.id === sub?.notebookId));
  const allTopics = useStore((s) => s.topics);
  const sessions = useStore((s) => s.sessions);
  const lists = useStore((s) => s.lists);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [menu, setMenu] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    if (sub) useStore.getState().updateSubject(sub.id, { lastAccess: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub?.id]);

  if (!sub) {
    return (
      <>
        <TopBar title="Matéria" back="/cadernos" />
        <Empty mood="duvida" title="Matéria não encontrada" />
      </>
    );
  }

  const topics = allTopics.filter((t) => t.subjectId === sub.id).sort((a, b) => a.createdAt - b.createdAt);
  const prog = topicsProgress(topics);
  const subSessions = sessions.filter((s) => s.subjectId === sub.id).sort((a, b) => b.start - a.start);
  let total = 0;
  let correct = 0;
  for (const l of lists.filter((l) => l.config.subjectId === sub.id)) {
    for (const q of l.questions) {
      const a = l.answers[q.id];
      if (a?.confirmed && a.correct !== null) {
        total++;
        if (a.correct) correct++;
      }
    }
  }
  const { updateSubject, removeSubject, moveSubject } = useStore.getState();

  return (
    <>
      <TopBar
        title={sub.name}
        back={nb ? `/caderno/${nb.id}` : "/cadernos"}
        action={
          <button className="icon-btn" aria-label="Ações da matéria" onClick={() => setMenu(true)}>
            <Icon name="more" />
          </button>
        }
      />
      <main className="page">
        <section className="card stack">
          <div className="row between">
            {nb && (
              <Link to={`/caderno/${nb.id}`} className="pill" style={{ background: nb.color, color: "#25232b", textDecoration: "none" }}>
                {nb.icon} {nb.name}
              </Link>
            )}
            <span className="pill">Prioridade {PRIORITY_LABEL[sub.priority].toLowerCase()}</span>
          </div>
          <div className="grid-2">
            <div className="stat">
              <span className="stat-label muted">Tempo total</span>
              <span className="stat-value">{fmtDuration(subjectSeconds(sessions, sub.id))}</span>
            </div>
            <div className="stat">
              <span className="stat-label muted">Acertos em questões</span>
              <span className="stat-value">{total ? `${Math.round((correct / total) * 100)}%` : "—"}</span>
              {total > 0 && <span className="tiny muted">{total} questão(ões)</span>}
            </div>
          </div>
          <div className="row between small" style={{ fontWeight: 700 }}>
            <span>Progresso dos assuntos</span>
            <span>{Math.round(prog * 100)}%</span>
          </div>
          <Bar value={prog} color={nb?.color} label="Progresso" />
          {sub.goalMinPerWeek > 0 && <span className="small muted">Meta: {fmtDuration(sub.goalMinPerWeek * 60)} por semana</span>}
        </section>

        <div className="grid-2">
          <button className="btn btn-primary" onClick={() => nav(`/estudar?materia=${sub.id}`)}>
            <Icon name="play" /> Estudar
          </button>
          <button className="btn btn-soft" onClick={() => nav(`/questoes?materia=${sub.id}`)}>
            <Icon name="spark" /> Gerar questões
          </button>
        </div>

        <h2 className="section-title">Assuntos</h2>
        {topics.length === 0 ? (
          <Empty mood="calma" title="Nenhum assunto ainda" text="Divida a matéria em assuntos para acompanhar o progresso e gerar questões mais específicas." />
        ) : (
          <div className="list">
            {topics.map((t) => (
              <Link key={t.id} to={`/assunto/${t.id}`} className="list-item card-link">
                <div className="grow" style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }} className="truncate">
                    {t.name}
                  </div>
                  <div className="tiny muted">
                    {fmtDuration(topicSeconds(sessions, t.id))}
                    {t.lastReview ? ` · revisado em ${fmtShortDate(t.lastReview)}` : ""}
                  </div>
                </div>
                <span className={`pill ${STATUS_PILL[t.status]}`}>{STATUS_LABEL[t.status]}</span>
              </Link>
            ))}
          </div>
        )}
        <button className="btn btn-soft btn-block" onClick={() => setAdding(true)}>
          <Icon name="plus" /> Adicionar assunto
        </button>

        <h2 className="section-title">Histórico de sessões</h2>
        {subSessions.length === 0 ? (
          <p className="small muted">Nenhuma sessão registrada nesta matéria.</p>
        ) : (
          <div className="list">
            {subSessions.slice(0, 8).map((s) => (
              <div key={s.id} className="list-item small">
                <Icon name="clock" size={18} />
                <span className="grow">
                  {relativeDay(s.start)} · {allTopics.find((t) => t.id === s.topicId)?.name ?? "Sessão geral"}
                </span>
                <strong>{fmtDuration(s.durationSec)}</strong>
              </div>
            ))}
            {subSessions.length > 8 && (
              <Link to="/calendario" className="link-btn small">
                Ver tudo no calendário
              </Link>
            )}
          </div>
        )}
      </main>

      <TopicFormSheet open={adding} onClose={() => setAdding(false)} subjectId={sub.id} />
      <SubjectFormSheet open={editing} onClose={() => setEditing(false)} notebookId={sub.notebookId} subjectId={sub.id} />
      <Sheet open={menu} onClose={() => setMenu(false)} title={sub.name}>
        <button
          className="btn btn-ghost btn-block"
          onClick={() => {
            setMenu(false);
            setEditing(true);
          }}
        >
          <Icon name="edit" /> Editar, definir prioridade ou mover
        </button>
        <div className="row">
          <button className="btn btn-ghost grow" onClick={() => moveSubject(sub.id, -1)}>
            <Icon name="up" /> Subir
          </button>
          <button className="btn btn-ghost grow" onClick={() => moveSubject(sub.id, 1)}>
            <Icon name="down" /> Descer
          </button>
        </div>
        <button
          className="btn btn-ghost btn-block"
          onClick={() => {
            updateSubject(sub.id, { archived: !sub.archived });
            setMenu(false);
          }}
        >
          {sub.archived ? "Desarquivar" : "Arquivar"}
        </button>
        <button
          className="btn btn-danger btn-block"
          onClick={() => {
            if (confirmAction(`Excluir "${sub.name}" e seus assuntos? O tempo estudado continua no histórico geral.`)) {
              const back = nb ? `/caderno/${nb.id}` : "/cadernos";
              removeSubject(sub.id);
              nav(back, { replace: true });
            }
          }}
        >
          <Icon name="trash" /> Excluir
        </button>
      </Sheet>
    </>
  );
}

export function TopicFormSheet({ open, onClose, subjectId }: { open: boolean; onClose: () => void; subjectId: string }) {
  const [names, setNames] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (open) {
      setNames("");
      setError("");
    }
  }, [open]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const list = names
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    if (!list.length) {
      setError("Informe ao menos um assunto.");
      return;
    }
    list.forEach((name) => useStore.getState().addTopic({ name, subjectId }));
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Novo assunto">
      <form className="stack" onSubmit={submit} noValidate>
        <label className="field">
          <span>Nome do assunto</span>
          <textarea className="textarea" style={{ minHeight: 90 }} value={names} onChange={(e) => setNames(e.target.value)} placeholder={"Ex.: Direitos e garantias fundamentais\nOrganização do Estado"} />
          <span className="hint">Dica: um assunto por linha para adicionar vários de uma vez.</span>
          {error && <span className="field-error">{error}</span>}
        </label>
        <button className="btn btn-primary btn-block" type="submit">
          Adicionar
        </button>
      </form>
    </Sheet>
  );
}
