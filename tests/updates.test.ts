import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "../src/store";
import type { StudyUpdate } from "../src/lib/updates";

const base = {
  kind: "kit" as const,
  id: "k",
  title: "Plano",
  notebooks: [{ id: "n", name: "Caderno" }],
  subjects: [{ id: "s", notebookId: "n", name: "SUS" }],
  topics: [{ id: "t1", subjectId: "s", name: "Lei 8.080", notes: "Nota antiga" }],
  plan: [{ id: "p1", date: "2026-11-25", start: "07:30", end: "09:00", title: "Lei 8.080", kind: "estudo" as const, subjectId: "s", topicId: "t1" }],
};

const u1: StudyUpdate = {
  id: "u1",
  createdAt: "2026-11-25T15:00:00Z",
  title: "Quarta, 25/11",
  summary: "Lei 8.080: 8/10",
  topicPatches: [{ topicId: "t1", status: "revisar", appendNotes: "Questões: 8/10." }],
  topics: [{ id: "t2", subjectId: "s", name: "Lei 8.142" }, { id: "tx", subjectId: "nao-existe", name: "Órfão" }],
  sessions: [{ id: "x1", date: "2026-11-25", time: "07:30", minutes: 90, subjectId: "s", topicId: "t1" }],
  planDone: ["p1"],
  errors: [
    {
      id: "e1",
      subjectId: "s",
      banca: "Instituto Avalia",
      choice: "A",
      question: { assunto: "Lei 8.080", enunciado: "Q?", alternativas: [{ letra: "A", texto: "a" }, { letra: "B", texto: "b" }], correta: "B", resposta_esperada: "", explicacao: "Porque B.", comentarios_alternativas: [], dica: "", dificuldade: "intermediaria", base: "conhecimento_geral", incerteza: "" },
    },
  ],
};

describe("canal de atualizações", () => {
  beforeEach(() => {
    useStore.getState().deleteAllData();
    useStore.getState().applyKit(base);
  });

  it("aplica uma vez: anotações, status, assuntos, sessões, cronograma e erros", () => {
    expect(useStore.getState().applyUpdates([u1])).toBe(1);
    expect(useStore.getState().applyUpdates([u1])).toBe(0);
    const s = useStore.getState();
    const t1 = s.topics.find((t) => t.id === "t1")!;
    expect(t1.status).toBe("revisar");
    expect(t1.notes.startsWith("Nota antiga")).toBe(true);
    expect(t1.notes).toContain("Questões: 8/10.");
    expect(t1.notes.match(/Questões: 8\/10/g)).toHaveLength(1);
    expect(s.topics.map((t) => t.id)).toEqual(["t1", "t2"]);
    expect(s.sessions[0]).toMatchObject({ id: "x1", notebookId: "n" });
    expect(s.plan[0].done).toBe(true);
    expect(s.errors[0]).toMatchObject({ id: "e1", notebookId: "n", choice: "A", status: "pendente" });
    expect(s.errors[0].question.id).toBe("e1");
    expect(s.updateLog[0]).toMatchObject({ id: "u1", title: "Quarta, 25/11" });
  });
});
