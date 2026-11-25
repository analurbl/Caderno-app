import type { PlanItem, PlanKind } from "../types";
import { dayKey } from "./time";

export const PLAN_KIND: Record<PlanKind, { label: string; pill: string }> = {
  estudo: { label: "Teoria", pill: "info" },
  questoes: { label: "Questões", pill: "ai" },
  revisao: { label: "Revisão", pill: "warn" },
  simulado: { label: "Simulado", pill: "bad" },
  tarefa: { label: "Tarefa", pill: "" },
  marco: { label: "Data importante", pill: "bad" },
};

export function itemsOn(plan: PlanItem[], date: string): PlanItem[] {
  return plan.filter((p) => p.date === date).sort((a, b) => (a.start || "00:00").localeCompare(b.start || "00:00"));
}

/** Blocos de estudo do dia (sem os marcos de dia inteiro). */
export function blocksOn(plan: PlanItem[], date: string): PlanItem[] {
  return itemsOn(plan, date).filter((p) => p.kind !== "marco");
}

/** Próximo dia (a partir de amanhã) que tem blocos de estudo. */
export function nextPlannedDay(plan: PlanItem[], after = dayKey()): string | null {
  const days = plan.filter((p) => p.kind !== "marco" && p.date > after).map((p) => p.date).sort();
  return days[0] ?? null;
}

export function upcomingMilestones(plan: PlanItem[], from = dayKey(), withinDays = 10): PlanItem[] {
  const limit = new Date();
  limit.setDate(limit.getDate() + withinDays);
  const max = dayKey(limit);
  return plan.filter((p) => p.kind === "marco" && p.date >= from && p.date <= max).sort((a, b) => a.date.localeCompare(b.date));
}

export function fmtSpan(p: PlanItem): string {
  if (!p.start) return "Dia todo";
  const f = (t: string) => t.replace(/^0/, "").replace(":00", "h").replace(":", "h");
  return p.end ? `${f(p.start)}–${f(p.end)}` : f(p.start);
}

/** Para onde o botão do bloco leva: estudar com cronômetro ou praticar questões. */
export function planLink(p: PlanItem): string | null {
  if (p.kind === "questoes" || p.kind === "simulado") {
    const q = p.topicId ? `assunto=${p.topicId}` : p.subjectId ? `materia=${p.subjectId}` : p.notebookId ? `caderno=${p.notebookId}` : "";
    return `/questoes${q ? `?${q}` : ""}`;
  }
  if (p.kind === "marco" || p.kind === "tarefa") return null;
  const params = [p.topicId ? `assunto=${p.topicId}` : p.subjectId ? `materia=${p.subjectId}` : p.notebookId ? `caderno=${p.notebookId}` : ""];
  const min = blockMinutes(p);
  if (min) params.push(`min=${min}`);
  const q = params.filter(Boolean).join("&");
  return `/estudar${q ? `?${q}` : ""}`;
}

/** Duração do bloco em minutos (0 se não houver horário). */
export function blockMinutes(p: PlanItem): number {
  if (!p.start || !p.end) return 0;
  const m = (t: string) => {
    const [h, mi] = t.split(":").map(Number);
    return h * 60 + mi;
  };
  return Math.max(0, m(p.end) - m(p.start));
}
