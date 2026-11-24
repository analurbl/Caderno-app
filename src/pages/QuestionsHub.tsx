import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "../store";
import { Chips, Icon, Mascot, Sheet, Toggle, TopBar, confirmAction } from "../components/ui";
import { generateQuestions } from "../lib/api";
import { weakPoints } from "../lib/stats";
import { relativeDay, uid } from "../lib/time";
import type { Banca, Dificuldade, Formato, ListConfig, QuestionList } from "../types";

export const BANCAS: { value: Banca; label: string }[] = [
  { value: "FGV", label: "FGV" },
  { value: "AOCP", label: "AOCP" },
  { value: "Instituto Avalia", label: "Instituto Avalia" },
  { value: "Geral", label: "Estilo geral" },
  { value: "Outra", label: "Outra" },
];
export const FORMATO_LABEL: Record<Formato, string> = { multipla: "Múltipla escolha", certo_errado: "Certo/errado", discursiva: "Discursiva" };
const DIF_LABEL: Record<Dificuldade, string> = { facil: "Fácil", intermediaria: "Intermediária", dificil: "Difícil", mista: "Mista" };

export function bancaName(c: { banca: Banca; bancaOutra?: string }) {
  return c.banca === "Outra" ? c.bancaOutra || "Outra banca" : c.banca === "Geral" ? "Estilo geral" : c.banca;
}

