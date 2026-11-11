/** Indicadores da academia calculados a partir dos registros reais. */

export type GymStudent = { id: string; status: "active" | "inactive"; created_at: string };
export type GymSession = { student_id: string; started_at: string };
export type GymSubscription = { id: string; student_id: string; gym_plan_id: string | null; status: "active" | "past_due" | "canceled"; started_at: string; canceled_at: string | null };
export type GymPayment = { amount_cents: number; paid_at: string | null; status: string };
export type GymPlan = { id: string; name: string };

const DAY = 86400000;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function gymOverview(input: {
  students: GymStudent[];
  sessions: GymSession[];
  subscriptions: GymSubscription[];
  payments: GymPayment[];
  plans: GymPlan[];
  days: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const since = new Date(now.getTime() - input.days * DAY);
  const today = startOfDay(now);
  const weekAgo = new Date(today.getTime() - 6 * DAY);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const total = input.students.length;
  const active = input.students.filter((s) => s.status === "active").length;
  const newInPeriod = input.students.filter((s) => new Date(s.created_at) >= since).length;

  const sessionsInPeriod = input.sessions.filter((s) => new Date(s.started_at) >= since);
  const todayCount = input.sessions.filter((s) => new Date(s.started_at) >= today).length;
  const weekCount = input.sessions.filter((s) => new Date(s.started_at) >= weekAgo).length;
  const trainedInPeriod = new Set(sessionsInPeriod.map((s) => s.student_id));

  // Treinos por dia no período, para o gráfico
  const byDay: Array<{ day: string; count: number }> = [];
  for (let i = input.days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    byDay.push({ day: key, count: 0 });
  }
  const index = new Map(byDay.map((b, i) => [b.day, i]));
  for (const s of sessionsInPeriod) {
    const d = new Date(s.started_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const i = index.get(key);
    if (i !== undefined) byDay[i]!.count++;
  }

  const revenueMonthCents = input.payments
    .filter((p) => p.status === "paid" && p.paid_at && new Date(p.paid_at) >= monthStart)
    .reduce((s, p) => s + p.amount_cents, 0);

  // Cancelamento: assinaturas canceladas no período ÷ assinaturas que existiam no início ou começaram no período
  const canceledInPeriod = input.subscriptions.filter((s) => s.status === "canceled" && s.canceled_at && new Date(s.canceled_at) >= since).length;
  const exposed = input.subscriptions.filter((s) => !(s.status === "canceled" && s.canceled_at && new Date(s.canceled_at) < since)).length;
  const cancelRate = exposed > 0 ? canceledInPeriod / exposed : null;

  // Retenção: alunos ativos que treinaram no período ÷ alunos ativos
  const retention = active > 0 ? input.students.filter((s) => s.status === "active" && trainedInPeriod.has(s.id)).length / active : null;

  const planCount = new Map<string, number>();
  for (const s of input.subscriptions) {
    if (s.status === "canceled" || !s.gym_plan_id) continue;
    planCount.set(s.gym_plan_id, (planCount.get(s.gym_plan_id) ?? 0) + 1);
  }
  const topPlans = input.plans
    .map((p) => ({ name: p.name, count: planCount.get(p.id) ?? 0 }))
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    total,
    active,
    inactive: total - active,
    newInPeriod,
    todayCount,
    weekCount,
    byDay,
    revenueMonthCents,
    cancelRate,
    retention,
    topPlans,
  };
}

/** Alunos ativos com menos treinos que o mínimo nos últimos 14 dias. */
export function lowFrequency(students: GymStudent[], sessions: GymSession[], minPer14Days = 2, now: Date = new Date()) {
  const since = new Date(now.getTime() - 14 * DAY);
  const counts = new Map<string, number>();
  for (const s of sessions) if (new Date(s.started_at) >= since) counts.set(s.student_id, (counts.get(s.student_id) ?? 0) + 1);
  return students.filter((s) => s.status === "active" && (counts.get(s.id) ?? 0) < minPer14Days).map((s) => ({ id: s.id, sessions: counts.get(s.id) ?? 0 }));
}

export function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
