import { useEffect, useRef, useState } from "react";
import { create } from "zustand";

/**
 * Diálogos dentro da própria interface (confirmar, avisar, pedir um texto).
 * Substituem window.confirm/alert/prompt, que são bloqueantes, destoam do visual
 * e não funcionam em alguns ambientes incorporados.
 */

type Request =
  | { kind: "confirm"; title: string; message: string; confirmLabel: string; danger: boolean; resolve: (v: boolean) => void }
  | { kind: "alert"; title: string; message: string; resolve: () => void }
  | { kind: "prompt"; title: string; message: string; value: string; multiline: boolean; resolve: (v: string | null) => void };

const useDialog = create<{ current: Request | null; queue: Request[] }>(() => ({ current: null, queue: [] }));

function push(r: Request) {
  useDialog.setState((s) => (s.current ? { queue: [...s.queue, r] } : { current: r }));
}
function next() {
  useDialog.setState((s) => ({ current: s.queue[0] ?? null, queue: s.queue.slice(1) }));
}

export function confirmAction(message: string, opts: { title?: string; confirmLabel?: string; danger?: boolean } = {}): Promise<boolean> {
  const danger = opts.danger ?? /excluir|descartar|remover|apaga/i.test(message);
  return new Promise((resolve) =>
    push({ kind: "confirm", title: opts.title ?? "Tem certeza?", message, confirmLabel: opts.confirmLabel ?? (danger ? "Sim, continuar" : "Continuar"), danger, resolve }),
  );
}

export function showMessage(message: string, title = "Aviso"): Promise<void> {
  return new Promise((resolve) => push({ kind: "alert", title, message, resolve }));
}

export function askText(title: string, value = "", opts: { message?: string; multiline?: boolean } = {}): Promise<string | null> {
  return new Promise((resolve) => push({ kind: "prompt", title, message: opts.message ?? "", value, multiline: opts.multiline ?? false, resolve }));
}

export function DialogHost() {
  const current = useDialog((s) => s.current);
  const [text, setText] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!current) return;
    if (current.kind === "prompt") setText(current.value);
    const t = window.setTimeout(() => boxRef.current?.querySelector<HTMLElement>("input, textarea, [data-autofocus]")?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [current]);

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!current) return null;

  function cancel() {
    if (!current) return;
    if (current.kind === "confirm") current.resolve(false);
    else if (current.kind === "prompt") current.resolve(null);
    else current.resolve();
    next();
  }
  function ok() {
    if (!current) return;
    if (current.kind === "confirm") current.resolve(true);
    else if (current.kind === "prompt") current.resolve(text);
    else current.resolve();
    next();
  }

  return (
    <div className="sheet-backdrop dialog-backdrop" onClick={cancel}>
      <div className="dialog" role={current.kind === "alert" ? "alertdialog" : "dialog"} aria-modal="true" aria-labelledby="dlg-title" ref={boxRef} onClick={(e) => e.stopPropagation()}>
        <h2 id="dlg-title">{current.title}</h2>
        {current.message && <p className="small" style={{ whiteSpace: "pre-wrap" }}>{current.message}</p>}
        {current.kind === "prompt" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ok();
            }}
          >
            {current.multiline ? (
              <textarea id="dlg-input" className="textarea" aria-label={current.title} value={text} onChange={(e) => setText(e.target.value)} />
            ) : (
              <input id="dlg-input" className="input" aria-label={current.title} value={text} onChange={(e) => setText(e.target.value)} />
            )}
          </form>
        )}
        <div className="row" style={{ justifyContent: "flex-end", marginTop: 4 }}>
          {current.kind !== "alert" && (
            <button className="btn btn-ghost" onClick={cancel}>
              Cancelar
            </button>
          )}
          <button
            data-autofocus
            className={`btn ${current.kind === "confirm" && current.danger ? "btn-danger" : "btn-primary"}`}
            onClick={ok}
          >
            {current.kind === "confirm" ? current.confirmLabel : current.kind === "prompt" ? "Salvar" : "Entendi"}
          </button>
        </div>
      </div>
    </div>
  );
}
