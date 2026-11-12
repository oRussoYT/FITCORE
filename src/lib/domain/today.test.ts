import { describe, expect, it } from "vitest";
import { daysSince, nextPlan, pendingItems, waterGoal, weightTrend } from "./today";

const plans = [
  { id: "b", label: "B", name: "Costas" },
  { id: "a", label: "A", name: "Peito" },
  { id: "c", label: "C", name: "Pernas" },
];

describe("próximo treino", () => {
  it("começa pelo A quando nunca treinou", () => expect(nextPlan(plans, null)?.id).toBe("a"));
  it("segue a sequência", () => expect(nextPlan(plans, "a")?.id).toBe("b"));
  it("volta ao início depois do último", () => expect(nextPlan(plans, "c")?.id).toBe("a"));
  it("sem treinos não inventa nada", () => expect(nextPlan([], null)).toBeNull());
});

describe("meta de água", () => {
  it("usa a escolha da pessoa", () => expect(waterGoal(80, 3000)).toBe(3000));
  it("calcula 35 ml por kg", () => expect(waterGoal(70)).toBe(2500));
  it("sem peso usa 2,5 L", () => expect(waterGoal(null)).toBe(2500));
  it("respeita limites", () => expect(waterGoal(200)).toBe(5000));
});

describe("datas e peso", () => {
  const now = new Date(2026, 10, 12, 20);
  it("conta dias desde a data", () => expect(daysSince(new Date(2026, 10, 10, 8).toISOString(), now)).toBe(2));
  it("hoje é zero", () => expect(daysSince(new Date(2026, 10, 12, 1).toISOString(), now)).toBe(0));
  it("tendência do peso", () => {
    expect(
      weightTrend([
        { assessed_at: "2026-10-01", weight_kg: 68.4 },
        { assessed_at: "2026-11-01", weight_kg: null },
        { assessed_at: "2026-11-10", weight_kg: 65.9 },
      ]),
    ).toEqual({ kg: 65.9, at: "2026-11-10", delta: -2.5 });
  });
  it("sem pesagem não mostra nada", () => expect(weightTrend([])).toBeNull());
});

describe("pendências", () => {
  const now = new Date(2026, 10, 12);
  it("pede a primeira avaliação", () => {
    expect(pendingItems({ lastAssessmentAt: null, hasAvatar: true, hasPlans: true, now }).map((p) => p.key)).toEqual(["avaliacao"]);
  });
  it("pede reavaliação após 30 dias, treino e foto", () => {
    expect(pendingItems({ lastAssessmentAt: "2026-09-01", hasAvatar: false, hasPlans: false, now }).map((p) => p.key)).toEqual(["reavaliacao", "treino", "foto"]);
  });
  it("nada pendente", () => {
    expect(pendingItems({ lastAssessmentAt: "2026-11-01", hasAvatar: true, hasPlans: true, now })).toEqual([]);
  });
});
