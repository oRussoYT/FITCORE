import { describe, expect, it } from "vitest";
import {
  ageFromBirthDate,
  bmi,
  bmiCategory,
  compare,
  formatSigned,
  isStagnant,
  leanMassEstimate,
  muscleStimulus,
  sessionsPerWeek,
  weekStart,
} from "./metrics";

describe("compare", () => {
  it("calcula diferença e percentual", () => {
    const r = compare(75.5, 78);
    expect(r.diff).toBeCloseTo(-2.5);
    expect(r.pct).toBeCloseTo(-3.205, 2);
  });
  it("não inventa nada quando falta o valor anterior", () => {
    expect(compare(75, null)).toEqual({ current: 75, previous: null, diff: null, pct: null });
  });
  it("não calcula percentual sobre zero", () => {
    expect(compare(3, 0).pct).toBeNull();
    expect(compare(3, 0).diff).toBe(3);
  });
});

describe("IMC", () => {
  it("calcula kg/m²", () => {
    expect(bmi(80, 180)).toBeCloseTo(24.69, 2);
  });
  it("retorna null sem altura", () => {
    expect(bmi(80, null)).toBeNull();
  });
  it("classifica pelas faixas da OMS", () => {
    expect(bmiCategory(24.9)).toBe("Faixa adequada");
    expect(bmiCategory(25)).toBe("Sobrepeso");
    expect(bmiCategory(null)).toBeNull();
  });
});

describe("idade", () => {
  it("considera se o aniversário já passou", () => {
    expect(ageFromBirthDate("1990-12-01", new Date(2026, 10, 10))).toBe(35);
    expect(ageFromBirthDate("1990-11-10", new Date(2026, 10, 10))).toBe(36);
  });
});

describe("massa magra estimada", () => {
  it("só existe com % de gordura medido", () => {
    expect(leanMassEstimate(80, 20)).toBe(64);
    expect(leanMassEstimate(80, null)).toBeNull();
  });
});

describe("frequência semanal", () => {
  it("semana começa na segunda", () => {
    const ws = weekStart(new Date(2026, 10, 15)); // domingo
    expect(ws.getDay()).toBe(1);
    expect(ws.getDate()).toBe(9);
  });
  it("agrupa treinos por semana e ignora os antigos", () => {
    const now = new Date(2026, 10, 12, 12);
    const buckets = sessionsPerWeek(
      [new Date(2026, 10, 10, 8), new Date(2026, 10, 11, 8), new Date(2026, 10, 3, 8), new Date(2025, 0, 1)],
      4,
      now,
    );
    expect(buckets).toHaveLength(4);
    expect(buckets[3]?.count).toBe(2);
    expect(buckets[2]?.count).toBe(1);
    expect(buckets.reduce((a, b) => a + b.count, 0)).toBe(3);
  });
});

describe("estímulo muscular", () => {
  it("conta séries principais e meia série nos secundários", () => {
    const r = muscleStimulus([
      { primary_muscle: "chest", secondary_muscles: ["triceps"] },
      { primary_muscle: "chest", secondary_muscles: ["triceps", "shoulders"] },
    ]);
    expect(r).toEqual({ chest: 2, triceps: 1, shoulders: 0.5 });
  });
});

describe("estagnação", () => {
  it("detecta variação mínima nos últimos registros", () => {
    expect(isStagnant([80, 79, 78.9, 79, 78.95], 0.3)).toBe(true);
    expect(isStagnant([80, 79, 78], 0.3)).toBe(false);
    expect(isStagnant([80, 80], 0.3)).toBe(false);
  });
});

describe("formatação", () => {
  it("usa sinal e vírgula decimal", () => {
    expect(formatSigned(-2.5, 1, " kg")).toBe("−2,5 kg");
    expect(formatSigned(0.5, 1, " cm")).toBe("+0,5 cm");
  });
});
