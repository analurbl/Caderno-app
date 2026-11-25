import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "../src/store";
import type { StudyKit } from "../src/lib/kit";
import { dayKey } from "../src/lib/time";
import { blocksOn, nextPlannedDay, planLink } from "../src/lib/plan";

const today = dayKey();
const base: StudyKit = {
  kind: "kit",
  id: "v1",
  title: "Plano",
  prefs: { dailyMinutes: 180 },
  notebooks: [{ id: "n" }].map((n) => ({ ...n, name: "Caderno" })),
  subjects: [{ id: "s", notebookId: "n", name: "SUS" }],
  topics: [{ id: "t1", subjectId: "s", name: "Lei 8.080" }],
};
const v2: StudyKit = {
  ...base,
  id: "v2",
  supersedes: ["v1"],
  prefs: { dailyMinutes: 999 },
  topics: [...base.topics, { id: "t2", subjectId: "s", name: "Lei 8.142" }],
  plan: [
    { id: "p1", date: today, start: "07:30", end: "09:00", title: "Lei 8.142", kind: "estudo", subjectId: "s", topicId: "t2" },
    { id: "p2", date: today, start: "09:10", end: "10:40", title: "Questões SUS", kind: "questoes", subjectId: "s" },
    { id: "m1", date: today, start: "", end: "", title: "Prova", kind: "marco" },
  ],
};

describe("cronograma", () => {
  beforeEach(() => useStore.getState().deleteAllData());

  it("atualização junta assuntos e blocos sem reaplicar preferências", () => {
    const st = useStore.getState();
    st.applyKit(base);
    st.setPrefs({ dailyMinutes: 60 });
    st.applyKit(v2);
    st.applyKit(v2);
    const s = useStore.getState();
    expect(s.topics.map((t) => t.id)).toEqual(["t1", "t2"]);
    expect(s.plan).toHaveLength(3);
    expect(s.prefs.dailyMinutes).toBe(60);
    expect(s.prefs.appliedKits).toEqual(["v1", "v2"]);
    expect(blocksOn(s.plan, today).map((p) => p.id)).toEqual(["p1", "p2"]);
  });

  it("marca o bloco feito ao terminar a sessão do assunto e ao terminar questões da matéria", () => {
    const st = useStore.getState();
    st.applyKit(v2);
    st.startSession({ notebookId: "n", subjectId: "s", topicId: "t2", targetMin: 0 });
    useStore.setState((s) => ({ active: { ...s.active!, accumulatedSec: 600 } }));
    st.finishSession();
    expect(useStore.getState().plan.find((p) => p.id === "p1")?.done).toBe(true);
    expect(useStore.getState().plan.find((p) => p.id === "p2")?.done).toBe(false);
    st.completePlannedPractice("s");
    expect(useStore.getState().plan.find((p) => p.id === "p2")?.done).toBe(true);
  });

  it("links e próximo dia", () => {
    expect(planLink(v2.plan![0] as never)).toBe("/estudar?assunto=t2&min=90");
    expect(planLink(v2.plan![1] as never)).toBe("/questoes?materia=s");
    expect(nextPlannedDay(v2.plan as never, "2000-01-01")).toBe(today);
  });
});
