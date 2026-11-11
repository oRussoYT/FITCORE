"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/lib/db/context";
import type { ActionResult } from "@/lib/validation/common";

const uuid = z.string().uuid();

async function notifyStudent(ctx: Awaited<ReturnType<typeof getAuthContext>>, studentId: string, kind: "trainer_note" | "workout_released", title: string, body: string) {
  const s = await ctx.supabase.from("students").select("user_id").eq("id", studentId).maybeSingle();
  if (s.data?.user_id) {
    await ctx.supabase.from("notifications").insert({ user_id: s.data.user_id, kind, title, body, link: "/dashboard" });
  }
}

export async function addNote(input: unknown): Promise<ActionResult> {
  const parsed = z
    .object({ studentId: uuid, body: z.string().trim().min(1, "Escreva a observação.").max(4000), visible: z.boolean() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const ctx = await getAuthContext();
  const { error } = await ctx.supabase
    .from("student_notes")
    .insert({ student_id: parsed.data.studentId, author_id: ctx.userId, body: parsed.data.body, visible_to_student: parsed.data.visible });
  if (error) return { ok: false, error: "Você não tem permissão para este aluno ou a conexão falhou." };
  if (parsed.data.visible) await notifyStudent(ctx, parsed.data.studentId, "trainer_note", "Seu personal deixou uma observação", parsed.data.body.slice(0, 140));
  revalidatePath(`/personal/${parsed.data.studentId}`);
  return { ok: true };
}

export async function createPlan(input: unknown): Promise<ActionResult> {
  const parsed = z
    .object({
      studentId: uuid,
      label: z.enum(["A", "B", "C", "D", "E"]),
      name: z.string().trim().min(1, "Dê um nome ao treino.").max(80),
      notes: z.string().trim().max(2000).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const ctx = await getAuthContext();
  // Um treino ativo por letra: o anterior com a mesma letra é arquivado.
  await ctx.supabase.from("workout_plans").update({ is_active: false }).eq("student_id", parsed.data.studentId).eq("label", parsed.data.label).eq("is_active", true);
  const { error } = await ctx.supabase.from("workout_plans").insert({
    student_id: parsed.data.studentId,
    label: parsed.data.label,
    name: parsed.data.name,
    notes: parsed.data.notes || null,
  });
  if (error) return { ok: false, error: "Não foi possível criar o treino." };
  await notifyStudent(ctx, parsed.data.studentId, "workout_released", `Treino ${parsed.data.label} liberado`, parsed.data.name);
  revalidatePath(`/personal/${parsed.data.studentId}`);
  return { ok: true };
}

export async function archivePlan(planId: string, studentId: string): Promise<ActionResult> {
  if (!uuid.safeParse(planId).success) return { ok: false, error: "Treino inválido." };
  const ctx = await getAuthContext();
  const { error } = await ctx.supabase.from("workout_plans").update({ is_active: false }).eq("id", planId);
  if (error) return { ok: false, error: "Não foi possível arquivar." };
  revalidatePath(`/personal/${studentId}`);
  return { ok: true };
}

export async function addExercise(input: unknown): Promise<ActionResult> {
  const parsed = z
    .object({
      planId: uuid,
      studentId: uuid,
      exerciseId: uuid,
      sets: z.coerce.number().int().min(1, "Séries: mínimo 1.").max(20),
      reps: z.string().trim().min(1, "Informe as repetições.").max(20),
      rest: z.coerce.number().int().min(0).max(900),
      load: z.preprocess((v) => (v === "" || v == null ? undefined : Number(String(v).replace(",", "."))), z.number().min(0).max(1000).optional()),
      notes: z.string().trim().max(500).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const ctx = await getAuthContext();
  const count = await ctx.supabase.from("workout_exercises").select("id", { count: "exact", head: true }).eq("plan_id", parsed.data.planId);
  const { error } = await ctx.supabase.from("workout_exercises").insert({
    plan_id: parsed.data.planId,
    exercise_id: parsed.data.exerciseId,
    position: count.count ?? 0,
    sets: parsed.data.sets,
    reps: parsed.data.reps,
    rest_seconds: parsed.data.rest,
    target_load_kg: parsed.data.load ?? null,
    notes: parsed.data.notes || null,
  });
  if (error) return { ok: false, error: "Não foi possível adicionar o exercício." };
  revalidatePath(`/personal/${parsed.data.studentId}`);
  return { ok: true };
}

export async function removeExercise(id: string, studentId: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Exercício inválido." };
  const ctx = await getAuthContext();
  const { error } = await ctx.supabase.from("workout_exercises").delete().eq("id", id);
  if (error) return { ok: false, error: "Não foi possível remover." };
  revalidatePath(`/personal/${studentId}`);
  return { ok: true };
}
