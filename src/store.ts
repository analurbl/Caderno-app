import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Account,
  ActiveSession,
  Answer,
  ErrorEntry,
  Goal,
  ID,
  Notebook,
  PlanItem,
  Preferences,
  QuestionList,
  Review,
  StudySession,
  Subject,
  Topic,
} from "./types";
import { activeElapsed, activePaused, dayKey, uid } from "./lib/time";
import { kitToRecords, type StudyKit } from "./lib/kit";
import type { StudyUpdate } from "./lib/updates";

export const NOTEBOOK_COLORS = ["#A879E8", "#F3B8CF", "#F7DF83", "#A9DED2", "#B9D0F2", "#F29A91"];
export const NOTEBOOK_ICONS = ["📘", "🩺", "⚖️", "🧠", "🫀", "🧮", "✍️", "🌎", "💼", "🔬", "🏛️", "💡", "📐"];

export const defaultPreferences: Preferences = {
  objetivo: "",
  prova: "",
  banca: "nao_sei",
  dailyMinutes: 60,
  studyDays: [1, 2, 3, 4, 5],
  autoSaveErrors: true,
  aiConsent: false,
  reduceMotion: false,
  theme: "system",
  notifications: {
    studyReminder: false,
    reminderTime: "19:00",
    dailyGoal: false,
    reviews: true,
    weeklySummary: true,
    achievements: true,
  },
  setupDone: false,
  appliedKits: [],
  appliedUpdates: [],
};

export interface State {
  account: Account | null;
  loggedIn: boolean;
  prefs: Preferences;
  notebooks: Notebook[];
  subjects: Subject[];
  topics: Topic[];
  sessions: StudySession[];
  active: ActiveSession | null;
  goals: Goal[];
  lists: QuestionList[];
  errors: ErrorEntry[];
  reviews: Review[];
  plan: PlanItem[];
  /** Últimas atualizações recebidas pelo canal (para o aviso no início). */
  updateLog: { id: string; title: string; summary: string; at: number }[];
  lastContext?: { notebookId?: ID; subjectId?: ID; topicId?: ID };
}

interface Actions {
  signUp(a: Account): void;
  logIn(): void;
  logOut(): void;
  deleteAllData(): void;
  importData(data: Partial<State>): void;
  applyKit(kit: StudyKit): void;
  setPlanDone(id: ID, done: boolean): void;
  applyUpdates(updates: StudyUpdate[]): number;
  /** Marca como feitos os blocos de questões de hoje ligados a esta matéria. */
  completePlannedPractice(subjectId?: ID): void;
  setPrefs(p: Partial<Preferences>): void;

  addNotebook(n: Partial<Notebook> & { name: string }): ID;
  updateNotebook(id: ID, p: Partial<Notebook>): void;
  duplicateNotebook(id: ID): ID | null;
  removeNotebook(id: ID): void;
  moveNotebook(id: ID, dir: -1 | 1): void;
  touchNotebook(id: ID): void;

  addSubject(s: Partial<Subject> & { name: string; notebookId: ID }): ID;
  updateSubject(id: ID, p: Partial<Subject>): void;
  removeSubject(id: ID): void;
  moveSubject(id: ID, dir: -1 | 1): void;

  addTopic(t: Partial<Topic> & { name: string; subjectId: ID }): ID;
  updateTopic(id: ID, p: Partial<Topic>): void;
  removeTopic(id: ID): void;

  startSession(ctx: { notebookId?: ID; subjectId?: ID; topicId?: ID; targetMin: number }): void;
  setActiveContext(ctx: { notebookId?: ID; subjectId?: ID; topicId?: ID }): void;
  setActiveNote(note: string): void;
  pauseSession(at?: number): void;
  resumeSession(): void;
  heartbeat(): void;
  finishSession(opts?: { endAt?: number }): StudySession | null;
  discardSession(): void;
  addSession(s: Omit<StudySession, "id">): void;
  updateSession(id: ID, p: Partial<StudySession>): void;
  removeSession(id: ID): void;

  addGoal(g: Omit<Goal, "id" | "createdAt" | "history" | "paused">): void;
  updateGoal(id: ID, p: Partial<Goal>): void;
  removeGoal(id: ID): void;

