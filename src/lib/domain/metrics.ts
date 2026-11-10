/**
 * Regras de negócio puras (sem banco, sem tela) para os indicadores.
 * Nenhuma função aqui inventa valores: quando falta dado, devolve null.
 */

export type Comparison = {
  current: number | null;
  previous: number | null;
  /** current - previous, quando ambos existem */
  diff: number | null;
  /** variação percentual, só quando previous ≠ 0 */
  pct: number | null;
};

export function round(value: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export function compare(current: number | null | undefined, previous: number | null | undefined): Comparison {
  const c = current ?? null;
  const p = previous ?? null;
  if (c === null || p === null) return { current: c, previous: p, diff: null, pct: null };
  const diff = c - p;
  const pct = p !== 0 ? (diff / Math.abs(p)) * 100 : null;
  return { current: c, previous: p, diff, pct };
}

/** Índice de massa corporal (kg/m²). */
export function bmi(weightKg: number | null | undefined, heightCm: number | null | undefined): number | null {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/** Faixas da Organização Mundial da Saúde para adultos. */
export function bmiCategory(value: number | null): string | null {
  if (value === null) return null;
  if (value < 18.5) return "Abaixo do peso";
  if (value < 25) return "Faixa adequada";
  if (value < 30) return "Sobrepeso";
  if (value < 35) return "Obesidade grau I";
  if (value < 40) return "Obesidade grau II";
  return "Obesidade grau III";
}

export function ageFromBirthDate(birth: string | Date | null | undefined, ref: Date = new Date()): number | null {
  if (!birth) return null;
  const b = typeof birth === "string" ? new Date(`${birth.slice(0, 10)}T00:00:00`) : birth;
  if (Number.isNaN(b.getTime())) return null;
  let age = ref.getFullYear() - b.getFullYear();
  const m = ref.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < b.getDate())) age--;
  return age;
}

/** Massa magra ESTIMADA a partir de peso e % de gordura medido. Não é massa muscular. */
export function leanMassEstimate(weightKg: number | null, bodyFatPct: number | null): number | null {
  if (weightKg === null || bodyFatPct === null) return null;
  return weightKg * (1 - bodyFatPct / 100);
}

/** Segunda-feira 00:00 (hora local) da semana da data. */
export function weekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7; // segunda = 0
  d.setDate(d.getDate() - day);
  return d;
}

export type WeekBucket = { weekStart: Date; count: number };

/** Quantidade de treinos concluídos por semana, das mais antigas para a atual. */
export function sessionsPerWeek(sessionDates: Array<string | Date>, weeks = 8, now: Date = new Date()): WeekBucket[] {
  const current = weekStart(now);
  const buckets: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = new Date(current);
    ws.setDate(ws.getDate() - i * 7);
    buckets.push({ weekStart: ws, count: 0 });
  }
  const first = buckets[0]?.weekStart.getTime() ?? 0;
  for (const raw of sessionDates) {
    const d = typeof raw === "string" ? new Date(raw) : raw;
    const t = weekStart(d).getTime();
    if (t < first) continue;
    const idx = Math.round((t - first) / (7 * 24 * 3600 * 1000));
    const bucket = buckets[idx];
    if (bucket) bucket.count++;
  }
  return buckets;
}

export type StimulusInput = {
  primary_muscle: string;
  secondary_muscles: string[] | null;
};

/**
 * Estímulo por grupo muscular = séries realizadas.
 * Série no músculo principal conta 1; nos secundários conta 0,5.
 * Isso mede TREINO feito — não prova crescimento muscular.
 */
export function muscleStimulus(sets: StimulusInput[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of sets) {
    out[s.primary_muscle] = (out[s.primary_muscle] ?? 0) + 1;
    for (const m of s.secondary_muscles ?? []) {
      if (m === s.primary_muscle) continue;
      out[m] = (out[m] ?? 0) + 0.5;
    }
  }
  return out;
}

/**
 * Estagnação: nos últimos `minPoints` registros, a variação total ficou
 * abaixo de `tolerance` (mesma unidade da série).
 */
export function isStagnant(values: number[], tolerance: number, minPoints = 3): boolean {
  if (values.length < minPoints) return false;
  const recent = values.slice(-minPoints);
  return Math.max(...recent) - Math.min(...recent) < tolerance;
}

export function formatSigned(value: number, digits = 1, unit = ""): string {
  const r = round(value, digits);
  const sign = r > 0 ? "+" : r < 0 ? "−" : "±";
  const abs = Math.abs(r).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${sign}${abs}${unit}`;
}

export function formatNumber(value: number, digits = 1): string {
  return round(value, digits).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
