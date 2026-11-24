import type { ErrorEntry, Goal, ID, QuestionList, StudySession, Subject, Topic } from "../types";
import { dayKey, startOfDay, startOfWeek, addDays, sumSessions } from "./time";

export const STATUS_LABEL: Record<Topic["status"], string> = {
  nao_iniciado: "Não iniciado",
  estudando: "Estudando",
  revisar: "Revisar",
  concluido: "Concluído",
};

export const PRIORITY_LABEL: Record<Subject["priority"], string> = { baixa: "Baixa", media: "Média", alta: "Alta" };

export const GOAL_LABEL: Record<Goal["type"], string> = {
  daily_time: "Tempo por dia",
  weekly_time: "Tempo por semana",
  subject_time: "Tempo por matéria (semana)",
  weekly_questions: "Questões por semana",
  weekly_topics: "Assuntos estudados por semana",
};

export function topicSeconds(sessions: StudySession[], topicId: ID): number {
  return sessions.reduce((acc, s) => (s.topicId === topicId ? acc + s.durationSec : acc), 0);
}
export function subjectSeconds(sessions: StudySession[], subjectId: ID): number {
  return sessions.reduce((acc, s) => (s.subjectId === subjectId ? acc + s.durationSec : acc), 0);
}
export function notebookSeconds(sessions: StudySession[], notebookId: ID): number {
  return sessions.reduce((acc, s) => (s.notebookId === notebookId ? acc + s.durationSec : acc), 0);
}

/** Progresso = fração de assuntos concluídos (revisar conta metade). */
export function topicsProgress(topics: Topic[]): number {
  if (!topics.length) return 0;
  const score = topics.reduce((acc, t) => acc + (t.status === "concluido" ? 1 : t.status === "revisar" ? 0.5 : t.status === "estudando" ? 0.25 : 0), 0);
  return score / topics.length;
}

export function answeredQuestionsBetween(lists: QuestionList[], from: number, to: number): { total: number; correct: number } {
  let total = 0;
  let correct = 0;
  for (const l of lists) {
    for (const q of l.questions) {
      const a = l.answers[q.id];
      if (!a?.confirmed || a.correct === null) continue;
      const at = l.finishedAt ?? l.createdAt;
      if (at < from || at >= to) continue;
      total++;
      if (a.correct) correct++;
    }
  }
  return { total, correct };
}

export interface GoalProgress {
  goal: Goal;
  done: number;
  target: number;
  unit: "min" | "questões" | "assuntos";
  period: "hoje" | "semana";
  activeToday: boolean;
}

export function goalProgress(goal: Goal, sessions: StudySession[], lists: QuestionList[], now = Date.now()): GoalProgress {
  const today = startOfDay(now);
  const week = startOfWeek(now);
  const nextWeek = addDays(week, 7);
  const activeToday = goal.type !== "daily_time" || goal.days.includes(new Date(now).getDay());
  switch (goal.type) {
    case "daily_time":
      return { goal, done: sumSessions(sessions, today, addDays(today, 1)) / 60, target: goal.target, unit: "min", period: "hoje", activeToday };
    case "weekly_time":
      return { goal, done: sumSessions(sessions, week, nextWeek) / 60, target: goal.target, unit: "min", period: "semana", activeToday };
    case "subject_time":
      return {
        goal,
        done: sumSessions(sessions, week, nextWeek, (s) => s.subjectId === goal.subjectId) / 60,
        target: goal.target,
        unit: "min",
        period: "semana",
        activeToday,
      };
    case "weekly_questions":
      return { goal, done: answeredQuestionsBetween(lists, week, nextWeek).total, target: goal.target, unit: "questões", period: "semana", activeToday };
    case "weekly_topics": {
      const set = new Set(sessions.filter((s) => s.start >= week && s.start < nextWeek && s.topicId).map((s) => s.topicId));
      return { goal, done: set.size, target: goal.target, unit: "assuntos", period: "semana", activeToday };
    }
  }
}

