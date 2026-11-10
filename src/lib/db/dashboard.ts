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

  const [assessments, sessionsRes, logsRes, groupsRes, goalRes, notifications, avatarUrl] = await Promise.all([
    listAssessments(ctx, studentId),
    ctx.supabase
      .from("workout_sessions")
      .select("started_at, is_demo")
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
  ]);

  for (const r of [sessionsRes, logsRes, groupsRes, goalRes]) {
    if (r.error) throw new Error(`Falha ao carregar o painel: ${r.error.message}`);
  }

  type LogRow = { exercises: { primary_muscle: string; secondary_muscles: string[] | null } | null };
  const logs = (logsRes.data ?? []) as unknown as LogRow[];
  const stimulus = muscleStimulus(logs.flatMap((l) => (l.exercises ? [l.exercises] : [])));

  const sessions = (sessionsRes.data ?? []) as Array<{ started_at: string; is_demo: boolean }>;
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
  };
}

export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;
