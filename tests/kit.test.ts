import { describe, expect, it } from "vitest";
import { useStore } from "../src/store";
import { isKit, type StudyKit } from "../src/lib/kit";

const kit: StudyKit = {
  kind: "kit",
  id: "k1",
  title: "Plano",
  prefs: { banca: "AOCP", dailyMinutes: 120 },
  notebooks: [{ id: "n1", name: "Caderno" }],
  subjects: [{ id: "s1", notebookId: "n1", name: "Matéria" }],
  topics: [{ id: "t1", subjectId: "s1", name: "Assunto", notes: "Nota", status: "revisar" }],
  sessions: [{ id: "x1", date: "2026-11-17", time: "07:30", minutes: 90, subjectId: "s1", topicId: "t1" }],
  goals: [{ id: "g1", type: "daily_time", target: 120, days: [1] }],
  reviews: [{ id: "r1", topicId: "t1", date: "2026-11-27" }],
};

describe("plano de estudos", () => {
  it("reconhece o formato", () => {
    expect(isKit(kit)).toBe(true);
    expect(isKit({ app: "caderno" })).toBe(false);
  });

  it("junta ao que existe sem duplicar e aplica preferências uma vez", () => {
    const st = useStore.getState();
    st.addNotebook({ name: "Meu" });
    st.applyKit(kit);
    st.setPrefs({ dailyMinutes: 60 });
    st.applyKit(kit);
    const s = useStore.getState();
    expect(s.notebooks.map((n) => n.name)).toEqual(["Meu", "Caderno"]);
    expect(s.topics).toHaveLength(1);
    expect(s.sessions[0]).toMatchObject({ notebookId: "n1", durationSec: 5400 });
    expect(new Date(s.sessions[0].start).getHours()).toBe(7);
    expect(s.goals).toHaveLength(1);
    expect(s.reviews).toHaveLength(1);
    expect(s.prefs).toMatchObject({ banca: "AOCP", dailyMinutes: 60, setupDone: true, appliedKits: ["k1"] });
  });
});