  addList(l: QuestionList): void;
  updateList(id: ID, p: Partial<QuestionList>): void;
  setAnswer(listId: ID, qid: ID, a: Partial<Answer>): void;
  reportQuestion(listId: ID, qid: ID, reason: string): void;
  removeList(id: ID): void;

  addErrors(e: Omit<ErrorEntry, "id" | "addedAt">[]): void;
  updateError(id: ID, p: Partial<ErrorEntry>): void;
  removeError(id: ID): void;

  addReview(topicId: ID, date: string): void;
  toggleReview(id: ID): void;
  removeReview(id: ID): void;
}

const emptyData = (): Omit<State, "account" | "loggedIn" | "prefs"> => ({
  notebooks: [],
  subjects: [],
  topics: [],
  sessions: [],
  active: null,
  goals: [],
  lists: [],
  errors: [],
  reviews: [],
  plan: [],
  updateLog: [],
  lastContext: undefined,
});

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      account: null,
      loggedIn: false,
      prefs: defaultPreferences,
      ...emptyData(),

      signUp: (a) => set({ account: a, loggedIn: true }),
      logIn: () => set({ loggedIn: true }),
      logOut: () => set({ loggedIn: false }),
      deleteAllData: () => set({ account: null, loggedIn: false, prefs: defaultPreferences, ...emptyData() }),
      importData: (data) =>
        set((s) => ({
          ...s,
          ...data,
          prefs: { ...defaultPreferences, ...(data.prefs ?? s.prefs) },
          account: s.account,
          loggedIn: s.loggedIn,
        })),
      applyKit: (kit) =>
        set((s) => {
          const r = kitToRecords(kit);
          const has = <T extends { id: string }>(list: T[]) => {
            const ids = new Set(list.map((x) => x.id));
            return (x: { id: string }) => !ids.has(x.id);
          };
          const firstTime = !s.prefs.appliedKits.includes(kit.id);
          // Uma atualização de um plano já carregado não reaplica as preferências.
          const prefsKnown = !firstTime || (kit.supersedes ?? []).some((k) => s.prefs.appliedKits.includes(k));
          const planIds = new Set(s.plan.map((x) => x.id));
          const reviewIds = new Set(s.reviews.map((x) => x.id));
          const goalIds = new Set(s.goals.map((x) => x.id));
          const now = Date.now();
          return {
            notebooks: [...s.notebooks, ...r.notebooks.filter(has(s.notebooks)).map((n, i) => ({ ...n, order: s.notebooks.length + i }))],
            subjects: [...s.subjects, ...r.subjects.filter(has(s.subjects))],
            topics: [...s.topics, ...r.topics.filter(has(s.topics))],
            sessions: [...s.sessions, ...r.sessions.filter(has(s.sessions))],
            goals: [
              ...s.goals,
              ...(kit.goals ?? [])
                .filter((g) => !goalIds.has(g.id))
                .map((g) => ({ id: g.id, type: g.type, target: g.target, subjectId: g.subjectId, days: g.days ?? s.prefs.studyDays, paused: false, createdAt: now, history: [{ changedAt: now, target: g.target }] })),
            ],
            reviews: [...s.reviews, ...(kit.reviews ?? []).filter((x) => !reviewIds.has(x.id)).map((x) => ({ ...x, done: false }))],
            plan: [...s.plan, ...(kit.plan ?? []).filter((x) => !planIds.has(x.id)).map((x) => ({ ...x, start: x.start ?? "", end: x.end ?? "", done: false }))],
            // As preferências do plano só entram na primeira vez, para não desfazer ajustes posteriores.
            prefs: {
              ...s.prefs,
              ...(prefsKnown ? {} : kit.prefs ?? {}),
              setupDone: true,
              appliedKits: firstTime ? [...s.prefs.appliedKits, kit.id] : s.prefs.appliedKits,
            },
          };
        }),
      applyUpdates: (updates) => {
        const pending = updates.filter((u) => !get().prefs.appliedUpdates.includes(u.id));
        if (!pending.length) return 0;
        set((s) => {
          let { topics, sessions, reviews, plan, errors } = s;
          const now = Date.now();
          const subNb = new Map(s.subjects.map((x) => [x.id, x.notebookId]));
          const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
          for (const u of pending) {
            const r = kitToRecords({ kind: "kit", id: u.id, title: u.title, notebooks: [], subjects: [], topics: u.topics ?? [], sessions: u.sessions ?? [] });
            const topicIds = new Set(topics.map((t) => t.id));
            topics = [...topics, ...r.topics.filter((t) => !topicIds.has(t.id) && subNb.has(t.subjectId))];
            const sessionIds = new Set(sessions.map((x) => x.id));
            sessions = [...sessions, ...r.sessions.filter((x) => !sessionIds.has(x.id)).map((x) => ({ ...x, notebookId: x.subjectId ? subNb.get(x.subjectId) : undefined }))];
            const reviewIds = new Set(reviews.map((x) => x.id));
            reviews = [...reviews, ...(u.reviews ?? []).filter((x) => !reviewIds.has(x.id)).map((x) => ({ ...x, done: false }))];
            const planIds = new Set(plan.map((x) => x.id));
            plan = [...plan, ...(u.plan ?? []).filter((x) => !planIds.has(x.id)).map((x) => ({ ...x, start: x.start ?? "", end: x.end ?? "", done: false }))];
            if (u.planDone?.length) plan = plan.map((p) => (u.planDone!.includes(p.id) && !p.done ? { ...p, done: true, doneAt: now } : p));
            for (const patch of u.topicPatches ?? []) {
              topics = topics.map((t) => {
                if (t.id !== patch.topicId) return t;
                const header = `— Do seu resumo (${fmt.format(new Date(u.createdAt))}) —`;
                const notes = patch.appendNotes?.trim() ? `${t.notes.trim()}${t.notes.trim() ? "\n\n" : ""}${header}\n${patch.appendNotes.trim()}` : t.notes;
                return { ...t, notes, status: patch.status ?? t.status, lastReview: patch.lastReview ?? t.lastReview };
              });
            }
            const errorIds = new Set(errors.map((e) => e.question.id));
            errors = [
              ...(u.errors ?? [])
                .filter((e) => !errorIds.has(e.id))
                .map((e) => ({
                  id: e.id,
                  question: { ...e.question, id: e.id },
                  banca: e.banca ?? "Geral",
                  subjectId: e.subjectId,
                  notebookId: e.subjectId ? subNb.get(e.subjectId) : undefined,
                  choice: e.choice ?? "",
                  status: "pendente" as const,
                  personalNote: "",
                  addedAt: now,
                  manual: false,
                })),
              ...errors,
            ];
          }
          return {
            topics,
            sessions,
            reviews,
            plan,
            errors,
            updateLog: [...pending.map((u) => ({ id: u.id, title: u.title, summary: u.summary ?? "", at: now })), ...s.updateLog].slice(0, 10),
            prefs: { ...s.prefs, appliedUpdates: [...s.prefs.appliedUpdates, ...pending.map((u) => u.id)] },
          };
        });
        return pending.length;
      },
      setPlanDone: (id, done) =>
        set((s) => ({ plan: s.plan.map((p) => (p.id === id ? { ...p, done, doneAt: done ? Date.now() : undefined } : p)) })),
      completePlannedPractice: (subjectId) =>
        set((s) => {
          const today = dayKey();
          return {
            plan: s.plan.map((p) =>
              p.date === today && !p.done && (p.kind === "questoes" || p.kind === "simulado") && subjectId && p.subjectId === subjectId ? { ...p, done: true, doneAt: Date.now() } : p,
            ),
          };
        }),
      setPrefs: (p) => set((s) => ({ prefs: { ...s.prefs, ...p } })),

      /* Cadernos */
      addNotebook: (n) => {
        const id = uid();
        set((s) => ({
          notebooks: [
            ...s.notebooks,
            {
              id,
              description: "",
              color: NOTEBOOK_COLORS[s.notebooks.length % NOTEBOOK_COLORS.length],
              icon: NOTEBOOK_ICONS[0],
              objetivo: "",
              examDate: "",
              weeklyGoalMin: 0,
              archived: false,
              order: s.notebooks.length,
              createdAt: Date.now(),
              ...n,
            },
          ],
        }));
        return id;
      },
      updateNotebook: (id, p) => set((s) => ({ notebooks: s.notebooks.map((n) => (n.id === id ? { ...n, ...p } : n)) })),
      duplicateNotebook: (id) => {
        const s = get();
        const nb = s.notebooks.find((n) => n.id === id);
        if (!nb) return null;
        const newId = uid();
        const subjects: Subject[] = [];
        const topics: Topic[] = [];
        for (const sub of s.subjects.filter((x) => x.notebookId === id)) {
          const sid = uid();
          subjects.push({ ...sub, id: sid, notebookId: newId, createdAt: Date.now(), lastAccess: undefined });
          for (const t of s.topics.filter((x) => x.subjectId === sub.id)) {
            topics.push({ ...t, id: uid(), subjectId: sid, status: "nao_iniciado", lastReview: undefined, createdAt: Date.now() });
          }
        }
        set({
          notebooks: [...s.notebooks, { ...nb, id: newId, name: `${nb.name} (cópia)`, order: s.notebooks.length, createdAt: Date.now(), lastAccess: undefined }],
          subjects: [...s.subjects, ...subjects],
          topics: [...s.topics, ...topics],
        });
        return newId;
      },
      removeNotebook: (id) =>
        set((s) => {
          const subjectIds = new Set(s.subjects.filter((x) => x.notebookId === id).map((x) => x.id));
          const topicIds = new Set(s.topics.filter((t) => subjectIds.has(t.subjectId)).map((t) => t.id));
          return {
            notebooks: s.notebooks.filter((n) => n.id !== id),
            subjects: s.subjects.filter((x) => x.notebookId !== id),
            topics: s.topics.filter((t) => !subjectIds.has(t.subjectId)),
            reviews: s.reviews.filter((r) => !topicIds.has(r.topicId)),
            goals: s.goals.filter((g) => !g.subjectId || !subjectIds.has(g.subjectId)),
            plan: s.plan.map((p) => (p.notebookId === id || (p.subjectId && subjectIds.has(p.subjectId)) ? { ...p, notebookId: undefined, subjectId: undefined, topicId: undefined } : p)),
            // Sessões permanecem no histórico de tempo, sem vínculo com o caderno removido.
            sessions: s.sessions.map((x) =>
              x.notebookId === id ? { ...x, notebookId: undefined, subjectId: undefined, topicId: undefined } : x,
            ),
          };
        }),
      moveNotebook: (id, dir) =>
        set((s) => {
          const sorted = [...s.notebooks].sort((a, b) => a.order - b.order);
          const i = sorted.findIndex((n) => n.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= sorted.length) return {};
          [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
          return { notebooks: sorted.map((n, order) => ({ ...n, order })) };
        }),
      touchNotebook: (id) => set((s) => ({ notebooks: s.notebooks.map((n) => (n.id === id ? { ...n, lastAccess: Date.now() } : n)) })),

      /* Matérias */
      addSubject: (sub) => {
        const id = uid();
        set((s) => ({
          subjects: [
            ...s.subjects,
            {
              id,
              priority: "media",
              goalMinPerWeek: 0,
              archived: false,
              order: s.subjects.filter((x) => x.notebookId === sub.notebookId).length,
              createdAt: Date.now(),
              ...sub,
            },
          ],
        }));
        return id;
      },
      updateSubject: (id, p) =>
        set((s) => {
          const sub = s.subjects.find((x) => x.id === id);
          const movedTo = p.notebookId && sub && p.notebookId !== sub.notebookId ? p.notebookId : null;
          return {
            subjects: s.subjects.map((x) => (x.id === id ? { ...x, ...p } : x)),
            sessions: movedTo ? s.sessions.map((x) => (x.subjectId === id ? { ...x, notebookId: movedTo } : x)) : s.sessions,
          };
        }),
      removeSubject: (id) =>
        set((s) => {
          const topicIds = new Set(s.topics.filter((t) => t.subjectId === id).map((t) => t.id));
          return {
            subjects: s.subjects.filter((x) => x.id !== id),
            topics: s.topics.filter((t) => t.subjectId !== id),
            reviews: s.reviews.filter((r) => !topicIds.has(r.topicId)),
            goals: s.goals.filter((g) => g.subjectId !== id),
            plan: s.plan.map((p) => (p.subjectId === id ? { ...p, subjectId: undefined, topicId: undefined } : p)),
            sessions: s.sessions.map((x) => (x.subjectId === id ? { ...x, subjectId: undefined, topicId: undefined } : x)),
          };
        }),
      moveSubject: (id, dir) =>
        set((s) => {
          const sub = s.subjects.find((x) => x.id === id);
          if (!sub) return {};
          const sorted = s.subjects.filter((x) => x.notebookId === sub.notebookId).sort((a, b) => a.order - b.order);
          const i = sorted.findIndex((x) => x.id === id);
          const j = i + dir;
          if (j < 0 || j >= sorted.length) return {};
          [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
          const orders = new Map(sorted.map((x, order) => [x.id, order]));
          return { subjects: s.subjects.map((x) => (orders.has(x.id) ? { ...x, order: orders.get(x.id)! } : x)) };
        }),

      /* Assuntos */
      addTopic: (t) => {
        const id = uid();
        set((s) => ({
          topics: [...s.topics, { id, description: "", notes: "", links: [], status: "nao_iniciado", createdAt: Date.now(), ...t }],
        }));
        return id;
      },
      updateTopic: (id, p) => set((s) => ({ topics: s.topics.map((t) => (t.id === id ? { ...t, ...p } : t)) })),
      removeTopic: (id) =>
        set((s) => ({
          topics: s.topics.filter((t) => t.id !== id),
          reviews: s.reviews.filter((r) => r.topicId !== id),
          sessions: s.sessions.map((x) => (x.topicId === id ? { ...x, topicId: undefined } : x)),
          plan: s.plan.map((p) => (p.topicId === id ? { ...p, topicId: undefined } : p)),
        })),

      /* Sessão de estudo */
      startSession: ({ targetMin, ...ctx }) => {
        if (get().active) return; // evita sessões duplicadas
        const now = Date.now();
        set({
          active: { ...ctx, startedAt: now, accumulatedSec: 0, runningSince: now, pausedSec: 0, pausedSince: null, targetMin, note: "", heartbeat: now },
          lastContext: ctx,
        });
      },
      setActiveContext: (ctx) => set((s) => (s.active ? { active: { ...s.active, ...ctx }, lastContext: ctx } : {})),
      setActiveNote: (note) => set((s) => (s.active ? { active: { ...s.active, note } } : {})),
      pauseSession: (at) =>
        set((s) => {
          const a = s.active;
          if (!a || !a.runningSince) return {};
          const when = Math.max(a.runningSince, at ?? Date.now());
          return { active: { ...a, accumulatedSec: activeElapsed(a, when), runningSince: null, pausedSince: when, heartbeat: when } };
        }),
      resumeSession: () =>
        set((s) => {
          const a = s.active;
          if (!a || a.runningSince) return {};
          const now = Date.now();
          return { active: { ...a, pausedSec: activePaused(a, now), pausedSince: null, runningSince: now, heartbeat: now } };
        }),
      heartbeat: () => set((s) => (s.active ? { active: { ...s.active, heartbeat: Date.now() } } : {})),
      finishSession: (opts) => {
        const a = get().active;
        if (!a) return null;
        const end = opts?.endAt ?? Date.now();
        const durationSec = activeElapsed(a, a.runningSince ? Math.max(end, a.runningSince) : end);
        const session: StudySession = {
          id: uid(),
          notebookId: a.notebookId,
          subjectId: a.subjectId,
          topicId: a.topicId,
          start: a.startedAt,
          end,
          durationSec,
          pauseSec: activePaused(a, end),
          note: a.note,
        };
        set((s) => {
          const touched = Date.now();
          return {
            active: null,
            sessions: durationSec > 0 ? [...s.sessions, session] : s.sessions,
            notebooks: s.notebooks.map((n) => (n.id === a.notebookId ? { ...n, lastAccess: touched } : n)),
            subjects: s.subjects.map((x) => (x.id === a.subjectId ? { ...x, lastAccess: touched } : x)),
            topics: s.topics.map((t) => (t.id === a.topicId && t.status === "nao_iniciado" ? { ...t, status: "estudando" } : t)),
            // Bloco de hoje do cronograma que corresponde a esta sessão fica marcado como feito.
            plan:
              durationSec > 0
                ? s.plan.map((p) => {
                    if (p.done || p.date !== dayKey(a.startedAt) || !(p.kind === "estudo" || p.kind === "revisao")) return p;
                    const match = p.topicId ? p.topicId === a.topicId : Boolean(p.subjectId) && p.subjectId === a.subjectId;
                    return match ? { ...p, done: true, doneAt: touched } : p;
                  })
                : s.plan,
          };
        });
        return durationSec > 0 ? session : null;
      },
      discardSession: () => set({ active: null }),
      addSession: (sess) => set((s) => ({ sessions: [...s.sessions, { ...sess, id: uid() }] })),
      updateSession: (id, p) =>
        set((s) => ({
          sessions: s.sessions.map((x) => {
            if (x.id !== id) return x;
            // Marca como "editada" só quando o tempo registrado muda (histórico consistente).
            const timeChanged = (p.start !== undefined && p.start !== x.start) || (p.durationSec !== undefined && p.durationSec !== x.durationSec);
            return { ...x, ...p, editedAt: timeChanged ? Date.now() : x.editedAt };
          }),
        })),
      removeSession: (id) => set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) })),

      /* Metas */
      addGoal: (g) =>
        set((s) => ({
          goals: [...s.goals, { ...g, id: uid(), createdAt: Date.now(), paused: false, history: [{ changedAt: Date.now(), target: g.target }] }],
        })),
      updateGoal: (id, p) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id
              ? {
                  ...g,
                  ...p,
                  history: p.target !== undefined && p.target !== g.target ? [...g.history, { changedAt: Date.now(), target: p.target }] : g.history,
                }
              : g,
          ),
        })),
      removeGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

      /* Listas de questões */
      addList: (l) => set((s) => ({ lists: [l, ...s.lists] })),
      updateList: (id, p) => set((s) => ({ lists: s.lists.map((l) => (l.id === id ? { ...l, ...p } : l)) })),
      setAnswer: (listId, qid, a) =>
        set((s) => ({
          lists: s.lists.map((l) => {
            if (l.id !== listId) return l;
            const prev: Answer = l.answers[qid] ?? { choice: "", correct: null, timeSec: 0, flagged: false, confirmed: false };
            return { ...l, answers: { ...l.answers, [qid]: { ...prev, ...a } } };
          }),
        })),
      reportQuestion: (listId, qid, reason) =>
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === listId ? { ...l, questions: l.questions.map((q) => (q.id === qid ? { ...q, reported: { reason, at: Date.now() } } : q)) } : l,
          ),
        })),
      removeList: (id) => set((s) => ({ lists: s.lists.filter((l) => l.id !== id) })),

      /* Caderno de erros */
      addErrors: (entries) =>
        set((s) => {
          const existing = new Set(s.errors.map((e) => e.question.id));
          const fresh = entries.filter((e) => !existing.has(e.question.id)).map((e) => ({ ...e, id: uid(), addedAt: Date.now() }));
          // Uma questão já salva que foi errada de novo volta a ficar pendente.
          const again = new Set(entries.filter((e) => existing.has(e.question.id)).map((e) => e.question.id));
          return {
            errors: [
              ...fresh,
              ...s.errors.map((e) => (again.has(e.question.id) ? { ...e, status: "pendente" as const } : e)),
            ],
          };
        }),
      updateError: (id, p) => set((s) => ({ errors: s.errors.map((e) => (e.id === id ? { ...e, ...p } : e)) })),
      removeError: (id) => set((s) => ({ errors: s.errors.filter((e) => e.id !== id) })),

      /* Revisões */
      addReview: (topicId, date) => set((s) => ({ reviews: [...s.reviews, { id: uid(), topicId, date, done: false }] })),
      toggleReview: (id) =>
        set((s) => {
          const r = s.reviews.find((x) => x.id === id);
          if (!r) return {};
          const done = !r.done;
          return {
            reviews: s.reviews.map((x) => (x.id === id ? { ...x, done, doneAt: done ? Date.now() : undefined } : x)),
            topics: done ? s.topics.map((t) => (t.id === r.topicId ? { ...t, lastReview: r.date } : t)) : s.topics,
          };
        }),
      removeReview: (id) => set((s) => ({ reviews: s.reviews.filter((r) => r.id !== id) })),
    }),
    {
      name: "caderno:v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return { ...current, ...p, prefs: { ...defaultPreferences, ...(p.prefs ?? {}), notifications: { ...defaultPreferences.notifications, ...(p.prefs?.notifications ?? {}) } } };
      },
    },
  ),
);

/** Exporta todos os dados de estudo (sem o hash de senha). */
export function exportData(): string {
  const { account, ...s } = useStore.getState();
  const data = Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== "function"));
  return JSON.stringify({ app: "caderno", version: 1, exportedAt: new Date().toISOString(), account: account ? { name: account.name, email: account.email } : null, data }, null, 2);
}
