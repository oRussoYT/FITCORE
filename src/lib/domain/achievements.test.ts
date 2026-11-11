import { describe, expect, it } from "vitest";
import { achievements, dayStreak, weekStreak } from "./achievements";

const now = new Date(2026, 10, 12, 18); // quinta
const d = (m: number, day: number) => new Date(2026, m, day, 9).toISOString();

describe("sequências", () => {
  it("conta dias seguidos até hoje", () => {
    expect(dayStreak([d(10, 12), d(10, 11), d(10, 10), d(10, 7)], now)).toBe(3);
  });
  it("aceita sequência que terminou ontem", () => {
    expect(dayStreak([d(10, 11), d(10, 10)], now)).toBe(2);
  });
  it("zera quando o último treino foi há 2 dias", () => {
    expect(dayStreak([d(10, 10)], now)).toBe(0);
  });
  it("conta semanas seguidas", () => {
    // semanas de 9/11, 2/11, 26/10 — com 19/10 faltando
    expect(weekStreak([d(10, 10), d(10, 3), d(9, 27), d(9, 13)], now)).toBe(3);
  });
});

describe("conquistas", () => {
  it("só libera com dado real", () => {
    const list = achievements({ sessionDates: [d(10, 12)], assessmentDates: [d(9, 1)], hasPhoto: false, totalSets: 12 }, now);
    const byCode = Object.fromEntries(list.map((a) => [a.code, a]));
    expect(byCode.first_workout?.earned).toBe(true);
    expect(byCode.ten_workouts?.earned).toBe(false);
    expect(byCode.ten_workouts?.progress).toBeCloseTo(0.1);
    expect(byCode.second_assessment?.earned).toBe(false);
    expect(byCode.first_photo?.earned).toBe(false);
  });
});
