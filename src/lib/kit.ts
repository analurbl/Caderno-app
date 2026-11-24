import type { Banca, GoalType, Notebook, Preferences, Priority, StudySession, Subject, Topic, TopicStatus } from "../types";
import { parseDayKey } from "./time";

/**
 * Plano de estudos pronto para carregar ("kit"): cadernos, matérias, assuntos com
 * anotações, metas, revisões e histórico. Os ids são fixos, então carregar o mesmo
 * plano de novo não duplica nada: só entra o que ainda não existe.
 */
export interface StudyKit {
  kind: "kit";
  id: string;
  title: string;
  summary?: string;
  prefs?: Partial<Pick<Preferences, "objetivo" | "prova" | "dailyMinutes" | "studyDays">> & { banca?: Banca };
  notebooks: { id: string; name: string; description?: string; color?: string; icon?: string; objetivo?: string; examDate?: string; weeklyGoalMin?: number }[];
  subjects: { id: string; notebookId: string; name: string; priority?: Priority; goalMinPerWeek?: number }[];
  topics: { id: string; subjectId: string; name: string; description?: string; notes?: string; status?: TopicStatus; lastReview?: string }[];
  /** Horário local: `date` aaaa-mm-dd e `time` hh:mm. */
  sessions?: { id: string; date: string; time: string; minutes: number; subjectId?: string; topicId?: string; note?: string }[];
  goals?: { id: string; type: GoalType; target: number; subjectId?: string; days?: number[] }[];
  reviews?: { id: string; topicId: string; date: string }[];
}

declare const __KIT__: StudyKit | null;

/** Plano embutido na build (opcional, definido por KIT_FILE ao compilar). */
export const BUNDLED_KIT: StudyKit | null = typeof __KIT__ !== "undefined" ? __KIT__ : null;

export function isKit(v: unknown): v is StudyKit {
  const k = v as StudyKit;
  return Boolean(k && k.kind === "kit" && typeof k.id === "string" && Array.isArray(k.notebooks) && Array.isArray(k.subjects) && Array.isArray(k.topics));
}

export function kitCounts(k: StudyKit) {
  return { notebooks: k.notebooks.length, subjects: k.subjects.length, topics: k.topics.length, sessions: k.sessions?.length ?? 0, goals: k.goals?.length ?? 0, reviews: k.reviews?.length ?? 0 };
}

/** Converte o plano para os registros do app (no fuso horário de quem usa). */
export function kitToRecords(k: StudyKit, now = Date.now()) {
  const notebooks: Notebook[] = k.notebooks.map((n, i) => ({
    id: n.id,
    name: n.name,
    description: n.description ?? "",
    color: n.color ?? "#A879E8",
    icon: n.icon ?? "📘",
    objetivo: n.objetivo ?? "",
    examDate: n.examDate ?? "",
    weeklyGoalMin: n.weeklyGoalMin ?? 0,
    archived: false,
    order: i,
    createdAt: now,
  }));
  const subjects: Subject[] = k.subjects.map((s, i) => ({
    id: s.id,
    notebookId: s.notebookId,
    name: s.name,
    priority: s.priority ?? "media",
    goalMinPerWeek: s.goalMinPerWeek ?? 0,
    archived: false,
    order: i,
    createdAt: now,
  }));
  const topics: Topic[] = k.topics.map((t) => ({
    id: t.id,
    subjectId: t.subjectId,
    name: t.name,
    description: t.description ?? "",
    notes: t.notes ?? "",
    links: [],
    status: t.status ?? "nao_iniciado",
    lastReview: t.lastReview,
    createdAt: now,
  }));
  const subjectNb = new Map(subjects.map((s) => [s.id, s.notebookId]));
  const sessions: StudySession[] = (k.sessions ?? []).map((s) => {
    const [hh, mm] = s.time.split(":").map(Number);
    const start = parseDayKey(s.date).getTime() + (hh * 60 + mm) * 60_000;
    return {
      id: s.id,
      subjectId: s.subjectId,
      topicId: s.topicId,
      notebookId: s.subjectId ? subjectNb.get(s.subjectId) : undefined,
      start,
      end: start + s.minutes * 60_000,
      durationSec: s.minutes * 60,
      pauseSec: 0,
      note: s.note ?? "",
    };
  });
  // Último acesso de cadernos e matérias = fim da sessão mais recente do plano.
  const last = new Map<string, number>();
  for (const x of sessions) for (const key of [x.subjectId, x.notebookId]) if (key) last.set(key, Math.max(last.get(key) ?? 0, x.end));
  for (const n of notebooks) n.lastAccess = last.get(n.id);
  for (const x of subjects) x.lastAccess = last.get(x.id);
  return { notebooks, subjects, topics, sessions };
}
