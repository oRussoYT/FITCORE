import { desiredDirection, SITE_LABELS, SITE_ORDER, weightDirection } from "./labels";
import { bmi, bmiCategory, compare, leanMassEstimate, sessionsPerWeek, type Comparison } from "./metrics";
import type { MeasurementSite, PhysicalAssessment, PrimaryGoal } from "@/types/db";

export type Point = { date: string; value: number };

export type Indicator = Comparison & {
  key: string;
  label: string;
  unit: string;
  digits: number;
  history: Point[];
  /** 1 = subir é bom para o objetivo; -1 = descer é bom; 0 = neutro */
  direction: -1 | 0 | 1;
  note?: string;
  emptyText: string;
};

function series(assessments: PhysicalAssessment[], pick: (a: PhysicalAssessment) => number | null): Point[] {
  const out: Point[] = [];
  for (const a of assessments) {
    const v = pick(a);
    if (v !== null && Number.isFinite(v)) out.push({ date: a.assessed_at, value: v });
  }
  return out;
}

function fromSeries(points: Point[]): Comparison {
  const last = points.at(-1)?.value ?? null;
  const prev = points.length > 1 ? (points.at(-2)?.value ?? null) : null;
  return compare(last, prev);
}

export function buildBodyIndicators(
  assessments: PhysicalAssessment[],
  opts: { goal: PrimaryGoal | null; profileHeightCm: number | null },
): Indicator[] {
  const weight = series(assessments, (a) => a.weight_kg);
  const fat = series(assessments, (a) => a.body_fat_pct);
  const muscle = series(assessments, (a) => a.muscle_mass_kg);
  const bmis = series(assessments, (a) => bmi(a.weight_kg, a.height_cm ?? opts.profileHeightCm));

  const latestWithMuscle = [...assessments].reverse().find((a) => a.muscle_mass_kg !== null);
  const latestWithFat = [...assessments].reverse().find((a) => a.body_fat_pct !== null);

  const indicators: Indicator[] = [
    {
      key: "weight",
      label: "Peso",
      unit: "kg",
      digits: 1,
      history: weight,
      direction: weightDirection(opts.goal),
      emptyText: "Registre seu peso em uma avaliação.",
      ...fromSeries(weight),
    },
  ];

  if (muscle.length > 0) {
    indicators.push({
      key: "muscle",
      label: "Massa muscular",
      unit: "kg",
      digits: 1,
      history: muscle,
      direction: 1,
      note: latestWithMuscle?.muscle_mass_method ? `Medida por ${latestWithMuscle.muscle_mass_method}` : undefined,
      emptyText: "",
      ...fromSeries(muscle),
    });
  } else {
    const lean = series(assessments, (a) => leanMassEstimate(a.weight_kg, a.body_fat_pct));
    indicators.push({
      key: "lean",
      label: lean.length > 0 ? "Massa magra estimada" : "Massa muscular",
      unit: "kg",
      digits: 1,
      history: lean,
      direction: 1,
      note: lean.length > 0 ? "Estimativa: peso × (1 − % de gordura medido). Inclui ossos, órgãos e água — não é só músculo." : undefined,
      emptyText: "Aparece quando houver massa muscular ou % de gordura medidos por método adequado (ex.: bioimpedância).",
      ...fromSeries(lean),
    });
  }

  indicators.push({
    key: "fat",
    label: "Gordura corporal",
    unit: "%",
    digits: 1,
    history: fat,
    direction: opts.goal === "gain_muscle" ? 0 : -1,
    note: latestWithFat?.body_fat_method ? `Medido por ${latestWithFat.body_fat_method}` : undefined,
    emptyText: "Só exibimos quando medido por método adequado. Não estimamos por foto ou fórmula.",
    ...fromSeries(fat),
  });

  const lastBmi = bmis.at(-1)?.value ?? null;
  indicators.push({
    key: "bmi",
    label: "IMC",
    unit: "",
    digits: 1,
    history: bmis,
    direction: 0,
    note: lastBmi !== null ? `${bmiCategory(lastBmi)} (faixa OMS). Não diferencia músculo de gordura.` : undefined,
    emptyText: "Precisa de peso e altura registrados.",
    ...fromSeries(bmis),
  });

  return indicators;
}

export type FrequencyIndicator = {
  thisWeek: number;
  lastWeek: number;
  target: number | null;
  weeks: Array<{ label: string; count: number }>;
  totalSessions: number;
};

export function buildFrequency(sessionDates: string[], target: number | null, now: Date = new Date()): FrequencyIndicator {
  const buckets = sessionsPerWeek(sessionDates, 8, now);
  return {
    thisWeek: buckets.at(-1)?.count ?? 0,
    lastWeek: buckets.at(-2)?.count ?? 0,
    target,
    weeks: buckets.map((b) => ({
      label: b.weekStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      count: b.count,
    })),
    totalSessions: buckets.reduce((s, b) => s + b.count, 0),
  };
}

export type MeasurementChange = {
  site: MeasurementSite;
  label: string;
  first: number;
  last: number;
  diff: number;
  verdict: "better" | "worse" | "neutral";
};

export type EvolutionSummary = {
  assessments: number;
  firstDate: string | null;
  lastDate: string | null;
  days: number;
  weight: Comparison;
  changes: MeasurementChange[];
};

/** Compara a primeira e a última vez que cada medida foi registrada. */
export function buildEvolution(assessments: PhysicalAssessment[], goal: PrimaryGoal | null): EvolutionSummary {
  const first = assessments[0] ?? null;
  const last = assessments.at(-1) ?? null;
  const days =
    first && last ? Math.max(0, Math.round((new Date(last.assessed_at).getTime() - new Date(first.assessed_at).getTime()) / 86400000)) : 0;

  const weights = series(assessments, (a) => a.weight_kg);
  const weight = weights.length > 1 ? compare(weights.at(-1)?.value, weights[0]?.value) : compare(weights[0]?.value ?? null, null);

  const changes: MeasurementChange[] = [];
  for (const site of SITE_ORDER) {
    const values: number[] = [];
    for (const a of assessments) {
      const m = a.body_measurements?.find((x) => x.site === site && x.side === "center");
      if (m) values.push(m.value_cm);
    }
    if (values.length < 2) continue;
    const firstV = values[0] as number;
    const lastV = values.at(-1) as number;
    const diff = lastV - firstV;
    const dir = desiredDirection(goal, site);
    const verdict: MeasurementChange["verdict"] =
      Math.abs(diff) < 0.3 || dir === 0 ? "neutral" : Math.sign(diff) === dir ? "better" : "worse";
    changes.push({ site, label: SITE_LABELS[site], first: firstV, last: lastV, diff, verdict });
  }

  return {
    assessments: assessments.length,
    firstDate: first?.assessed_at ?? null,
    lastDate: last?.assessed_at ?? null,
    days,
    weight,
    changes,
  };
}
