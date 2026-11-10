import { describe, expect, it } from "vitest";
import { buildBodyIndicators, buildEvolution, buildFrequency } from "./dashboard";
import type { PhysicalAssessment } from "@/types/db";

function assessment(date: string, patch: Partial<PhysicalAssessment>): PhysicalAssessment {
  return {
    id: date,
    student_id: "s",
    assessed_at: `${date}T12:00:00Z`,
    source: "self",
    weight_kg: null,
    height_cm: null,
    age_years: null,
    sex: null,
    body_fat_pct: null,
    body_fat_method: null,
    muscle_mass_kg: null,
    muscle_mass_method: null,
    notes: null,
    is_demo: false,
    body_measurements: [],
    ...patch,
  };
}

const m = (site: PhysicalAssessment["body_measurements"] extends (infer T)[] | undefined ? T : never) => site;

describe("indicadores corporais", () => {
  it("usa somente dados registrados (exemplo do documento)", () => {
    const list = [assessment("2026-09-01", { weight_kg: 78 }), assessment("2026-10-31", { weight_kg: 75.5 })];
    const [weight] = buildBodyIndicators(list, { goal: "lose_fat", profileHeightCm: 175 });
    expect(weight?.current).toBe(75.5);
    expect(weight?.previous).toBe(78);
    expect(weight?.diff).toBeCloseTo(-2.5);
    expect(weight?.direction).toBe(-1);
  });

  it("não mostra gordura nem massa muscular sem medição", () => {
    const list = [assessment("2026-09-01", { weight_kg: 78 })];
    const ind = buildBodyIndicators(list, { goal: null, profileHeightCm: 175 });
    const fat = ind.find((i) => i.key === "fat");
    const lean = ind.find((i) => i.key === "lean");
    expect(fat?.current).toBeNull();
    expect(lean?.current).toBeNull();
    expect(lean?.label).toBe("Massa muscular");
  });

  it("estima massa magra (rotulada) quando só há % de gordura medido", () => {
    const list = [assessment("2026-09-01", { weight_kg: 80, body_fat_pct: 20, body_fat_method: "Bioimpedância" })];
    const lean = buildBodyIndicators(list, { goal: null, profileHeightCm: 180 }).find((i) => i.key === "lean");
    expect(lean?.label).toBe("Massa magra estimada");
    expect(lean?.current).toBe(64);
  });

  it("calcula IMC com a altura do perfil quando a avaliação não tem", () => {
    const bmiInd = buildBodyIndicators([assessment("2026-09-01", { weight_kg: 80 })], { goal: null, profileHeightCm: 180 }).find(
      (i) => i.key === "bmi",
    );
    expect(bmiInd?.current).toBeCloseTo(24.69, 2);
  });
});

describe("evolução", () => {
  it("compara primeira e última medida por região conforme o objetivo", () => {
    const list = [
      assessment("2026-09-01", {
        weight_kg: 78,
        body_measurements: [
          m({ id: "1", assessment_id: "a", site: "waist", side: "center", value_cm: 90 }),
          m({ id: "2", assessment_id: "a", site: "arm", side: "center", value_cm: 35 }),
        ],
      }),
      assessment("2026-10-31", {
        weight_kg: 75.5,
        body_measurements: [
          m({ id: "3", assessment_id: "b", site: "waist", side: "center", value_cm: 87 }),
          m({ id: "4", assessment_id: "b", site: "arm", side: "center", value_cm: 35.5 }),
        ],
      }),
    ];
    const ev = buildEvolution(list, "recomposition");
    expect(ev.days).toBe(60);
    expect(ev.weight.diff).toBeCloseTo(-2.5);
    const waist = ev.changes.find((c) => c.site === "waist");
    const arm = ev.changes.find((c) => c.site === "arm");
    expect(waist?.diff).toBe(-3);
    expect(waist?.verdict).toBe("better");
    expect(arm?.verdict).toBe("better");
  });

  it("não compara medidas com um único registro", () => {
    const ev = buildEvolution([assessment("2026-09-01", { weight_kg: 70 })], null);
    expect(ev.changes).toHaveLength(0);
    expect(ev.weight.diff).toBeNull();
  });
});

describe("frequência", () => {
  it("separa semana atual e anterior", () => {
    const now = new Date(2026, 10, 12, 12);
    const f = buildFrequency([new Date(2026, 10, 10).toISOString(), new Date(2026, 10, 4).toISOString()], 4, now);
    expect(f.thisWeek).toBe(1);
    expect(f.lastWeek).toBe(1);
    expect(f.weeks).toHaveLength(8);
    expect(f.target).toBe(4);
  });
});
