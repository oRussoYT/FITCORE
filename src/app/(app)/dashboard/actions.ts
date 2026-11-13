"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ensureStudent, getAuthContext } from "@/lib/db/context";
import type { ActionResult } from "@/lib/validation/common";

const waterSchema = z.number().int().min(50).max(2000);
const weightSchema = z.number().min(20, "Peso inválido.").max(400, "Peso inválido.");

/** Registra um copo/garrafa de água. */
export async function addWater(ml: number): Promise<ActionResult<{ id: string }>> {
  const parsed = waterSchema.safeParse(ml);
  if (!parsed.success) return { ok: false, error: "Quantidade inválida." };
  const ctx = await getAuthContext();
  const student = await ensureStudent(ctx);
  const { data, error } = await ctx.supabase.from("water_logs").insert({ student_id: student.id, amount_ml: parsed.data }).select("id").single();
  if (error || !data) {
    console.error("[agua]", error?.message);
    return { ok: false, error: "Não foi possível registrar a água agora. Tente de novo em instantes." };
  }
  revalidatePath("/dashboard");
  return { ok: true, data: { id: data.id as string } };
}

export async function undoWater(id: string): Promise<ActionResult> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "Registro inválido." };
  const ctx = await getAuthContext();
  const { error } = await ctx.supabase.from("water_logs").delete().eq("id", id);
  if (error) return { ok: false, error: "Não foi possível desfazer." };
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Pesagem rápida: vira uma avaliação só com o peso, feita pela própria pessoa. */
export async function logWeight(kg: number): Promise<ActionResult> {
  const parsed = weightSchema.safeParse(Math.round(kg * 10) / 10);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Peso inválido." };
  const ctx = await getAuthContext();
  const student = await ensureStudent(ctx);
  const { error } = await ctx.supabase.from("physical_assessments").insert({ student_id: student.id, weight_kg: parsed.data });
  if (error) return { ok: false, error: "Não foi possível salvar o peso." };
  revalidatePath("/dashboard");
  revalidatePath("/evolucao");
  return { ok: true };
}
