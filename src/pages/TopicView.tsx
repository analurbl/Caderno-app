import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../store";
import { Chips, Empty, Icon, TopBar, askText, confirmAction } from "../components/ui";
import { addDays, dayKey, fmtDuration, fmtShortDate } from "../lib/time";
import { STATUS_LABEL, topicSeconds } from "../lib/stats";
import { PlanBlocks } from "../components/PlanBlocks";
import type { TopicStatus } from "../types";

export default function TopicView() {
  const { id } = useParams();
  const topic = useStore((s) => s.topics.find((t) => t.id === id));
  const sub = useStore((s) => s.subjects.find((x) => x.id === topic?.subjectId));
  const sessions = useStore((s) => s.sessions);
  const allReviews = useStore((s) => s.reviews);
  const plan = useStore((s) => s.plan);
  const errors = useStore((s) => s.errors);
  const reviews = allReviews.filter((r) => r.topicId === id);
  const saved = errors.filter((e) => e.subjectId === topic?.subjectId && e.question.assunto.toLowerCase() === topic?.name.toLowerCase());
  const { updateTopic, removeTopic, addReview, toggleReview, removeReview } = useStore.getState();
  const nav = useNavigate();
  const [notes, setNotes] = useState(topic?.notes ?? "");
  const [link, setLink] = useState("");
  const [reviewDate, setReviewDate] = useState(dayKey(addDays(Date.now(), 7)));
  const [savedMsg, setSavedMsg] = useState("");

  // Salvamento automático das anotações.
  useEffect(() => {
    if (!topic || notes === topic.notes) return;
    const t = window.setTimeout(() => {
      updateTopic(topic.id, { notes });
      setSavedMsg("Anotações salvas");
    }, 600);
    return () => window.clearTimeout(t);
  }, [notes, topic, updateTopic]);

  if (!topic) {
    return (
      <>
        <TopBar title="Assunto" back="/cadernos" />
        <Empty mood="duvida" title="Assunto não encontrado" />
      </>
    );
  }

  const rename = async () => {
    const name = await askText("Nome do assunto", topic.name);
    if (name?.trim()) updateTopic(topic.id, { name: name.trim() });
  };
  const editDescription = async () => {
    const d = await askText("Descrição", topic.description, { multiline: true });
    if (d !== null) updateTopic(topic.id, { description: d.trim() });
  };

  return (
    <>
      <TopBar
        title={topic.name}
        back={sub ? `/materia/${sub.id}` : "/cadernos"}
        action={
          <button className="icon-btn" aria-label="Renomear assunto" onClick={rename}>
            <Icon name="edit" />
          </button>
        }
      />
      <main className="page">
        <section className="card stack">
          {sub && (
            <Link to={`/materia/${sub.id}`} className="small muted" style={{ textDecoration: "none" }}>
              {sub.name}
            </Link>
          )}
          <button className="link-btn small" style={{ textAlign: "left", color: topic.description ? "var(--text)" : undefined, fontWeight: topic.description ? 500 : 700 }} onClick={editDescription}>
            {topic.description || "+ Adicionar descrição"}
          </button>
          <div className="grid-2">
            <div className="stat">
              <span className="stat-label muted">Tempo dedicado</span>
              <span className="stat-value">{fmtDuration(topicSeconds(sessions, topic.id))}</span>
            </div>
            <div className="stat">
              <span className="stat-label muted">Última revisão</span>
              <span className="stat-value">{topic.lastReview ? fmtShortDate(topic.lastReview) : "—"}</span>
            </div>
          </div>
          <span className="label">Status</span>
          <Chips<TopicStatus>
            label="Status do assunto"
            value={topic.status}
            onChange={(status) => updateTopic(topic.id, { status })}
            options={(Object.keys(STATUS_LABEL) as TopicStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
          />
        </section>

        <div className="grid-2">
          <button className="btn btn-primary" onClick={() => nav(`/estudar?assunto=${topic.id}`)}>
            <Icon name="play" /> Estudar
          </button>
          <button className="btn btn-soft" onClick={() => nav(`/questoes?assunto=${topic.id}`)}>
            <Icon name="spark" /> Questões
          </button>
        </div>

        <section className="stack">
          <div className="row between">
            <h2 className="section-title">Anotações</h2>
            <span className="tiny muted" role="status">
              {savedMsg}
            </span>
          </div>
          <textarea
            className="textarea"
            style={{ minHeight: 180 }}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setSavedMsg("");
            }}
            placeholder="Escreva aqui seus resumos, conceitos-chave e pontos de atenção. Eles podem ser usados como base para gerar questões."
            aria-label="Anotações do assunto"
          />
        </section>

        <section className="stack">
          <h2 className="section-title">Links e materiais</h2>
          {topic.links.map((l, i) => (
            <div key={i} className="list-item small">
              <Icon name="link" size={18} />
              <a href={/^https?:\/\//.test(l) ? l : `https://${l}`} target="_blank" rel="noreferrer noopener" className="grow truncate">
                {l}
              </a>
              <button className="icon-btn" aria-label={`Remover ${l}`} onClick={() => updateTopic(topic.id, { links: topic.links.filter((_, j) => j !== i) })}>
                <Icon name="x" size={18} />
              </button>
            </div>
          ))}
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              if (link.trim()) updateTopic(topic.id, { links: [...topic.links, link.trim()] });
              setLink("");
            }}
          >
            <input className="input grow" placeholder="Colar link (vídeo, lei, artigo...)" value={link} onChange={(e) => setLink(e.target.value)} aria-label="Novo link" />
            <button className="btn btn-soft" type="submit">
              Adicionar
            </button>
          </form>
          <p className="tiny muted">Anexo de arquivos (PDF e outros) chega em uma próxima versão.</p>
        </section>

        {plan.some((p) => p.topicId === topic.id) && (
          <section className="stack">
            <h2 className="section-title">No cronograma</h2>
            <PlanBlocks items={plan.filter((p) => p.topicId === topic.id).sort((a, b) => a.date.localeCompare(b.date))} canAct={false} />
            <span className="tiny muted">
              {plan
                .filter((p) => p.topicId === topic.id)
                .map((p) => fmtShortDate(p.date))
                .join(", ")}
            </span>
          </section>
        )}

        <section className="stack">
          <h2 className="section-title">Revisões</h2>
          {reviews
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((r) => (
              <div key={r.id} className="list-item small">
                <input type="checkbox" checked={r.done} onChange={() => toggleReview(r.id)} aria-label={`Revisão de ${fmtShortDate(r.date)} feita`} style={{ width: 22, height: 22 }} />
                <span className="grow" style={{ textDecoration: r.done ? "line-through" : undefined }}>
                  Revisar em {fmtShortDate(r.date)}
                </span>
                <button className="icon-btn" aria-label="Remover revisão" onClick={() => removeReview(r.id)}>
                  <Icon name="x" size={18} />
                </button>
              </div>
            ))}
          <div className="row">
            <input className="input grow" type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} aria-label="Data da revisão" />
            <button className="btn btn-soft" onClick={() => reviewDate && addReview(topic.id, reviewDate)}>
              Agendar
            </button>
          </div>
        </section>

        <section className="stack">
          <h2 className="section-title">Questões salvas</h2>
          {saved.length === 0 ? (
            <p className="small muted">Questões deste assunto salvas no caderno de erros aparecem aqui.</p>
          ) : (
            <Link to="/erros" className="list-item card-link small">
              <span className="grow">{saved.length} questão(ões) no caderno de erros</span>
              <span style={{ transform: "rotate(180deg)", display: "inline-flex" }} aria-hidden>
                <Icon name="back" size={18} />
              </span>
            </Link>
          )}
        </section>

        <button
          className="btn btn-danger btn-block"
          onClick={async () => {
            if (await confirmAction(`Excluir o assunto "${topic.name}"? Anotações e revisões serão removidas.`)) {
              removeTopic(topic.id);
              nav(sub ? `/materia/${sub.id}` : "/cadernos", { replace: true });
            }
          }}
        >
          <Icon name="trash" /> Excluir assunto
        </button>
      </main>
    </>
  );
}
