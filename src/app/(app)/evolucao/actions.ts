"use server";

import { revalidatePath } from "next/cache";
import { ensureStudent, getAuthContext } from "@/lib/db/context";
import { replaceMeasurements } from "@/lib/db/assessments";
import { ageFromBirthDate } from "@/lib/domain/metrics";
import { assessmentSchema } from "@/lib/validation/assessment";
import { type ActionResult, zodFieldErrors } from "@/lib/validation/common";

export async function createAssessment(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = assessmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revise os campos destacados.", fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;

  const hasAny =
    d.weightKg !== undefined ||
    d.bodyFatPct !== undefined ||
    d.muscleMassKg !== undefined ||
    Object.values(d.measurements).some((v) => typeof v === "number");
  if (!hasAny) return { ok: false, error: "Preencha pelo menos uma medida para salvar a avaliação." };

  const ctx = await getAuthContext();
  const student = await ensureStudent(ctx);
  const assessedAt = new Date(`${d.assessedOn}T12:00:00`);

  const { data, error } = await ctx.supabase
    .from("physical_assessments")
    .insert({
      student_id: student.id,
      assessed_at: assessedAt.toISOString(),
      source: d.source,
      weight_kg: d.weightKg ?? null,
      height_cm: d.heightCm ?? ctx.profile.height_cm,
      age_years: ageFromBirthDate(ctx.profile.birth_date, assessedAt),
      sex: ctx.profile.sex,
      body_fat_pct: d.bodyFatPct ?? null,
      body_fat_method: d.bodyFatPct !== undefined ? d.bodyFatMethod || null : null,
      muscle_mass_kg: d.muscleMassKg ?? null,
      muscle_mass_method: d.muscleMassKg !== undefined ? d.muscleMassMethod || null : null,
      notes: d.notes || null,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Não foi possível salvar a avaliação." };

  try {
    await replaceMeasurements(ctx, data.id, student.id, d.measurements as Record<string, number | undefined>);
  } catch {
    await ctx.supabase.from("physical_assessments").delete().eq("id", data.id);
    return { ok: false, error: "Não foi possível salvar as medidas. Nada foi gravado." };
  }

  await ctx.supabase.from("notifications").insert({
    user_id: ctx.userId,
    kind: "system",
    title: "Avaliação registrada",
    body: `Avaliação de ${assessedAt.toLocaleDateString("pt-BR")} salva no seu histórico.`,
    link: "/evolucao",
  });

  revalidatePath("/dashboard");
  revalidatePath("/evolucao");
  return { ok: true, data: { id: data.id } };
}

export async function deleteAssessment(id: string): Promise<ActionResult> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "Avaliação inválida." };
  const ctx = await getAuthContext();
  const { error, count } = await ctx.supabase.from("physical_assessments").delete({ count: "exact" }).eq("id", id);
  if (error || !count) return { ok: false, error: "Não foi possível excluir esta avaliação." };
  revalidatePath("/dashboard");
  revalidatePath("/evolucao");
  return { ok: true };
}
