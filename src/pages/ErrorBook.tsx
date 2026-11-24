import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { Chips, Empty, Icon, Sheet, Toggle, TopBar, confirmAction } from "../components/ui";
import { relativeDay, uid } from "../lib/time";
import { BANCAS, bancaName } from "./QuestionsHub";
import { Feedback } from "./QuestionRun";
import type { Banca, ErrorEntry, QuestionList } from "../types";

type StatusFilter = "pendente" | "revisada" | "dominada" | "todas";

export default function ErrorBook() {
  const errors = useStore((s) => s.errors);
  const notebooks = useStore((s) => s.notebooks);
  const subjects = useStore((s) => s.subjects);
  const autoSave = useStore((s) => s.prefs.autoSaveErrors);
  const { updateError, removeError, setPrefs } = useStore.getState();
  const nav = useNavigate();
  const [status, setStatus] = useState<StatusFilter>("pendente");
  const [nb, setNb] = useState("");
  const [sub, setSub] = useState("");
  const [assunto, setAssunto] = useState("");
  const [banca, setBanca] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const filtered = errors
    .filter((e) => status === "todas" || e.status === status)
    .filter((e) => !nb || e.notebookId === nb)
    .filter((e) => !sub || e.subjectId === sub)
    .filter((e) => !assunto || e.question.assunto === assunto)
    .filter((e) => !banca || e.banca === banca)
    .sort((a, b) => b.addedAt - a.addedAt);
  const assuntos = [...new Set(errors.filter((e) => !sub || e.subjectId === sub).map((e) => e.question.assunto))].filter(Boolean);

  const toggleSel = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const redo = () => {
    const chosen = selected.size ? errors.filter((e) => selected.has(e.id)) : filtered;
    if (!chosen.length) return;
    const first = chosen[0];
    const list: QuestionList = {
      id: uid(),
      title: "Refazer · caderno de erros",
      config: {
        banca: first.banca,
        bancaOutra: first.bancaOutra,
        quantidade: chosen.length,
        dificuldade: "mista",
        formato: "multipla",
        modo: "treino",
        incluirComentarios: true,
        priorizarFracos: false,
        notebookId: nb || undefined,
        subjectId: sub || undefined,
        topicIds: [],
        fonte: "assuntos",
      },
      questions: chosen.map((e) => e.question),
      answers: {},
      aviso: "",
      createdAt: Date.now(),
      totalSec: 0,
      current: 0,
      origin: "refazer",
    };
    useStore.getState().addList(list);
    chosen.forEach((e) => e.status === "pendente" && updateError(e.id, { status: "revisada" }));
    nav(`/questoes/lista/${list.id}`);
  };

  return (
    <>
      <TopBar
        title="Caderno de erros"
        back
        action={
          <button className="icon-btn" aria-label="Adicionar questão manualmente" onClick={() => setAdding(true)}>
            <Icon name="plus" />
          </button>
        }
      />
      <main className="page">
        <Chips<StatusFilter>
          label="Status"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setSelected(new Set());
          }}
          options={[
            { value: "pendente", label: `Pendentes (${errors.filter((e) => e.status === "pendente").length})` },
            { value: "revisada", label: "Revisadas" },
            { value: "dominada", label: "Dominadas" },
            { value: "todas", label: "Todas" },
          ]}
        />
        <div className="grid-2">
          <select className="select" aria-label="Filtrar por caderno" value={nb} onChange={(e) => { setNb(e.target.value); setSub(""); setAssunto(""); }}>
            <option value="">Todos os cadernos</option>
            {notebooks.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
          <select className="select" aria-label="Filtrar por matéria" value={sub} onChange={(e) => { setSub(e.target.value); setAssunto(""); }}>
            <option value="">Todas as matérias</option>
            {subjects
              .filter((x) => !nb || x.notebookId === nb)
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
          </select>
          <select className="select" aria-label="Filtrar por assunto" value={assunto} onChange={(e) => setAssunto(e.target.value)}>
            <option value="">Todos os assuntos</option>
            {assuntos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select className="select" aria-label="Filtrar por banca" value={banca} onChange={(e) => setBanca(e.target.value)}>
            <option value="">Todas as bancas</option>
            {BANCAS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <Empty
            mood={errors.length ? "calma" : "revisao"}
            title={errors.length ? "Nada com esses filtros" : "Seu caderno de erros está vazio"}
            text={errors.length ? undefined : "Questões que você errar podem ser salvas aqui para revisar depois. Errar faz parte de aprender."}
          />
        ) : (
          <>
            <button className="btn btn-primary btn-block" onClick={redo}>
              <Icon name="refresh" /> Refazer {selected.size ? `${selected.size} selecionada(s)` : `as ${filtered.length} questões filtradas`}
            </button>
            <div className="list">
              {filtered.map((e) => (
                <ErrorCard key={e.id} e={e} selected={selected.has(e.id)} onSelect={() => toggleSel(e.id)} open={open === e.id} onToggle={() => setOpen(open === e.id ? null : e.id)} subjectName={subjects.find((x) => x.id === e.subjectId)?.name} onUpdate={(p) => updateError(e.id, p)} onRemove={() => confirmAction("Remover esta questão do caderno de erros?") && removeError(e.id)} />
              ))}
            </div>
          </>
        )}

        <div className="card">
          <Toggle checked={autoSave} onChange={(v) => setPrefs({ autoSaveErrors: v })} label="Salvar questões erradas automaticamente" hint="Ao encerrar uma lista, as erradas entram aqui." />
        </div>
      </main>
      <ManualSheet open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

function ErrorCard({ e, selected, onSelect, open, onToggle, subjectName, onUpdate, onRemove }: { e: ErrorEntry; selected: boolean; onSelect: () => void; open: boolean; onToggle: () => void; subjectName?: string; onUpdate: (p: Partial<ErrorEntry>) => void; onRemove: () => void }) {
  const [note, setNote] = useState(e.personalNote);
  return (
    <div className="card stack">
      <div className="row" style={{ alignItems: "flex-start" }}>
        <input type="checkbox" checked={selected} onChange={onSelect} aria-label="Selecionar questão" style={{ width: 22, height: 22, marginTop: 2 }} />
        <button className="card-link grow" style={{ background: "none", border: "none", padding: 0 }} aria-expanded={open} onClick={onToggle}>
          <div className="small truncate" style={{ fontWeight: 600 }}>
            {e.question.enunciado}
          </div>
          <div className="row wrap tiny muted" style={{ gap: 6, marginTop: 4 }}>
            <span>{bancaName(e)}</span>·<span>{subjectName ?? "Sem matéria"}</span>·<span>{e.question.assunto}</span>·<span>{relativeDay(e.addedAt)}</span>
          </div>
        </button>
      </div>
      {open && (
        <>
          <p className="statement small">{e.question.enunciado}</p>
          {e.question.alternativas.map((alt) => (
            <div key={alt.letra} className={`option ${alt.letra === e.question.correta ? "correct" : e.choice === alt.letra ? "wrong" : ""}`} style={{ cursor: "default" }}>
              <span className="letter">{alt.letra}</span>
              <span className="grow small">{alt.texto}</span>
              {alt.letra === e.question.correta && <span className="option-status">✓ Correta</span>}
              {alt.letra !== e.question.correta && e.choice === alt.letra && <span className="option-status">✗ Sua</span>}
            </div>
          ))}
          <Feedback q={e.question} ans={{ choice: e.choice, correct: e.question.alternativas.length ? e.choice === e.question.correta : false, confirmed: true, flagged: false, timeSec: 0 }} />
          <label className="field">
            <span>Minhas anotações</span>
            <textarea className="textarea" style={{ minHeight: 70 }} value={note} onChange={(ev) => setNote(ev.target.value)} onBlur={() => note !== e.personalNote && onUpdate({ personalNote: note })} />
          </label>
        </>
      )}
      <div className="row wrap">
        <Chips<ErrorEntry["status"]>
          label="Status"
          value={e.status}
          onChange={(status) => onUpdate({ status })}
          options={[
            { value: "pendente", label: "Pendente" },
            { value: "revisada", label: "Revisada" },
            { value: "dominada", label: "Dominada" },
          ]}
        />
        <button className="icon-btn" aria-label="Remover" onClick={onRemove}>
          <Icon name="trash" size={18} />
        </button>
      </div>
    </div>
  );
}

function ManualSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const subjects = useStore((s) => s.subjects);
  const [f, setF] = useState({ enunciado: "", alternativas: "", correta: "", explicacao: "", assunto: "", subjectId: "", banca: "Geral" as Banca });
  const [error, setError] = useState("");
  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    if (!f.enunciado.trim()) return setError("Escreva o enunciado.");
    const alts = f.alternativas
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l, i) => {
        const m = l.match(/^([A-Ea-e])[).:-]\s*(.*)$/);
        return m ? { letra: m[1].toUpperCase(), texto: m[2] } : { letra: String.fromCharCode(65 + i), texto: l };
      });
    if (alts.length && !alts.some((a) => a.letra === f.correta.trim().toUpperCase())) return setError("Informe a letra da alternativa correta.");
    const sub = subjects.find((x) => x.id === f.subjectId);
    useStore.getState().addErrors([
      {
        question: {
          id: uid(),
          assunto: f.assunto.trim() || "Geral",
          enunciado: f.enunciado.trim(),
          alternativas: alts,
          correta: alts.length ? f.correta.trim().toUpperCase() : "",
          resposta_esperada: alts.length ? "" : f.explicacao.trim(),
          explicacao: f.explicacao.trim(),
          comentarios_alternativas: [],
          dica: "",
          dificuldade: "intermediaria",
          base: "material_do_usuario",
          incerteza: "",
        },
        banca: f.banca,
        notebookId: sub?.notebookId,
        subjectId: sub?.id,
        choice: "",
        status: "pendente",
        personalNote: "",
        manual: true,
      },
    ]);
    setF({ enunciado: "", alternativas: "", correta: "", explicacao: "", assunto: "", subjectId: "", banca: "Geral" });
    setError("");
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Adicionar questão">
      <form className="stack" onSubmit={submit} noValidate>
        <label className="field">
          <span>Enunciado</span>
          <textarea className="textarea" value={f.enunciado} onChange={(e) => setF({ ...f, enunciado: e.target.value })} />
        </label>
        <label className="field">
          <span>Alternativas (uma por linha, opcional)</span>
          <textarea className="textarea" style={{ minHeight: 90 }} placeholder={"A) ...\nB) ..."} value={f.alternativas} onChange={(e) => setF({ ...f, alternativas: e.target.value })} />
        </label>
        <div className="grid-2">
          <label className="field">
            <span>Correta</span>
            <input className="input" maxLength={1} value={f.correta} onChange={(e) => setF({ ...f, correta: e.target.value })} placeholder="Ex.: C" />
          </label>
          <label className="field">
            <span>Banca</span>
            <select className="select" value={f.banca} onChange={(e) => setF({ ...f, banca: e.target.value as Banca })}>
              {BANCAS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Matéria</span>
          <select className="select" value={f.subjectId} onChange={(e) => setF({ ...f, subjectId: e.target.value })}>
            <option value="">Nenhuma</option>
            {subjects.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Assunto</span>
          <input className="input" value={f.assunto} onChange={(e) => setF({ ...f, assunto: e.target.value })} />
        </label>
        <label className="field">
          <span>Explicação / comentário</span>
          <textarea className="textarea" style={{ minHeight: 80 }} value={f.explicacao} onChange={(e) => setF({ ...f, explicacao: e.target.value })} />
        </label>
        {error && <p className="field-error">{error}</p>}
        <button className="btn btn-primary btn-block" type="submit">
          Salvar
        </button>
      </form>
    </Sheet>
  );
}
