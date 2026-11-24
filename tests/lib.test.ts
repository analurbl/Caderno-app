import { describe, expect, it } from "vitest";
import { activeElapsed, activePaused, addDays, fmtClock, fmtDuration, startOfDay, streak, sumSessions } from "../src/lib/time";
import { goalProgress, topicsProgress, weakPoints } from "../src/lib/stats";
import type { ActiveSession, Goal, StudySession, Topic, ErrorEntry } from "../src/types";

const sess = (start: number, min: number, extra: Partial<StudySession> = {}): StudySession => ({
  id: Math.random().toString(),
  start,
  end: start + min * 60_000,
  durationSec: min * 60,
  pauseSec: 0,
  note: "",
  ...extra,
});

describe("cronômetro", () => {
  const base: ActiveSession = { startedAt: 0, accumulatedSec: 0, runningSince: 0, pausedSec: 0, pausedSince: null, targetMin: 0, note: "", heartbeat: 0 };

  it("conta apenas o tempo em execução", () => {
    expect(activeElapsed(base, 90_000)).toBe(90);
  });

  it("não conta o tempo pausado", () => {
    const paused: ActiveSession = { ...base, accumulatedSec: 300, runningSince: null, pausedSince: 300_000 };
    expect(activeElapsed(paused, 10_000_000)).toBe(300);
    expect(activePaused(paused, 360_000)).toBe(60);
  });

  it("formata relógio e durações", () => {
    expect(fmtClock(65)).toBe("01:05");
    expect(fmtClock(3725)).toBe("1:02:05");
    expect(fmtDuration(90 * 60)).toBe("1h 30min");
    expect(fmtDuration(30)).toBe("< 1 min");
    expect(fmtDuration(0)).toBe("0 min");
  });
});

describe("agregações", () => {
  const today = startOfDay();
  const sessions = [sess(today + 3600_000, 30), sess(addDays(today, -1) + 3600_000, 20), sess(addDays(today, -2) + 3600_000, 10), sess(addDays(today, -5), 15)];

  it("soma por intervalo", () => {
    expect(sumSessions(sessions, today, addDays(today, 1))).toBe(30 * 60);
  });

  it("calcula sequência de dias sem punir o dia atual vazio", () => {
    expect(streak(sessions)).toBe(3);
    expect(streak(sessions.slice(1))).toBe(2);
  });

  it("progresso de assuntos", () => {
    const t = (status: Topic["status"]) => ({ status }) as Topic;
    expect(topicsProgress([t("concluido"), t("nao_iniciado")])).toBe(0.5);
    expect(topicsProgress([])).toBe(0);
  });

  it("meta diária e por matéria", () => {
    const g: Goal = { id: "g", type: "daily_time", target: 60, days: [0, 1, 2, 3, 4, 5, 6], paused: false, createdAt: 0, history: [] };
    expect(goalProgress(g, sessions, []).done).toBe(30);
    const gs: Goal = { ...g, type: "subject_time", subjectId: "m1" };
    expect(goalProgress(gs, [sess(today + 1000, 25, { subjectId: "m1" }), sess(today + 1000, 25, { subjectId: "m2" })], []).done).toBe(25);
  });

  it("pontos fracos ignoram questões dominadas", () => {
    const e = (assunto: string, status: ErrorEntry["status"]) => ({ status, subjectId: "m", question: { assunto } }) as ErrorEntry;
    expect(weakPoints([e("A", "pendente"), e("A", "revisada"), e("B", "dominada"), e("C", "pendente")])).toEqual(["A", "C"]);
  });
});