/** Meta diária de tempo: a meta configurada para hoje ou, na ausência, a preferência diária nos dias de estudo. */
export function dailyTargetMin(goals: Goal[], prefsDaily: number, prefsDays: number[], now = Date.now()): number | null {
  const dow = new Date(now).getDay();
  const g = goals.find((x) => x.type === "daily_time" && !x.paused);
  if (g) return g.days.includes(dow) ? g.target : 0;
  if (prefsDaily > 0 && prefsDays.includes(dow)) return prefsDaily;
  return null;
}

/** Desempenho por assunto a partir das listas respondidas. */
export function performanceByTopic(lists: QuestionList[]): { assunto: string; total: number; correct: number }[] {
  const map = new Map<string, { total: number; correct: number }>();
  for (const l of lists) {
    for (const q of l.questions) {
      const a = l.answers[q.id];
      if (!a?.confirmed || a.correct === null) continue;
      const key = q.assunto || "Geral";
      const cur = map.get(key) ?? { total: 0, correct: 0 };
      cur.total++;
      if (a.correct) cur.correct++;
      map.set(key, cur);
    }
  }
  return [...map.entries()].map(([assunto, v]) => ({ assunto, ...v })).sort((a, b) => b.total - a.total);
}

/** Assuntos com mais erros pendentes, usados para "priorizar pontos não dominados". */
export function weakPoints(errors: ErrorEntry[], subjectId?: ID): string[] {
  const counts = new Map<string, number>();
  for (const e of errors) {
    if (e.status === "dominada") continue;
    if (subjectId && e.subjectId !== subjectId) continue;
    counts.set(e.question.assunto, (counts.get(e.question.assunto) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k]) => k);
}

export interface Suggestion {
  kind: "review" | "errors" | "stale" | "questions";
  text: string;
  to: string;
}

export function suggestion(params: {
  topics: Topic[];
  subjects: Subject[];
  sessions: StudySession[];
  errors: ErrorEntry[];
  reviewsDueToday: number;
}): Suggestion | null {
  const { topics, subjects, sessions, errors, reviewsDueToday } = params;
  if (reviewsDueToday > 0)
    return { kind: "review", text: `Você tem ${reviewsDueToday} revisão(ões) para hoje.`, to: "/revisoes" };
  const pending = errors.filter((e) => e.status === "pendente").length;
  if (pending >= 3) return { kind: "errors", text: `${pending} questões no caderno de erros esperando uma nova tentativa.`, to: "/erros" };
  const review = topics.find((t) => t.status === "revisar");
  if (review) {
    const sub = subjects.find((s) => s.id === review.subjectId);
    return { kind: "review", text: `"${review.name}" está marcado para revisar.`, to: sub ? `/assunto/${review.id}` : "/cadernos" };
  }
  // Assunto estudado há mais tempo (pelo menos 10 dias sem contato).
  const last = new Map<string, number>();
  for (const s of sessions) if (s.topicId) last.set(s.topicId, Math.max(last.get(s.topicId) ?? 0, s.end));
  let stale: { id: string; at: number } | null = null;
  for (const [id, at] of last) if (!stale || at < stale.at) stale = { id, at };
  if (stale && Date.now() - stale.at > 10 * 86_400_000) {
    const t = topics.find((x) => x.id === stale!.id);
    if (t) return { kind: "stale", text: `Faz um tempo que você não vê "${t.name}". Que tal uma revisão rápida?`, to: `/assunto/${t.id}` };
  }
  if (sessions.length > 0) return { kind: "questions", text: "Pratique com algumas questões sobre o que estudou recentemente.", to: "/questoes" };
  return null;
}

export function reviewsDue(reviews: { date: string; done: boolean }[], now = Date.now()): number {
  const today = dayKey(now);
  return reviews.filter((r) => !r.done && r.date <= today).length;
}

const MESSAGES = [
  "Um pouco por dia já é constância.",
  "Pausas também fazem parte do caminho.",
  "Revisar é tão importante quanto aprender algo novo.",
  "Errar uma questão hoje é acertar na prova.",
  "Comece pequeno: 25 minutos já contam.",
  "Seu ritmo é o ritmo certo.",
  "Cada sessão registrada é um passo visível.",
];
export function dailyMessage(now = new Date()): string {
  const idx = Math.floor(startOfDay(now) / 86_400_000) % MESSAGES.length;
  return MESSAGES[idx];
}
