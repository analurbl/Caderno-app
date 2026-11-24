import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { exportData, useStore } from "../store";
import { Chips, Icon, Mascot, Toggle, TopBar, confirmAction, showMessage } from "../components/ui";
import { saveFile } from "../lib/api";
import { WEEKDAY_SHORT, fmtDuration, streak, sumSessions } from "../lib/time";
import { PRIVACY, TERMS } from "./Welcome";
import type { Preferences } from "../types";

export default function Profile() {
  const s = useStore();
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [notifMsg, setNotifMsg] = useState("");
  const p = s.prefs;
  const setN = (n: Partial<Preferences["notifications"]>) => s.setPrefs({ notifications: { ...p.notifications, ...n } });

  const download = async () => {
    try {
      await saveFile(`caderno-dados-${new Date().toISOString().slice(0, 10)}.json`, exportData());
    } catch (e) {
      await showMessage((e as Error).message);
    }
  };

  const importFile = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed?.app !== "caderno" || !parsed.data) throw new Error();
      if (!(await confirmAction("Importar substituirá os dados de estudo atuais deste dispositivo. Continuar?"))) return;
      s.importData(parsed.data);
      await showMessage("Dados importados.", "Pronto");
    } catch {
      await showMessage("Arquivo inválido. Use um arquivo exportado pelo Caderno.");
    }
  };

  const enableNotifications = async (v: boolean) => {
    setN({ studyReminder: v });
    if (v && "Notification" in window && Notification.permission === "default") {
      const r = await Notification.requestPermission();
      setNotifMsg(r === "granted" ? "Notificações permitidas." : "Sem permissão do navegador: os lembretes aparecerão apenas dentro do app.");
    }
  };

  return (
    <>
      <TopBar title="Perfil" />
      <main className="page">
        <section className="card row" style={{ gap: 14 }}>
          <Mascot mood="motivacao" size={64} />
          <div className="grow" style={{ minWidth: 0 }}>
            <h2 style={{ fontWeight: 800 }} className="truncate">
              {s.account?.name}
            </h2>
            <div className="small muted truncate">{s.account?.email}</div>
            {(p.objetivo || p.prova) && <div className="small">{[p.objetivo, p.prova].filter(Boolean).join(" · ")}</div>}
          </div>
        </section>

        <div className="grid-2">
          <div className="card tint stat" style={{ background: "var(--lavender)" }}>
            <span className="stat-label">Tempo total</span>
            <span className="stat-value">{fmtDuration(sumSessions(s.sessions, 0, Infinity))}</span>
          </div>
          <div className="card tint stat" style={{ background: "var(--butter)" }}>
            <span className="stat-label">Sequência atual</span>
            <span className="stat-value">{streak(s.sessions)} dia(s)</span>
          </div>
        </div>

        <nav className="list" aria-label="Atalhos">
          {[
            ["/estatisticas", "chart", "Estatísticas e evolução"],
            ["/calendario", "calendar", "Calendário e histórico"],
            ["/metas", "target", "Metas e planejamento"],
            ["/revisoes", "refresh", "Revisões"],
            ["/erros", "flag", "Caderno de erros"],
          ].map(([to, icon, label]) => (
            <Link key={to} to={to} className="list-item card-link">
              <Icon name={icon} />
              <span className="grow" style={{ fontWeight: 700 }}>
                {label}
              </span>
              <span style={{ transform: "rotate(180deg)", display: "inline-flex" }}>
                <Icon name="back" size={18} />
              </span>
            </Link>
          ))}
        </nav>

        <section className="card stack">
          <h2 className="section-title">Preferências de estudo</h2>
          <label className="field">
            <span>Objetivo</span>
            <input className="input" value={p.objetivo} onChange={(e) => s.setPrefs({ objetivo: e.target.value })} />
          </label>
          <label className="field">
            <span>Prova ou concurso</span>
            <input className="input" value={p.prova} onChange={(e) => s.setPrefs({ prova: e.target.value })} />
          </label>
          <div className="field">
            <span className="label">Banca preferida</span>
            <Chips<Preferences["banca"]>
              label="Banca preferida"
              value={p.banca}
              onChange={(banca) => s.setPrefs({ banca })}
              options={[
                { value: "FGV", label: "FGV" },
                { value: "AOCP", label: "AOCP" },
                { value: "Instituto Avalia", label: "Instituto Avalia" },
                { value: "Geral", label: "Geral" },
                { value: "nao_sei", label: "Não sei" },
              ]}
            />
          </div>
          <label className="field">
            <span>Tempo de estudo por dia (min)</span>
            <input className="input" inputMode="numeric" value={p.dailyMinutes || ""} onChange={(e) => s.setPrefs({ dailyMinutes: parseInt(e.target.value.replace(/\D/g, ""), 10) || 0 })} />
            <span className="hint">Usado quando não há uma meta diária criada em Metas. Deixe vazio para não ter meta.</span>
          </label>
          <div className="field">
            <span className="label">Dias de estudo</span>
            <div className="chips">
              {WEEKDAY_SHORT.map((d, i) => {
                const on = p.studyDays.includes(i);
                return (
                  <button key={d} type="button" aria-pressed={on} className={`chip ${on ? "chip-on" : ""}`} onClick={() => s.setPrefs({ studyDays: on ? p.studyDays.filter((x) => x !== i) : [...p.studyDays, i].sort() })}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="card stack">
          <h2 className="section-title">Notificações</h2>
          <Toggle checked={p.notifications.studyReminder} onChange={enableNotifications} label="Lembrete de horário de estudo" />
          {p.notifications.studyReminder && (
            <label className="field">
              <span>Horário</span>
              <input className="input" type="time" value={p.notifications.reminderTime} onChange={(e) => setN({ reminderTime: e.target.value })} />
            </label>
          )}
          <Toggle checked={p.notifications.dailyGoal} onChange={(v) => setN({ dailyGoal: v })} label="Meta diária ainda não iniciada" />
          <Toggle checked={p.notifications.reviews} onChange={(v) => setN({ reviews: v })} label="Revisões agendadas" />
          <Toggle checked={p.notifications.weeklySummary} onChange={(v) => setN({ weeklySummary: v })} label="Resumo semanal" />
          <Toggle checked={p.notifications.achievements} onChange={(v) => setN({ achievements: v })} label="Conquistas de metas" />
          {notifMsg && <p className="small muted">{notifMsg}</p>}
          <p className="tiny muted">Os lembretes usam mensagens leves, sem cobrança. O envio em segundo plano depende do aplicativo instalado e chega com a sincronização.</p>
        </section>

        <section className="card stack">
          <h2 className="section-title">Aparência e acessibilidade</h2>
          <Chips<Preferences["theme"]>
            label="Tema"
            value={p.theme}
            onChange={(theme) => s.setPrefs({ theme })}
            options={[
              { value: "system", label: "Automático" },
              { value: "light", label: "Claro" },
              { value: "dark", label: "Escuro" },
            ]}
          />
          <Toggle checked={p.reduceMotion} onChange={(v) => s.setPrefs({ reduceMotion: v })} label="Reduzir animações" hint="O app também segue a configuração do sistema." />
        </section>

        <section className="card stack">
          <h2 className="section-title">Privacidade e dados</h2>
          <Toggle checked={p.aiConsent} onChange={(v) => s.setPrefs({ aiConsent: v })} label="Permitir envio de conteúdo para a IA" hint="Necessário para gerar questões e explicações." />
          <Toggle checked={p.autoSaveErrors} onChange={(v) => s.setPrefs({ autoSaveErrors: v })} label="Salvar questões erradas automaticamente" />
          <button className="btn btn-ghost btn-block" onClick={download}>
            Exportar meus dados (JSON)
          </button>
          <button className="btn btn-ghost btn-block" onClick={() => fileRef.current?.click()}>
            Importar dados
          </button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
          <button
            className="btn btn-danger btn-block"
            onClick={async () => {
              if (await confirmAction("Excluir sua conta e TODOS os dados deste dispositivo? Esta ação não pode ser desfeita. Considere exportar antes.")) {
                s.deleteAllData();
                nav("/bem-vindo", { replace: true });
              }
            }}
          >
            Excluir conta e dados
          </button>
        </section>

        <section className="card stack">
          <h2 className="section-title">Ajuda</h2>
          <button className="link-btn" style={{ textAlign: "left" }} onClick={() => showMessage(TERMS, "Termos de uso")}>
            Termos de uso
          </button>
          <button className="link-btn" style={{ textAlign: "left" }} onClick={() => showMessage(PRIVACY, "Política de privacidade")}>
            Política de privacidade
          </button>
          <button className="link-btn" style={{ textAlign: "left" }} onClick={() => nav("/configurar")}>
            Refazer configuração inicial
          </button>
        </section>

        <button
          className="btn btn-ghost btn-block"
          onClick={() => {
            s.logOut();
            nav("/entrar", { replace: true });
          }}
        >
          Sair da conta
        </button>
        <p className="tiny muted center">Caderno · versão 0.1 (MVP)</p>
      </main>
    </>
  );
}
