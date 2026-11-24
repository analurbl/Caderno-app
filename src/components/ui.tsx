import { useEffect, useRef, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";

/* ------------------------------------------------------------------ */
/* Mascotes geométricos                                                */
/* ------------------------------------------------------------------ */

export type Mood = "foco" | "motivacao" | "calma" | "conquista" | "duvida" | "revisao";

const MASCOT: Record<Mood, { color: string; label: string }> = {
  foco: { color: "#B9D0F2", label: "Mascote do foco" },
  motivacao: { color: "#F3B8CF", label: "Mascote da motivação" },
  calma: { color: "#A9DED2", label: "Mascote da calma" },
  conquista: { color: "#F7DF83", label: "Mascote da conquista" },
  duvida: { color: "#E8DDF8", label: "Mascote da dúvida" },
  revisao: { color: "#F29A91", label: "Mascote da revisão" },
};

export function Mascot({ mood, size = 72 }: { mood: Mood; size?: number }) {
  const { color, label } = MASCOT[mood];
  const body = (() => {
    switch (mood) {
      case "foco":
        return <circle cx="50" cy="54" r="38" fill={color} />;
      case "motivacao":
        return <path d="M50 10 L90 86 Q92 92 86 92 L14 92 Q8 92 10 86 Z" fill={color} />;
      case "calma":
        return <rect x="12" y="18" width="76" height="74" rx="26" fill={color} />;
      case "conquista":
        return (
          <path
            d="M50 6 L61 36 L94 37 L68 57 L77 90 L50 71 L23 90 L32 57 L6 37 L39 36 Z"
            fill={color}
            strokeLinejoin="round"
            stroke={color}
            strokeWidth="6"
          />
        );
      case "duvida":
        return <path d="M50 12 C78 12 92 34 88 58 C84 84 64 94 46 92 C24 90 8 74 12 50 C15 28 28 12 50 12 Z" fill={color} />;
      case "revisao":
        return <path d="M50 8 L88 30 L88 74 L50 96 L12 74 L12 30 Z" fill={color} />;
    }
  })();
  const eyes =
    mood === "calma" ? (
      <g stroke="#25232B" strokeWidth="3.5" strokeLinecap="round" fill="none">
        <path d="M34 54 q5 4 10 0" />
        <path d="M56 54 q5 4 10 0" />
      </g>
    ) : (
      <g fill="#25232B">
        <circle cx={mood === "duvida" ? 40 : 39} cy="54" r="4.5" />
        <circle cx={mood === "duvida" ? 62 : 61} cy={mood === "duvida" ? 51 : 54} r="4.5" />
      </g>
    );
  const mouth =
    mood === "duvida" ? (
      <path d="M44 70 q6 -4 12 0" stroke="#25232B" strokeWidth="3" fill="none" strokeLinecap="round" />
    ) : mood === "foco" ? (
      <path d="M45 68 h10" stroke="#25232B" strokeWidth="3" strokeLinecap="round" />
    ) : (
      <path d="M42 66 q8 8 16 0" stroke="#25232B" strokeWidth="3" fill="none" strokeLinecap="round" />
    );
  return (
    <svg className={`mascot mascot-${mood}`} width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={label}>
      {body}
      {eyes}
      {mouth}
      {mood === "conquista" && <circle cx="50" cy="28" r="3" fill="#fff" opacity=".8" />}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Progresso                                                           */
/* ------------------------------------------------------------------ */

export function Ring({ value, size = 120, stroke = 12, color = "var(--lilac)", children, label }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode; label: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--track)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="ring-value"
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

export function Bar({ value, color = "var(--lilac)", label }: { value: number; color?: string; label?: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label={label}>
      <div className="bar-fill" style={{ width: `${v * 100}%`, background: color }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Estrutura                                                           */
/* ------------------------------------------------------------------ */

export function TopBar({ title, back, action }: { title: string; back?: boolean | string; action?: ReactNode }) {
  const nav = useNavigate();
  return (
    <header className="topbar">
      {back ? (
        <button className="icon-btn" aria-label="Voltar" onClick={() => (typeof back === "string" ? nav(back) : nav(-1))}>
          <Icon name="back" />
        </button>
      ) : (
        <span className="topbar-spacer" />
      )}
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-action">{action ?? <span className="topbar-spacer" />}</div>
    </header>
  );
}

export function Empty({ mood, title, text, children }: { mood: Mood; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <Mascot mood={mood} size={84} />
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {children}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>("input, textarea, select, button");
    first?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Fechar" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function Chips<T extends string | number>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={o.value === value} className={`chip ${o.value === value ? "chip-on" : ""}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="toggle-row">
      <span>
        <span className="toggle-label">{label}</span>
        {hint && <span className="hint">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle" aria-hidden />
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Ícones                                                              */
/* ------------------------------------------------------------------ */

const PATHS: Record<string, string> = {
  home: "M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z",
  book: "M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5zM5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3",
  play: "M8 5.5v13l11-6.5z",
  pause: "M8 5h3v14H8zM13 5h3v14h-3z",
  stop: "M7 7h10v10H7z",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c1.2-3.6 4.2-5.5 8-5.5s6.8 1.9 8 5.5",
  back: "M15 5l-7 7 7 7",
  close: "M6 6l12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  flag: "M6 21V4M6 4h11l-2 4 2 4H6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  x: "M7 7l10 10M17 7 7 17",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  chart: "M5 20V10M12 20V4M19 20v-7",
  alert: "M12 3 2 20h20zM12 10v4M12 17h.01",
  up: "M6 15l6-6 6 6",
  down: "M6 9l6 6 6-6",
  edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  trash: "M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-2-4-2 .5-1.5-1.2L15 4h-6l-.5 2.3L7 7.5 5 7 3 11l2 1-.1 1L3 14l2 4 2-.5 1.5 1.2L9 21h6l.5-2.3 1.5-1.2 2 .5 2-4-2-1z",
};

export function Icon({ name, size = 22, label }: { name: keyof typeof PATHS | string; size?: number; label?: string }) {
  const filled = name === "play" || name === "pause" || name === "stop";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden={label ? undefined : true} aria-label={label} role={label ? "img" : undefined} className="icon">
      <path d={PATHS[name] ?? ""} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Navegação inferior                                                  */
/* ------------------------------------------------------------------ */

export function BottomNav({ studying }: { studying: boolean }) {
  const items = [
    { to: "/", label: "Início", icon: "home", end: true },
    { to: "/cadernos", label: "Cadernos", icon: "book" },
    { to: "/estudar", label: studying ? "Estudando" : "Estudar", icon: "play", center: true },
    { to: "/questoes", label: "Questões IA", icon: "spark" },
    { to: "/perfil", label: "Perfil", icon: "user" },
  ];
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {items.map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `nav-item ${it.center ? "nav-center" : ""} ${isActive ? "active" : ""} ${it.center && studying ? "pulsing" : ""}`}>
          <span className="nav-icon">
            <Icon name={it.icon} size={it.center ? 26 : 22} />
          </span>
          <span className="nav-label">{it.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function confirmAction(message: string): boolean {
  return window.confirm(message);
}
