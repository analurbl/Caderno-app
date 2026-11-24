import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useStore } from "./store";
import { BottomNav, Mascot, Sheet, confirmAction } from "./components/ui";
import { DialogHost } from "./components/dialog";
import { activeElapsed, fmtDuration } from "./lib/time";
import Welcome from "./pages/Welcome";
import { Login, SignUp } from "./pages/Auth";
import Setup from "./pages/Setup";
import Home from "./pages/Home";
import Notebooks from "./pages/Notebooks";
import NotebookForm from "./pages/NotebookForm";
import NotebookView from "./pages/NotebookView";
import SubjectView from "./pages/SubjectView";
import TopicView from "./pages/TopicView";
import Study from "./pages/Study";
import Goals from "./pages/Goals";
import QuestionsHub from "./pages/QuestionsHub";
import QuestionRun from "./pages/QuestionRun";
import QuestionResult from "./pages/QuestionResult";
import ErrorBook from "./pages/ErrorBook";
import Reviews from "./pages/Reviews";
import Stats from "./pages/Stats";
import CalendarPage from "./pages/CalendarPage";
import Profile from "./pages/Profile";

const NO_NAV = [/^\/questoes\/lista\//];

export default function App() {
  const loggedIn = useStore((s) => s.loggedIn);
  const account = useStore((s) => s.account);
  const prefs = useStore((s) => s.prefs);
  const active = useStore((s) => s.active);
  const location = useLocation();

  useTheme(prefs.theme, prefs.reduceMotion);
  useHeartbeat();

  if (!loggedIn || !account) {
    return (
      <div className="app no-nav">
        <Routes>
          <Route path="/bem-vindo" element={<Welcome />} />
          <Route path="/cadastro" element={<SignUp />} />
          <Route path="/entrar" element={<Login />} />
          <Route path="*" element={<Navigate to={account ? "/entrar" : "/bem-vindo"} replace />} />
        </Routes>
        <DialogHost />
      </div>
    );
  }

  const hideNav = location.pathname === "/configurar" || NO_NAV.some((r) => r.test(location.pathname));

  return (
    <div className={`app ${hideNav ? "no-nav" : ""}`}>
      <Routes>
        <Route path="/configurar" element={<Setup />} />
        <Route path="/" element={<Home />} />
        <Route path="/cadernos" element={<Notebooks />} />
        <Route path="/cadernos/novo" element={<NotebookForm />} />
        <Route path="/caderno/:id" element={<NotebookView />} />
        <Route path="/caderno/:id/editar" element={<NotebookForm />} />
        <Route path="/materia/:id" element={<SubjectView />} />
        <Route path="/assunto/:id" element={<TopicView />} />
        <Route path="/estudar" element={<Study />} />
        <Route path="/metas" element={<Goals />} />
        <Route path="/questoes" element={<QuestionsHub />} />
        <Route path="/questoes/lista/:id" element={<QuestionRun />} />
        <Route path="/questoes/resultado/:id" element={<QuestionResult />} />
        <Route path="/erros" element={<ErrorBook />} />
        <Route path="/revisoes" element={<Reviews />} />
        <Route path="/estatisticas" element={<Stats />} />
        <Route path="/calendario" element={<CalendarPage />} />
        <Route path="/perfil" element={<Profile />} />
        <Route path="/bem-vindo" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!hideNav && <BottomNav studying={Boolean(active)} />}
      <RecoveryPrompt />
      <DialogHost />
    </div>
  );
}

function useTheme(theme: "system" | "light" | "dark", reduceMotion: boolean) {
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && mq.matches);
      root.dataset.theme = dark ? "dark" : "light";
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    document.documentElement.dataset.motion = reduceMotion ? "reduce" : "auto";
  }, [reduceMotion]);
}

/** Registra periodicamente que o app está aberto, para detectar sessões interrompidas. */
function useHeartbeat() {
  const running = useStore((s) => Boolean(s.active?.runningSince));
  useEffect(() => {
    if (!running) return;
    const beat = () => useStore.getState().heartbeat();
    const id = window.setInterval(beat, 15_000);
    const onHide = () => document.visibilityState === "hidden" && beat();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", beat);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", beat);
    };
  }, [running]);
}

const GAP_MS = 2 * 60_000;

/**
 * Se o app foi fechado com o cronômetro rodando, pergunta o que fazer com o tempo em que ficou fechado.
 * Avaliado apenas uma vez, na abertura do app.
 */
function RecoveryPrompt() {
  const [state] = useState(() => {
    const a = useStore.getState().active;
    if (!a || !a.runningSince) return null;
    const gap = Date.now() - a.heartbeat;
    return gap > GAP_MS ? { heartbeat: a.heartbeat, gap } : null;
  });
  const [open, setOpen] = useState(Boolean(state));
  const active = useStore((s) => s.active);
  const { pauseSession, finishSession, discardSession } = useStore.getState();
  if (!state || !active) return null;
  const close = () => setOpen(false);
  const untilClose = activeElapsed(active, state.heartbeat);
  return (
    <Sheet open={open} onClose={close} title="Sessão em andamento">
      <div className="row">
        <Mascot mood="calma" size={56} />
        <p>
          Seu cronômetro ficou ligado enquanto o app estava fechado (cerca de {fmtDuration(state.gap / 1000)}). Até o fechamento, você tinha
          estudado <strong>{fmtDuration(untilClose)}</strong>. O que prefere fazer?
        </p>
      </div>
      <button
        className="btn btn-primary btn-block"
        onClick={() => {
          pauseSession(state.heartbeat);
          close();
        }}
      >
        Pausar no momento do fechamento
      </button>
      <button
        className="btn btn-soft btn-block"
        onClick={() => {
          finishSession({ endAt: state.heartbeat });
          close();
        }}
      >
        Salvar sessão até o fechamento
      </button>
      <button className="btn btn-ghost btn-block" onClick={close}>
        Continuar contando (eu estava estudando)
      </button>
      <button
        className="btn btn-danger btn-block"
        onClick={() => {
          void confirmAction("Descartar esta sessão? O tempo não será registrado.").then((ok) => {
            if (!ok) return;
            discardSession();
            close();
          });
        }}
      >
        Descartar sessão
      </button>
    </Sheet>
  );
}
