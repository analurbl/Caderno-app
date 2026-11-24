import type { ActiveSession, StudySession } from "../types";

export const DAY_MS = 86_400_000;

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** yyyy-mm-dd no fuso local */
export function dayKey(d: Date | number = new Date()): string {
  const date = typeof d === "number" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(d: Date | number = new Date()): number {
  const date = new Date(typeof d === "number" ? d : d.getTime());
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Semana começando na segunda-feira */
export function startOfWeek(d: Date | number = new Date()): number {
  const date = new Date(startOfDay(d));
  const dow = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - dow);
  return date.getTime();
}

export function startOfMonth(d: Date | number = new Date()): number {
  const date = new Date(typeof d === "number" ? d : d.getTime());
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

export function addDays(ts: number, n: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

/** Tempo efetivo (em segundos) de uma sessão ativa no instante `now`. */
export function activeElapsed(a: ActiveSession, now = Date.now()): number {
  const running = a.runningSince !== null ? Math.max(0, (now - a.runningSince) / 1000) : 0;
  return Math.floor(a.accumulatedSec + running);
}

export function activePaused(a: ActiveSession, now = Date.now()): number {
  const paused = a.pausedSince !== null ? Math.max(0, (now - a.pausedSince) / 1000) : 0;
  return Math.floor(a.pausedSec + paused);
}

/**
 * Soma a duração das sessões no intervalo [from, to). Uma sessão que atravessa a meia-noite
 * é atribuída ao dia em que começou (regra simples e previsível para a pessoa).
 */
export function sumSessions(sessions: StudySession[], from: number, to: number, filter?: (s: StudySession) => boolean): number {
  let total = 0;
  for (const s of sessions) {
    if (s.start >= from && s.start < to && (!filter || filter(s))) total += s.durationSec;
  }
  return total;
}

export function secondsByDay(sessions: StudySession[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const k = dayKey(s.start);
    map.set(k, (map.get(k) ?? 0) + s.durationSec);
  }
  return map;
}

/** Dias consecutivos com estudo, terminando hoje (ou ontem, se hoje ainda não houve estudo). */
export function streak(sessions: StudySession[], now = Date.now()): number {
  const byDay = secondsByDay(sessions);
  let cursor = startOfDay(now);
  if (!byDay.get(dayKey(cursor))) cursor = addDays(cursor, -1);
  let count = 0;
  while (byDay.get(dayKey(cursor))) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function fmtDuration(totalSec: number): string {
  if (totalSec <= 0) return "0 min";
  if (totalSec < 60) return "< 1 min";
  const min = Math.round(totalSec / 60);
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function fmtLongDate(d: Date = new Date()): string {
  return cap(`${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`);
}

export function monthLabel(d: Date): string {
  return cap(`${MONTHS[d.getMonth()]} de ${d.getFullYear()}`);
}

export function fmtShortDate(ts: number | string): string {
  const d = typeof ts === "string" ? parseDayKey(ts) : new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function relativeDay(ts?: number): string {
  if (!ts) return "nunca";
  const diff = Math.round((startOfDay() - startOfDay(ts)) / DAY_MS);
  if (diff <= 0) return "hoje";
  if (diff === 1) return "ontem";
  if (diff < 7) return `há ${diff} dias`;
  return fmtShortDate(ts);
}

export function daysUntil(key: string): number | null {
  if (!key) return null;
  return Math.round((parseDayKey(key).getTime() - startOfDay()) / DAY_MS);
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 5) return "Boa noite";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
