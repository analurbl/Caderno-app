import type { Banca, Question } from "../types";
import type { StudyKit } from "./kit";

/**
 * Atualização enviada ao app pelo canal de atualizações (coleção `updates` do
 * banco do artefato). O app aplica cada uma uma única vez, juntando ao que já
 * existe: assuntos novos, anotações acrescentadas, status, sessões, revisões,
 * blocos do cronograma e questões para o caderno de erros.
 */
export interface StudyUpdate {
  id: string;
  createdAt: string; // ISO
  title: string;
  summary?: string;
  topics?: StudyKit["topics"];
  topicPatches?: { topicId: string; status?: "nao_iniciado" | "estudando" | "revisar" | "concluido"; lastReview?: string; appendNotes?: string }[];
  sessions?: NonNullable<StudyKit["sessions"]>;
  reviews?: NonNullable<StudyKit["reviews"]>;
  plan?: NonNullable<StudyKit["plan"]>;
  planDone?: string[];
  errors?: { id: string; subjectId?: string; banca?: Banca; choice?: string; question: Omit<Question, "id" | "reported"> }[];
}

export function isUpdate(v: unknown): v is StudyUpdate {
  const u = v as StudyUpdate;
  return Boolean(u && typeof u.id === "string" && typeof u.title === "string");
}

interface DbLike {
  collection(path: string): { orderBy(f: string): { get(): Promise<{ docs: { id: string; data(): Record<string, unknown> | undefined }[] }> } };
}

let dbPromise: Promise<DbLike | null> | null = null;
function getDb(): Promise<DbLike | null> {
  const c = (window as unknown as { claude?: { use(name: string): Promise<unknown> } }).claude;
  if (!c) return Promise.resolve(null);
  dbPromise ??= c.use("db").then((d) => (d as DbLike | null) ?? null).catch(() => null);
  return dbPromise;
}

/** Lê as atualizações pendentes. Sem o canal (fora do Claude), devolve lista vazia. */
export async function fetchUpdates(): Promise<StudyUpdate[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const snap = await db.collection("updates").orderBy("createdAt").get();
    return snap.docs.map((d) => ({ ...(d.data() ?? {}), id: d.id }) as unknown).filter(isUpdate);
  } catch {
    return [];
  }
}