export default function QuestionsHub() {
  const s = useStore();
  const nav = useNavigate();
  const [params] = useSearchParams();

  const initial = useMemo(() => {
    const topic = s.topics.find((t) => t.id === params.get("assunto"));
    const sub = s.subjects.find((x) => x.id === (topic?.subjectId ?? params.get("materia")));
    const nbId = sub?.notebookId ?? params.get("caderno") ?? s.notebooks.find((n) => !n.archived)?.id;
    return { notebookId: nbId ?? undefined, subjectId: sub?.id, topicIds: topic ? [topic.id] : [] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prefBanca: Banca = s.prefs.banca === "nao_sei" ? "Geral" : s.prefs.banca;
  const [cfg, setCfg] = useState<ListConfig>({
    banca: prefBanca,
    bancaOutra: "",
    quantidade: 5,
    dificuldade: "mista",
    formato: "multipla",
    modo: "treino",
    incluirComentarios: true,
    priorizarFracos: false,
    fonte: "assuntos",
    texto: "",
    ...initial,
  });
  const [customQty, setCustomQty] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [consentOpen, setConsentOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const notebooks = s.notebooks.filter((n) => !n.archived);
  const subjects = s.subjects.filter((x) => x.notebookId === cfg.notebookId && !x.archived);
  const topics = s.topics.filter((t) => t.subjectId === cfg.subjectId);
  const sub = s.subjects.find((x) => x.id === cfg.subjectId);
  const selectedTopics = topics.filter((t) => cfg.topicIds.includes(t.id));
  const notesText = (selectedTopics.length ? selectedTopics : topics)
    .filter((t) => t.notes.trim())
    .map((t) => `## ${t.name}\n${t.notes.trim()}`)
    .join("\n\n");
  const weak = weakPoints(s.errors, cfg.subjectId);

  const update = (p: Partial<ListConfig>) => setCfg((c) => ({ ...c, ...p }));

  const validate = (): string => {
    if (cfg.fonte === "texto" && (cfg.texto?.trim().length ?? 0) < 80) return "Cole um texto um pouco maior (pelo menos algumas frases) para basear as questões.";
    if (cfg.fonte === "anotacoes" && !notesText) return "Os assuntos selecionados ainda não têm anotações. Escreva anotações no assunto ou escolha outra fonte.";
    if (cfg.fonte === "assuntos" && !sub) return "Escolha ao menos uma matéria para gerar questões.";
    if (cfg.banca === "Outra" && !cfg.bancaOutra?.trim()) return "Informe o nome da banca.";
    if (cfg.quantidade < 1 || cfg.quantidade > 30) return "Escolha entre 1 e 30 questões.";
    return "";
  };

  const generate = async (consented = false) => {
    const v = validate();
    if (v) return setError(v);
    if (!s.prefs.aiConsent && !consented) return setConsentOpen(true);
    setError("");
    setLoading(true);
    abortRef.current = new AbortController();
    const evitar = s.lists
      .filter((l) => l.config.subjectId && l.config.subjectId === cfg.subjectId)
      .flatMap((l) => l.questions.map((q) => q.enunciado.slice(0, 140)))
      .slice(0, 40);
    try {
      const res = await generateQuestions(
        {
          banca: cfg.banca,
          bancaOutra: cfg.bancaOutra,
          quantidade: cfg.quantidade,
          dificuldade: cfg.dificuldade,
          formato: cfg.formato,
          materia: sub?.name,
          assuntos: selectedTopics.map((t) => t.name),
          conteudo: cfg.fonte === "texto" ? cfg.texto : cfg.fonte === "anotacoes" ? notesText : undefined,
          incluirComentarios: cfg.incluirComentarios,
          pontosFracos: cfg.priorizarFracos ? weak : [],
          evitar,
        },
        abortRef.current.signal,
      );
      if (!res.questoes.length) {
        setError(res.aviso_material || "A IA não conseguiu elaborar questões com este material. Tente acrescentar mais conteúdo.");
        return;
      }
      const list: QuestionList = {
        id: uid(),
        title: [sub?.name ?? (cfg.fonte === "texto" ? "Texto colado" : "Questões"), selectedTopics.length === 1 ? selectedTopics[0].name : ""].filter(Boolean).join(" · "),
        config: { ...cfg, texto: cfg.fonte === "texto" ? cfg.texto?.slice(0, 2000) : undefined },
        questions: res.questoes.map((q) => ({ ...q, id: uid() })),
        answers: {},
        aviso: res.aviso_material,
        createdAt: Date.now(),
        totalSec: 0,
        current: 0,
        origin: "ia",
      };
      s.addList(list);
      nav(`/questoes/lista/${list.id}`);
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <TopBar title="Questões IA" />
        <main className="page">
          <div className="empty" role="status" aria-live="polite">
            <Mascot mood="foco" size={96} />
            <h3>Preparando suas questões...</h3>
            <p className="muted">
              Criando {cfg.quantidade} questão(ões) no estilo {bancaName(cfg)}. Isso pode levar até um minuto.
            </p>
            <div className="spinner" aria-hidden />
            <button
              className="btn btn-ghost"
              onClick={() => {
                abortRef.current?.abort();
                setLoading(false);
              }}
            >
              Cancelar
            </button>
          </div>
        </main>
      </>
    );
  }

  const pending = s.lists.filter((l) => !l.finishedAt);
  const done = s.lists.filter((l) => l.finishedAt).slice(0, 6);

  return (
    <>
      <TopBar
        title="Questões IA"
        action={
          <Link to="/erros" className="icon-btn" aria-label="Caderno de erros">
            <Icon name="flag" />
          </Link>
        }
      />
      <main className="page">
        {pending.length > 0 && (
          <section className="stack">
            <h2 className="section-title">Continuar</h2>
            {pending.map((l) => (
              <div key={l.id} className="list-item">
                <Link to={`/questoes/lista/${l.id}`} className="grow card-link" style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }} className="truncate">
                    {l.title}
                  </div>
                  <div className="tiny muted">
                    {Object.values(l.answers).filter((a) => a.confirmed).length}/{l.questions.length} respondidas · {l.config.modo === "simulado" ? "Simulado" : "Treino"}
                  </div>
                </Link>
                <button className="icon-btn" aria-label="Excluir lista" onClick={() => confirmAction("Excluir esta lista não finalizada?") && s.removeList(l.id)}>
                  <Icon name="trash" size={18} />
                </button>
              </div>
            ))}
          </section>
        )}

        <section className="card stack">
          <h2 className="section-title">Nova lista</h2>
          <div className="field">
            <span className="label">Gerar a partir de</span>
            <Chips<ListConfig["fonte"]>
              label="Fonte"
              value={cfg.fonte}
              onChange={(fonte) => update({ fonte })}
              options={[
                { value: "assuntos", label: "Matéria e assuntos" },
                { value: "anotacoes", label: "Minhas anotações" },
                { value: "texto", label: "Texto colado" },
              ]}
            />
          </div>

          {cfg.fonte !== "texto" || notebooks.length > 0 ? (
            <>
              <label className="field">
                <span>Caderno</span>
                <select className="select" value={cfg.notebookId ?? ""} onChange={(e) => update({ notebookId: e.target.value || undefined, subjectId: undefined, topicIds: [] })}>
                  <option value="">{cfg.fonte === "texto" ? "Nenhum (opcional)" : "Escolha um caderno"}</option>
                  {notebooks.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.icon} {n.name}
                    </option>
                  ))}
                </select>
              </label>
              {cfg.notebookId && (
                <label className="field">
                  <span>Matéria</span>
                  <select className="select" value={cfg.subjectId ?? ""} onChange={(e) => update({ subjectId: e.target.value || undefined, topicIds: [] })}>
                    <option value="">Escolha uma matéria</option>
                    {subjects.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {cfg.subjectId && topics.length > 0 && (
                <div className="field">
                  <span className="label">Assuntos {cfg.topicIds.length === 0 && <span className="muted">(todos)</span>}</span>
                  <div className="chips">
                    {topics.map((t) => {
                      const on = cfg.topicIds.includes(t.id);
                      return (
                        <button key={t.id} type="button" aria-pressed={on} className={`chip ${on ? "chip-on" : ""}`} onClick={() => update({ topicIds: on ? cfg.topicIds.filter((x) => x !== t.id) : [...cfg.topicIds, t.id] })}>
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : null}

          {cfg.fonte === "texto" && (
            <label className="field">
              <span>Texto base</span>
              <textarea className="textarea" style={{ minHeight: 160 }} value={cfg.texto} onChange={(e) => update({ texto: e.target.value })} placeholder="Cole aqui um trecho de lei, resumo, apostila..." maxLength={60000} />
              <span className="hint">{(cfg.texto ?? "").length.toLocaleString("pt-BR")} / 60.000 caracteres</span>
            </label>
          )}
          {cfg.fonte === "anotacoes" && (
            <p className="small muted">{notesText ? `Usaremos ${notesText.length.toLocaleString("pt-BR")} caracteres das suas anotações.` : "Nenhuma anotação nos assuntos selecionados."}</p>
          )}

          <div className="field">
            <span className="label">Banca</span>
            <Chips<Banca> label="Banca" value={cfg.banca} onChange={(banca) => update({ banca })} options={BANCAS} />
            {cfg.banca === "Outra" && <input className="input" placeholder="Nome da banca" value={cfg.bancaOutra} onChange={(e) => update({ bancaOutra: e.target.value })} />}
          </div>
          <div className="field">
            <span className="label">Quantidade</span>
            <Chips<number>
              label="Quantidade"
              value={[5, 10, 15, 20].includes(cfg.quantidade) && !customQty ? cfg.quantidade : -1}
              onChange={(q) => {
                if (q === -1) {
                  setCustomQty(String(cfg.quantidade));
                } else {
                  setCustomQty("");
                  update({ quantidade: q });
                }
              }}
              options={[5, 10, 15, 20].map((n) => ({ value: n, label: String(n) })).concat({ value: -1, label: "Outra" })}
            />
            {customQty !== "" && (
              <input
                className="input"
                inputMode="numeric"
                aria-label="Quantidade personalizada (1 a 30)"
                value={customQty}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  setCustomQty(v);
                  update({ quantidade: Math.min(30, parseInt(v, 10) || 0) });
                }}
              />
            )}
          </div>
          <div className="field">
            <span className="label">Dificuldade</span>
            <Chips<Dificuldade> label="Dificuldade" value={cfg.dificuldade} onChange={(dificuldade) => update({ dificuldade })} options={(Object.keys(DIF_LABEL) as Dificuldade[]).map((d) => ({ value: d, label: DIF_LABEL[d] }))} />
          </div>
          <div className="field">
            <span className="label">Formato</span>
            <Chips<Formato> label="Formato" value={cfg.formato} onChange={(formato) => update({ formato })} options={(Object.keys(FORMATO_LABEL) as Formato[]).map((f) => ({ value: f, label: FORMATO_LABEL[f] }))} />
          </div>
          <div className="field">
            <span className="label">Modo</span>
            <Chips<ListConfig["modo"]>
              label="Modo"
              value={cfg.modo}
              onChange={(modo) => update({ modo })}
              options={[
                { value: "treino", label: "Treino (correção a cada questão)" },
                { value: "simulado", label: "Simulado (correção no final)" },
              ]}
            />
          </div>
          <Toggle checked={cfg.incluirComentarios} onChange={(incluirComentarios) => update({ incluirComentarios })} label="Incluir comentários por alternativa" />
          <Toggle
            checked={cfg.priorizarFracos}
            onChange={(priorizarFracos) => update({ priorizarFracos })}
            label="Priorizar pontos ainda não dominados"
            hint={weak.length ? `Com base no caderno de erros: ${weak.slice(0, 3).join(", ")}${weak.length > 3 ? "..." : ""}` : "Ainda não há histórico de erros suficiente."}
          />
          {error && (
            <div className="banner bad" role="alert">
              <Icon name="alert" />
              <span className="small">{error}</span>
            </div>
          )}
          <button className="btn btn-primary btn-lg btn-block" onClick={() => generate()}>
            <Icon name="spark" /> Gerar questões
          </button>
          <p className="tiny muted center">Questões geradas por IA, inspiradas no estilo da banca — não são questões oficiais.</p>
        </section>

        {done.length > 0 && (
          <section className="stack">
            <h2 className="section-title">Listas recentes</h2>
            {done.map((l) => {
              const answered = l.questions.filter((q) => l.answers[q.id]?.correct !== null && l.answers[q.id]?.confirmed);
              const correct = answered.filter((q) => l.answers[q.id]?.correct).length;
              return (
                <Link key={l.id} to={`/questoes/resultado/${l.id}`} className="list-item card-link">
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }} className="truncate">
                      {l.title}
                    </div>
                    <div className="tiny muted">
                      {bancaName(l.config)} · {relativeDay(l.finishedAt)}
                    </div>
                  </div>
                  <span className="pill">
                    {correct}/{answered.length}
                  </span>
                </Link>
              );
            })}
          </section>
        )}
      </main>

      <Sheet open={consentOpen} onClose={() => setConsentOpen(false)} title="Antes de usar a IA">
        <div className="row">
          <Mascot mood="duvida" size={56} />
          <p className="small">Para criar as questões, enviamos ao serviço de IA apenas o necessário:</p>
        </div>
        <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
          <li>a banca, a matéria e os assuntos escolhidos;</li>
          <li>o texto colado ou as anotações, quando você escolher essas fontes;</li>
          <li>os assuntos em que você mais errou, se ativar essa opção.</li>
        </ul>
        <p className="small muted">O conteúdo é usado somente para gerar as questões e explicações. As questões são inspiradas no estilo da banca e podem conter erros: você pode reportá-las a qualquer momento.</p>
        <button
          className="btn btn-primary btn-block"
          onClick={() => {
            s.setPrefs({ aiConsent: true });
            setConsentOpen(false);
            void generate(true);
          }}
        >
          Concordo, gerar questões
        </button>
        <button className="btn btn-ghost btn-block" onClick={() => setConsentOpen(false)}>
          Agora não
        </button>
      </Sheet>
    </>
  );
}
