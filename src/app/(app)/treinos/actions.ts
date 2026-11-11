"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ensureStudent, getAuthContext } from "@/lib/db/context";
import type { ActionResult } from "@/lib/validation/common";

const uuid = z.string().uuid();

/** Inicia (ou retoma, se já houver um em andamento hoje) o treino de um plano. */
export async function startSession(planId: string): Promise<ActionResult<{ id: string }>> {
  if (!uuid.safeParse(planId).success) return { ok: false, error: "Treino inválido." };
  const ctx = await getAuthContext();
  const student = await ensureStudent(ctx);
  const plan = await ctx.supabase.from("workout_plans").select("id").eq("id", planId).eq("student_id", student.id).eq("is_active", true).maybeSingle();
  if (!plan.data) return { ok: false, error: "Treino não encontrado." };

  const since = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
  const open = await ctx.supabase
    .from("workout_sessions")
    .select("id")
    .eq("student_id", student.id)
    .eq("plan_id", planId)
    .in("status", ["in_progress", "paused"])
    .gte("started_at", since)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (open.data) return { ok: true, data: { id: open.data.id } };

  const { data, error } = await ctx.supabase.from("workout_sessions").insert({ student_id: student.id, plan_id: planId }).select("id").single();
  if (error || !data) return { ok: false, error: "Não foi possível iniciar o treino." };
  return { ok: true, data: { id: data.id } };
}

/** Grava uma série concluída. */
export async function logSet(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = z
    .object({
      sessionId: uuid,
      workoutExerciseId: uuid,
      exerciseId: uuid,
      setNumber: z.number().int().min(1).max(50),
      reps: z.number().int().min(0).max(500),
      load: z.number().min(0).max(1000).nullable(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Série inválida." };
  const ctx = await getAuthContext();
  const d = parsed.data;
  const { data, error } = await ctx.supabase
    .from("workout_logs")
    .insert({
      session_id: d.sessionId,
      workout_exercise_id: d.workoutExerciseId,
      exercise_id: d.exerciseId,
      set_number: d.setNumber,
      reps: d.reps,
      load_kg: d.load,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Não foi possível salvar a série. Verifique sua conexão." };
  return { ok: true, data: { id: data.id } };
}

export async function undoSet(logId: string): Promise<ActionResult> {
  if (!uuid.safeParse(logId).success) return { ok: false, error: "Série inválida." };
  const ctx = await getAuthContext();
  const { error } = await ctx.supabase.from("workout_logs").delete().eq("id", logId);
  return error ? { ok: false, error: "Não foi possível desfazer." } : { ok: true };
}

export async function finishSession(sessionId: string, pausedSeconds: number): Promise<ActionResult> {
  if (!uuid.safeParse(sessionId).success) return { ok: false, error: "Treino inválido." };
  const ctx = await getAuthContext();
  const { error } = await ctx.supabase
    .from("workout_sessions")
    .update({ status: "completed", finished_at: new Date().toISOString(), paused_seconds: Math.max(0, Math.round(pausedSeconds)) })
    .eq("id", sessionId);
  if (error) return { ok: false, error: "Não foi possível concluir o treino." };
  await ctx.supabase.from("notifications").insert({ user_id: ctx.userId, kind: "system", title: "Treino concluído", body: "Sua sessão foi registrada no histórico.", link: "/treinos" });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function abandonSession(sessionId: string): Promise<ActionResult> {
  if (!uuid.safeParse(sessionId).success) return { ok: false, error: "Treino inválido." };
  const ctx = await getAuthContext();
  const logs = await ctx.supabase.from("workout_logs").select("id", { count: "exact", head: true }).eq("session_id", sessionId);
  // Sem nenhuma série feita, o treino é descartado; com séries, fica registrado como interrompido.
  const res = (logs.count ?? 0) === 0
    ? await ctx.supabase.from("workout_sessions").delete().eq("id", sessionId)
    : await ctx.supabase.from("workout_sessions").update({ status: "abandoned", finished_at: new Date().toISOString() }).eq("id", sessionId);
  if (res.error) return { ok: false, error: "Não foi possível sair do treino." };
  revalidatePath("/treinos");
  return { ok: true };
}
