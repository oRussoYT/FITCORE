/** Regras da tela "Hoje" — só usam o que a pessoa registrou. */

export type PlanRef = { id: string; label: string; name: string };

/** Próximo treino da sequência (A → B → C → A…), com base no último concluído. */
export function nextPlan<T extends PlanRef>(plans: T[], lastPlanId: string | null): T | null {
  if (plans.length === 0) return null;
  const sorted = [...plans].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  const i = lastPlanId ? sorted.findIndex((p) => p.id === lastPlanId) : -1;
  return sorted[(i + 1) % sorted.length] ?? null;
}

/** Meta diária de água em ml: escolha da pessoa, ou 35 ml por kg, ou 2,5 L. */
export function waterGoal(weightKg: number | null, custom?: number | null): number {
  if (custom && custom >= 500) return custom;
  if (!weightKg) return 2500;
  const raw = Math.round((weightKg * 35) / 100) * 100;
  return Math.min(5000, Math.max(1500, raw));
}

/** Dias inteiros desde uma data (0 = hoje). Null se nunca. */
export function daysSince(iso: string | null, now: Date = new Date()): number | null {
  if (!iso) return null;
  const a = new Date(iso);
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.max(0, Math.round((start(now) - start(a)) / 86400000));
}

/** Peso mais recente e diferença em relação à pesagem anterior. */
export function weightTrend(rows: Array<{ assessed_at: string; weight_kg: number | null }>) {
  const withWeight = rows.filter((r) => r.weight_kg != null).sort((a, b) => a.assessed_at.localeCompare(b.assessed_at));
  const last = withWeight.at(-1);
  if (!last) return null;
  const prev = withWeight.at(-2);
  return {
    kg: Number(last.weight_kg),
    at: last.assessed_at,
    delta: prev ? Math.round((Number(last.weight_kg) - Number(prev.weight_kg)) * 10) / 10 : null,
  };
}

export type Pending = { key: string; title: string; detail: string; href: string };

export function pendingItems(input: {
  lastAssessmentAt: string | null;
  hasAvatar: boolean;
  hasPlans: boolean;
  now?: Date;
}): Pending[] {
  const out: Pending[] = [];
  const since = daysSince(input.lastAssessmentAt, input.now);
  if (since === null) {
    out.push({ key: "avaliacao", title: "Primeira avaliação", detail: "Peso e medidas · ~5 min", href: "/evolucao/nova" });
  } else if (since >= 30) {
    out.push({ key: "reavaliacao", title: "Hora de reavaliar", detail: `Última avaliação há ${since} dias`, href: "/evolucao/nova" });
  }
  if (!input.hasPlans) out.push({ key: "treino", title: "Monte seu treino", detail: "Com a IA ou do seu jeito", href: "/treinos" });
  if (!input.hasAvatar) out.push({ key: "foto", title: "Foto de perfil", detail: "Deixa o app com a sua cara", href: "/perfil" });
  return out;
}
