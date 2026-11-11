import "server-only";
import type { AuthContext } from "@/lib/db/context";
import type { GymPayment, GymPlan, GymSession, GymStudent, GymSubscription } from "@/lib/domain/gym";

export type Gym = { id: string; name: string; slug: string; suspended_at: string | null; suspended_reason: string | null };

export async function getAdminGym(ctx: AuthContext): Promise<Gym | null> {
  const gymId = ctx.memberships.find((m) => m.role === "admin" && m.status === "active")?.gym_id;
  if (!gymId) return null;
  const { data } = await ctx.supabase.from("gyms").select("id, name, slug, suspended_at, suspended_reason").eq("id", gymId).maybeSingle();
  return (data as Gym | null) ?? null;
}

export type GymStudentRow = GymStudent & { user_id: string; name: string; trainerIds: string[]; subscription: GymSubscription | null };
export type GymTrainerRow = { id: string; user_id: string; name: string; studentIds: string[] };

export async function loadGym(ctx: AuthContext, gymId: string, days = 30) {
  const since = new Date(Date.now() - Math.max(days, 14) * 86400000).toISOString();
  const monthAgo = new Date(Date.now() - 62 * 86400000).toISOString();

  const [studentsRes, trainersRes, linksRes, plansRes, subsRes, paysRes, invitesRes] = await Promise.all([
    ctx.supabase.from("students").select("id, user_id, status, created_at").eq("gym_id", gymId).order("created_at", { ascending: false }),
    ctx.supabase.from("trainers").select("id, user_id").eq("gym_id", gymId),
    ctx.supabase.from("trainer_students").select("trainer_id, student_id"),
    ctx.supabase.from("gym_plans").select("id, name, price_cents, billing_interval, is_active").eq("gym_id", gymId).order("created_at"),
    ctx.supabase.from("subscriptions").select("id, student_id, gym_plan_id, status, started_at, canceled_at, price_cents").eq("gym_id", gymId),
    ctx.supabase
      .from("subscription_payments")
      .select("id, subscription_id, amount_cents, due_on, paid_at, status")
      .eq("gym_id", gymId)
      .gte("created_at", monthAgo)
      .order("created_at", { ascending: false }),
    ctx.supabase.from("gym_invites").select("id, email, role, status, created_at").eq("gym_id", gymId).eq("status", "pending").order("created_at", { ascending: false }),
  ]);
  for (const r of [studentsRes, trainersRes, linksRes, plansRes, subsRes, paysRes, invitesRes]) {
    if (r.error) throw new Error(`Falha ao carregar a academia: ${r.error.message}`);
  }

  const students = (studentsRes.data ?? []) as Array<GymStudent & { user_id: string }>;
  const trainers = (trainersRes.data ?? []) as Array<{ id: string; user_id: string }>;
  const links = (linksRes.data ?? []) as Array<{ trainer_id: string; student_id: string }>;
  const subscriptions = (subsRes.data ?? []) as Array<GymSubscription & { price_cents: number }>;

  const userIds = [...students.map((s) => s.user_id), ...trainers.map((t) => t.user_id)];
  const profiles = userIds.length
    ? ((await ctx.supabase.from("profiles").select("id, full_name").in("id", userIds)).data ?? [])
    : [];
  const nameOf = new Map((profiles as Array<{ id: string; full_name: string | null }>).map((p) => [p.id, p.full_name ?? "Sem nome"]));

  const studentIds = students.map((s) => s.id);
  const sessions = studentIds.length
    ? (((
        await ctx.supabase
          .from("workout_sessions")
          .select("student_id, started_at")
          .in("student_id", studentIds)
          .eq("status", "completed")
          .gte("started_at", since)
      ).data ?? []) as GymSession[])
    : [];

  const studentRows: GymStudentRow[] = students.map((s) => ({
    ...s,
    name: nameOf.get(s.user_id) ?? "Sem nome",
    trainerIds: links.filter((l) => l.student_id === s.id).map((l) => l.trainer_id),
    subscription:
      subscriptions.filter((x) => x.student_id === s.id).sort((a, b) => (a.status === "canceled" ? 1 : 0) - (b.status === "canceled" ? 1 : 0))[0] ?? null,
  }));
  const trainerRows: GymTrainerRow[] = trainers.map((t) => ({
    ...t,
    name: nameOf.get(t.user_id) ?? "Sem nome",
    studentIds: links.filter((l) => l.trainer_id === t.id).map((l) => l.student_id),
  }));

  return {
    students: studentRows,
    trainers: trainerRows,
    plans: (plansRes.data ?? []) as Array<GymPlan & { price_cents: number; billing_interval: string; is_active: boolean }>,
    subscriptions,
    payments: (paysRes.data ?? []) as Array<GymPayment & { id: string; subscription_id: string; due_on: string }>,
    invites: (invitesRes.data ?? []) as Array<{ id: string; email: string; role: "student" | "trainer"; status: string; created_at: string }>,
    sessions,
  };
}
