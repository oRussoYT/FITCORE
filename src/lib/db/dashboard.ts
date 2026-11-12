import "server-only";
import type { AuthContext } from "@/lib/db/context";
import { listAssessments } from "@/lib/db/assessments";
import { buildBodyIndicators, buildEvolution, buildFrequency } from "@/lib/domain/dashboard";
import { muscleStimulus } from "@/lib/domain/metrics";
import type { Goal, MuscleGroup, NotificationRow } from "@/types/db";

export async function signedAvatarUrl(ctx: AuthContext, path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await ctx.supabase.storage.from("avatars").createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}

export async function loadNotifications(ctx: AuthContext): Promise<{ items: NotificationRow[]; unread: number }> {
  const [list, unread] = await Promise.all([
    ctx.supabase.from("notifications").select("id, kind, title, body, link, read_at, created_at").order("created_at", { ascending: false }).limit(12),
    ctx.supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);
  return { items: (list.data ?? []) as NotificationRow[], unread: unread.count ?? 0 };
}

export async function loadDashboard(ctx: AuthContext, studentId: string) {
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const since8w = new Date(Date.now() - 8 * 7 * 86400000).toISOString();

  const since36h = new Date(Date.now() - 36 * 3600000).toISOString();
  const since12h = new Date(Date.now() - 12 * 3600000).toISOString();

  const [assessments, sessionsRes, logsRes, groupsRes, goalRes, notifications, avatarUrl, invitesRes, plansRes, notesRes, waterRes, openRes] = await Promise.all([
    listAssessments(ctx, studentId),
    ctx.supabase
      .from("workout_sessions")
      .select("started_at, is_demo, plan_id")
      .eq("student_id", studentId)
      .eq("status", "completed")
      .gte("started_at", since8w),
    ctx.supabase
      .from("workout_logs")
      .select("exercise_id, exercises(primary_muscle, secondary_muscles)")
      .eq("student_id", studentId)
      .gte("completed_at", since30),
    ctx.supabase.from("muscle_groups").select("slug, name, region, sort_order").order("sort_order"),
    ctx.supabase
      .from("goals")
      .select("id, kind, title, unit, start_value, target_value, current_value, due_on, status")
      .eq("student_id", studentId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    loadNotifications(ctx),
    signedAvatarUrl(ctx, ctx.profile.avatar_path),
    ctx.supabase.from("gym_invites").select("id, role, gyms(name)").eq("status", "pending"),
    ctx.supabase.from("workout_plans").select("id, label, name, workout_exercises(id, sets)").eq("student_id", studentId).eq("is_active", true).order("label"),
    ctx.supabase.from("student_notes").select("id, body, created_at").eq("student_id", studentId).eq("visible_to_student", true).order("created_at", { ascending: false }).limit(3),
    // Água das últimas 36 h: o navegador soma só o "hoje" no fuso da pessoa.
    ctx.supabase.from("water_logs").select("id, amount_ml, logged_at").eq("student_id", studentId).gte("logged_at", since36h).order("logged_at", { ascending: false }),
    ctx.supabase.from("workout_sessions").select("id, plan_id").eq("student_id", studentId).in("status", ["in_progress", "paused"]).gte("started_at", since12h).limit(1).maybeSingle(),
  ]);

  for (const r of [sessionsRes, logsRes, groupsRes, goalRes]) {
    if (r.error) throw new Error(`Falha ao carregar o painel: ${r.error.message}`);
  }

  type LogRow = { exercises: { primary_muscle: string; secondary_muscles: string[] | null } | null };
  const logs = (logsRes.data ?? []) as unknown as LogRow[];
  const stimulus = muscleStimulus(logs.flatMap((l) => (l.exercises ? [l.exercises] : [])));

  const sessions = (sessionsRes.data ?? []) as Array<{ started_at: string; is_demo: boolean; plan_id: string | null }>;
  const lastSession = [...sessions].sort((a, b) => b.started_at.localeCompare(a.started_at))[0] ?? null;
  const hasDemo = assessments.some((a) => a.is_demo) || sessions.some((s) => s.is_demo);

  return {
    assessments,
    indicators: buildBodyIndicators(assessments, { goal: ctx.profile.primary_goal, profileHeightCm: ctx.profile.height_cm }),
    frequency: buildFrequency(
      sessions.map((s) => s.started_at),
      ctx.profile.weekly_availability,
    ),
    evolution: buildEvolution(assessments, ctx.profile.primary_goal),
    stimulus,
    setsLast30: logs.length,
    muscleGroups: (groupsRes.data ?? []) as MuscleGroup[],
    goal: (goalRes.data as Goal | null) ?? null,
    notifications,
    avatarUrl,
    hasDemo,
    invites: ((invitesRes.data ?? []) as unknown as Array<{ id: string; role: "student" | "trainer"; gyms: { name: string } | null }>).map((i) => ({
      id: i.id,
      role: i.role,
      gym_name: i.gyms?.name ?? "Uma academia",
    })),
    coachPlans: ((plansRes.data ?? []) as unknown as Array<{ id: string; label: string; name: string; workout_exercises: Array<{ sets: number | null }> }>).map((p) => ({
      id: p.id,
      label: p.label,
      name: p.name,
      exercises: p.workout_exercises?.length ?? 0,
      sets: (p.workout_exercises ?? []).reduce((s, e) => s + (e.sets ?? 0), 0),
    })),
    coachNotes: (notesRes.data ?? []) as Array<{ id: string; body: string; created_at: string }>,
    sessionDates: sessions.map((s) => s.started_at),
    lastSessionAt: lastSession?.started_at ?? null,
    lastPlanId: lastSession?.plan_id ?? null,
    openSession: (openRes.data as { id: string; plan_id: string } | null) ?? null,
    water: (waterRes.data ?? []) as Array<{ id: string; amount_ml: number; logged_at: string }>,
  };
}

export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;
