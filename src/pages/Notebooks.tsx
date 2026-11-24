import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { Bar, Chips, Empty, Icon, Sheet, TopBar, confirmAction } from "../components/ui";
import { fmtDuration } from "../lib/time";
import { notebookSeconds, topicsProgress } from "../lib/stats";
import type { Notebook } from "../types";

type Filter = "todos" | "andamento" | "arquivados";

export default function Notebooks() {
  const notebooks = useStore((s) => s.notebooks);
  const subjects = useStore((s) => s.subjects);
  const topics = useStore((s) => s.topics);
  const sessions = useStore((s) => s.sessions);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("andamento");
  const [menu, setMenu] = useState<Notebook | null>(null);

  const list = [...notebooks]
    .sort((a, b) => a.order - b.order)
    .filter((n) => (filter === "todos" ? true : filter === "arquivados" ? n.archived : !n.archived))
    .filter((n) => n.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <TopBar
        title="Meus cadernos"
        action={
          <Link to="/cadernos/novo" className="icon-btn" aria-label="Novo caderno">
            <Icon name="plus" />
          </Link>
        }
      />
      <main className="page">
        <label className="row input" style={{ padding: "0 12px" }}>
          <Icon name="search" size={18} />
          <input aria-label="Buscar caderno" placeholder="Buscar por nome" value={q} onChange={(e) => setQ(e.target.value)} style={{ border: "none", outline: "none", background: "transparent", flex: 1, minHeight: 44 }} />
        </label>
        <Chips<Filter>
          label="Filtro"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "andamento", label: "Em andamento" },
            { value: "todos", label: "Todos" },
            { value: "arquivados", label: "Arquivados" },
          ]}
        />

        {list.length === 0 ? (
          notebooks.length === 0 ? (
            <Empty mood="motivacao" title="Nenhum caderno ainda" text="Crie um caderno para a sua prova ou objetivo e organize as matérias dentro dele.">
              <Link to="/cadernos/novo" className="btn btn-primary">
                <Icon name="plus" /> Novo caderno
              </Link>
            </Empty>
          ) : (
            <Empty mood="duvida" title="Nada por aqui" text="Nenhum caderno corresponde à busca ou ao filtro." />
          )
        ) : (
          <div className="list">
            {list.map((n) => {
              const subs = subjects.filter((s) => s.notebookId === n.id && !s.archived);
              const subIds = new Set(subs.map((s) => s.id));
              const prog = topicsProgress(topics.filter((t) => subIds.has(t.subjectId)));
              return (
                <div key={n.id} className="card row" style={{ alignItems: "stretch", padding: 0, overflow: "hidden" }}>
                  <div style={{ width: 8, background: n.color }} aria-hidden />
                  <Link to={`/caderno/${n.id}`} className="card-link grow stack" style={{ padding: 16, gap: 8 }}>
                    <div className="row">
                      <div className="swatch" style={{ background: n.color }}>
                        {n.icon}
                      </div>
                      <div className="grow" style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800 }} className="truncate">
                          {n.name}
                        </div>
                        <div className="small muted">
                          {subs.length} matéria(s) · {fmtDuration(notebookSeconds(sessions, n.id))}
                          {n.archived ? " · arquivado" : ""}
                        </div>
                      </div>
                    </div>
                    <Bar value={prog} color={n.color} label={`Progresso de ${n.name}`} />
                  </Link>
                  <button className="icon-btn" style={{ alignSelf: "center", marginRight: 6 }} aria-label={`Ações de ${n.name}`} onClick={() => setMenu(n)}>
                    <Icon name="more" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <Link to="/cadernos/novo" className="btn btn-soft btn-block">
          <Icon name="plus" /> Novo caderno
        </Link>
      </main>
      <NotebookActions notebook={menu} onClose={() => setMenu(null)} />
    </>
  );
}

export function NotebookActions({ notebook, onClose, afterDelete }: { notebook: Notebook | null; onClose: () => void; afterDelete?: () => void }) {
  const nav = useNavigate();
  const { updateNotebook, duplicateNotebook, removeNotebook, moveNotebook } = useStore.getState();
  if (!notebook) return null;
  return (
    <Sheet open={Boolean(notebook)} onClose={onClose} title={notebook.name}>
      <button className="btn btn-ghost btn-block" onClick={() => nav(`/caderno/${notebook.id}/editar`)}>
        <Icon name="edit" /> Editar
      </button>
      <div className="row">
        <button className="btn btn-ghost grow" onClick={() => moveNotebook(notebook.id, -1)}>
          <Icon name="up" /> Subir
        </button>
        <button className="btn btn-ghost grow" onClick={() => moveNotebook(notebook.id, 1)}>
          <Icon name="down" /> Descer
        </button>
      </div>
      <button
        className="btn btn-ghost btn-block"
        onClick={() => {
          const id = duplicateNotebook(notebook.id);
          onClose();
          if (id) nav(`/caderno/${id}`);
        }}
      >
        Duplicar (matérias e assuntos)
      </button>
      <button
        className="btn btn-ghost btn-block"
        onClick={() => {
          updateNotebook(notebook.id, { archived: !notebook.archived });
          onClose();
        }}
      >
        {notebook.archived ? "Desarquivar" : "Arquivar"}
      </button>
      <button
        className="btn btn-danger btn-block"
        onClick={() => {
          if (confirmAction(`Excluir "${notebook.name}" com todas as matérias e assuntos? O tempo já estudado continua no seu histórico.`)) {
            removeNotebook(notebook.id);
            onClose();
            afterDelete?.();
          }
        }}
      >
        <Icon name="trash" /> Excluir
      </button>
    </Sheet>
  );
}
