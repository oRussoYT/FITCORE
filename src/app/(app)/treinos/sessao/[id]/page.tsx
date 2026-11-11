import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { WorkoutPlayer, type PlayerExercise } from "@/components/workout/WorkoutPlayer";
import { ensureStudent, getAuthContext } from "@/lib/db/context";

export const metadata: Metadata = { title: "Treinando" };

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ctx = await getAuthContext();
  const student = await ensureStudent(ctx);

  const { data: session } = await ctx.supabase
    .from("workout_sessions")
    .select("id, status, started_at, plan_id, workout_plans(label, name)")
    .eq("id", id)
    .eq("student_id", student.id)
    .maybeSingle();
  if (!session || !session.plan_id) notFound();
  if (session.status === "completed" || session.status === "abandoned") redirect("/treinos");

  const [{ data: items }, { data: logs }] = await Promise.all([
    ctx.supabase
      .from("workout_exercises")
      .select("id, position, sets, reps, rest_seconds, target_load_kg, exercise_id, exercises(name, instructions, media_url, primary_muscle, secondary_muscles)")
      .eq("plan_id", session.plan_id)
      .order("position"),
    ctx.supabase.from("workout_logs").select("id, workout_exercise_id, reps, load_kg, completed_at").eq("session_id", id).order("completed_at"),
  ]);

  type Item = {
    id: string;
    sets: number;
    reps: string;
    rest_seconds: number;
    target_load_kg: number | null;
    exercise_id: string;
    exercises: { name: string; instructions: string | null; media_url: string | null; primary_muscle: string; secondary_muscles: string[] | null } | null;
  };
  const list = (items ?? []) as unknown as Item[];
  if (list.length === 0) redirect("/treinos?vazio=1");

  // Última carga usada em cada exercício (sessões anteriores)
  const { data: prev } = await ctx.supabase
    .from("workout_logs")
    .select("exercise_id, load_kg, completed_at")
    .eq("student_id", student.id)
    .neq("session_id", id)
    .in("exercise_id", list.map((i) => i.exercise_id))
    .not("load_kg", "is", null)
    .order("completed_at", { ascending: false })
    .limit(200);
  const lastLoad = new Map<string, number>();
  for (const p of (prev ?? []) as Array<{ exercise_id: string; load_kg: number }>) if (!lastLoad.has(p.exercise_id)) lastLoad.set(p.exercise_id, Number(p.load_kg));

  const exercises: PlayerExercise[] = list.map((i) => ({
    workoutExerciseId: i.id,
    exerciseId: i.exercise_id,
    name: i.exercises?.name ?? "Exercício",
    instructions: i.exercises?.instructions ?? null,
    mediaUrl: i.exercises?.media_url ?? null,
    primaryMuscle: i.exercises?.primary_muscle ?? "abs",
    secondaryMuscles: i.exercises?.secondary_muscles ?? [],
    sets: i.sets,
    reps: i.reps,
    restSeconds: i.rest_seconds,
    targetLoad: i.target_load_kg != null ? Number(i.target_load_kg) : null,
    lastLoad: lastLoad.get(i.exercise_id) ?? null,
  }));
  const indexOf = new Map(list.map((i, n) => [i.id, n]));
  const initialDone = ((logs ?? []) as Array<{ id: string; workout_exercise_id: string | null; reps: number | null; load_kg: number | null }>)
    .filter((l) => l.workout_exercise_id && indexOf.has(l.workout_exercise_id))
    .map((l) => ({ logId: l.id, exerciseIdx: indexOf.get(l.workout_exercise_id!)!, reps: l.reps ?? 0, load: l.load_kg != null ? Number(l.load_kg) : null }));

  const plan = session.workout_plans as unknown as { label: string; name: string } | null;
  return (
    <WorkoutPlayer
      sessionId={id}
      planLabel={plan?.label ?? ""}
      planName={plan?.name ?? "Treino"}
      startedAt={session.started_at}
      exercises={exercises}
      initialDone={initialDone}
    />
  );
}
