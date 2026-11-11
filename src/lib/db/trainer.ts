import "server-only";
import type { AuthContext } from "@/lib/db/context";

export async function getMyTrainer(ctx: AuthContext) {
  const { data } = await ctx.supabase.from("trainers").select("id, gym_id").eq("user_id", ctx.userId).maybeSingle();
  return (data as { id: string; gym_id: string | null } | null) ?? null;
}

export async function loadRoster(ctx: AuthContext, trainerId: string) {
  const links = await ctx.supabase.from("trainer_students").select("student_id").eq("trainer_id", trainerId);
  const ids = ((links.data ?? []) as Array<{ student_id: string }>).map((l) => l.student_id);
  if (ids.length === 0) return [];
  const since = new Date(Date.now() - 28 * 86400000).toISOString();
  const [students, sessions, assessments] = await Promise.all([
    ctx.supabase.from("students").select("id, user_id, status").in("id", ids),
    ctx.supabase.from("workout_sessions").select("student_id, started_at").in("student_id", ids).eq("status", "completed").gte("started_at", since),
    ctx.supabase.from("physical_assessments").select("student_id, assessed_at").in("student_id", ids).order("assessed_at", { ascending: false }),
  ]);
  const st = (students.data ?? []) as Array<{ id: string; user_id: string; status: string }>;
  const profiles = await ctx.supabase.from("profiles").select("id, full_name, primary_goal, weekly_availability").in("id", st.map((s) => s.user_id));
  const prof = new Map(((profiles.data ?? []) as Array<{ id: string; full_name: string | null; primary_goal: string | null; weekly_availability: number | null }>).map((p) => [p.id, p]));
  const sess = (sessions.data ?? []) as Array<{ student_id: string; started_at: string }>;
  const ass = (assessments.data ?? []) as Array<{ student_id: string; assessed_at: string }>;
  const weekAgo = Date.now() - 7 * 86400000;

  return st
    .map((s) => {
      const p = prof.get(s.user_id);
      const mine = sess.filter((x) => x.student_id === s.id);
      const target = p?.weekly_availability ?? null;
      const perWeek = mine.length / 4;
      return {
        id: s.id,
        name: p?.full_name ?? "Sem nome",
        goal: p?.primary_goal ?? null,
        status: s.status,
        thisWeek: mine.filter((x) => new Date(x.started_at).getTime() >= weekAgo).length,
        perWeek,
        target,
        lowFrequency: s.status === "active" && (target ? perWeek < target * 0.5 : perWeek < 1),
        lastSession: mine.map((x) => x.started_at).sort().at(-1) ?? null,
        lastAssessment: ass.find((a) => a.student_id === s.id)?.assessed_at ?? null,
      };
    })
    .sort((a, b) => Number(b.lowFrequency) - Number(a.lowFrequency) || a.name.localeCompare(b.name));
}
