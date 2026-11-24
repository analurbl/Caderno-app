export type ID = string;

export type Banca = "FGV" | "AOCP" | "Instituto Avalia" | "Outra" | "Geral";
export type Dificuldade = "facil" | "intermediaria" | "dificil" | "mista";
export type Formato = "multipla" | "certo_errado" | "discursiva";
export type TopicStatus = "nao_iniciado" | "estudando" | "revisar" | "concluido";
export type Priority = "baixa" | "media" | "alta";

export interface Account {
  name: string;
  email: string;
  passwordHash: string;
  createdAt: number;
}

export interface Preferences {
  objetivo: string;
  prova: string;
  banca: Banca | "nao_sei";
  dailyMinutes: number;
  studyDays: number[]; // 0 = domingo
  autoSaveErrors: boolean;
  aiConsent: boolean;
  reduceMotion: boolean;
  theme: "system" | "light" | "dark";
  notifications: {
    studyReminder: boolean;
    reminderTime: string;
    dailyGoal: boolean;
    reviews: boolean;
    weeklySummary: boolean;
    achievements: boolean;
  };
  setupDone: boolean;
}

export interface Notebook {
  id: ID;
  name: string;
  description: string;
  color: string;
  icon: string;
  objetivo: string;
  examDate: string; // yyyy-mm-dd
  weeklyGoalMin: number;
  archived: boolean;
  order: number;
  createdAt: number;
  lastAccess?: number;
}

export interface Subject {
  id: ID;
  notebookId: ID;
  name: string;
  priority: Priority;
  goalMinPerWeek: number;
  archived: boolean;
  order: number;
  createdAt: number;
  lastAccess?: number;
}

export interface Topic {
  id: ID;
  subjectId: ID;
  name: string;
  description: string;
  notes: string;
  links: string[];
  status: TopicStatus;
  lastReview?: string; // yyyy-mm-dd
  createdAt: number;
}

export interface StudySession {
  id: ID;
  notebookId?: ID;
  subjectId?: ID;
  topicId?: ID;
  start: number;
  end: number;
  durationSec: number;
  pauseSec: number;
  note: string;
  feeling?: "otimo" | "bom" | "dificil";
  editedAt?: number;
}

export interface ActiveSession {
  notebookId?: ID;
  subjectId?: ID;
  topicId?: ID;
  startedAt: number;
  accumulatedSec: number; // tempo efetivo acumulado até a última pausa
  runningSince: number | null; // null = pausado
  pausedSec: number;
  pausedSince: number | null;
  targetMin: number; // 0 = sessão livre
  note: string;
  heartbeat: number;
}

export type GoalType = "daily_time" | "weekly_time" | "subject_time" | "weekly_questions" | "weekly_topics";

export interface Goal {
  id: ID;
  type: GoalType;
  target: number; // minutos ou quantidade
  subjectId?: ID;
  days: number[]; // dias em que a meta vale (para metas diárias)
  paused: boolean;
  createdAt: number;
  history: { changedAt: number; target: number }[];
}

export interface Alternative {
  letra: string;
  texto: string;
}

export interface Question {
  id: ID;
  assunto: string;
  enunciado: string;
  alternativas: Alternative[];
  correta: string;
  resposta_esperada: string;
  explicacao: string;
  comentarios_alternativas: { letra: string; comentario: string }[];
  dica: string;
  dificuldade: "facil" | "intermediaria" | "dificil";
  base: "material_do_usuario" | "conhecimento_geral";
  incerteza: string;
  reported?: { reason: string; at: number };
}

export interface ListConfig {
  banca: Banca;
  bancaOutra?: string;
  quantidade: number;
  dificuldade: Dificuldade;
  formato: Formato;
  modo: "treino" | "simulado";
  incluirComentarios: boolean;
  priorizarFracos: boolean;
  notebookId?: ID;
  subjectId?: ID;
  topicIds: ID[];
  fonte: "assuntos" | "texto" | "anotacoes";
  texto?: string;
}

export interface Answer {
  choice: string; // letra ou texto discursivo
  correct: boolean | null; // null = não respondida / discursiva sem autoavaliação
  timeSec: number;
  flagged: boolean;
  confirmed: boolean;
}

export interface QuestionList {
  id: ID;
  title: string;
  config: ListConfig;
  questions: Question[];
  answers: Record<ID, Answer>;
  aviso: string;
  createdAt: number;
  finishedAt?: number;
  totalSec: number;
  current: number;
  origin: "ia" | "refazer";
}

export interface ErrorEntry {
  id: ID;
  question: Question;
  banca: Banca;
  bancaOutra?: string;
  notebookId?: ID;
  subjectId?: ID;
  choice: string;
  status: "pendente" | "revisada" | "dominada";
  personalNote: string;
  addedAt: number;
  manual: boolean;
}

export interface Review {
  id: ID;
  topicId: ID;
  date: string; // yyyy-mm-dd
  done: boolean;
  doneAt?: number;
}
