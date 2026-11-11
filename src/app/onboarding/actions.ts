"use server";

import { revalidatePath } from "next/cache";
import { ensureStudent, getAuthContext } from "@/lib/db/context";
import { replaceMeasurements } from "@/lib/db/assessments";
import { ageFromBirthDate } from "@/lib/domain/metrics";
import { type ActionResult, zodFieldErrors } from "@/lib/validation/common";
import {
  availabilitySchema,
  experienceSchema,
  firstAssessmentSchema,
  foodSchema,
  goalSchema,
  personalSchema,
  physicalSchema,
} from "@/lib/validation/onboarding";

/** Nunca deixa o formulário travado: qualquer falha vira mensagem na tela. */
async function guard(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await fn();
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
    console.error("[onboarding]", e);
    return { ok: false, error: "Não conseguimos salvar agora. Tente de novo em instantes." };
  }
}

async function advance(step: number, patch: Record<string, unknown>): Promise<ActionResult> {
  const ctx = await getAuthContext();
  const nextStep = Math.max(ctx.profile.onboarding_step, step);
  const { error } = await ctx.supabase.from("profiles").update({ ...patch, onboarding_step: nextStep }).eq("id", ctx.userId);
  if (error) return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  return { ok: true };
}

export async function savePersonal(input: unknown): Promise<ActionResult> {
  return guard(async () => {
  const parsed = personalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revise os campos destacados.", fieldErrors: zodFieldErrors(parsed.error) };
  const ctx = await getAuthContext();
  await ensureStudent(ctx);
  return advance(1, { full_name: parsed.data.fullName, birth_date: parsed.data.birthDate, sex: parsed.data.sex });
  });
}

export async function saveGoal(input: unknown): Promise<ActionResult> {
  return guard(async () => {
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Escolha um objetivo.", fieldErrors: zodFieldErrors(parsed.error) };
  return advance(2, { primary_goal: parsed.data.primaryGoal });
  });
}

export async function saveExperience(input: unknown): Promise<ActionResult> {
  return guard(async () => {
  const parsed = experienceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Escolha seu nível.", fieldErrors: zodFieldErrors(parsed.error) };
  return advance(3, { experience_level: parsed.data.experienceLevel });
  });
}

export async function saveAvailability(input: unknown): Promise<ActionResult> {
  return guard(async () => {
  const parsed = availabilitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revise os campos destacados.", fieldErrors: zodFieldErrors(parsed.error) };
  return advance(4, { weekly_availability: parsed.data.weeklyAvailability, session_minutes: parsed.data.sessionMinutes });
  });
}

/** Dados físicos iniciais: altura vai para o perfil, peso cria a avaliação inicial. */
export async function savePhysical(input: unknown): Promise<ActionResult> {
  return guard(async () => {
  const parsed = physicalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revise os campos destacados.", fieldErrors: zodFieldErrors(parsed.error) };
  const ctx = await getAuthContext();
  const student = await ensureStudent(ctx);
  const now = new Date().toISOString();

  if (!ctx.profile.consent_health_data_at) {
    const consent = await ctx.supabase.from("consent_records").insert({ user_id: ctx.userId, consent_type: "health_data", granted: true });
    if (consent.error) return { ok: false, error: "Não foi possível registrar seu consentimento." };
  }

  const age = ageFromBirthDate(ctx.profile.birth_date);
  const existing = await ctx.supabase
    .from("physical_assessments")
    .select("id")
    .eq("student_id", student.id)
    .order("assessed_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const values = {
    weight_kg: parsed.data.weightKg,
    height_cm: parsed.data.heightCm,
    age_years: age,
    sex: ctx.profile.sex,
  };
  const res = existing.data
    ? await ctx.supabase.from("physical_assessments").update(values).eq("id", existing.data.id)
    : await ctx.supabase.from("physical_assessments").insert({ ...values, student_id: student.id, source: "self", notes: "Dados iniciais do cadastro." });
  if (res.error) return { ok: false, error: "Não foi possível salvar seus dados físicos." };

  return advance(5, {
    height_cm: parsed.data.heightCm,
    consent_health_data_at: ctx.profile.consent_health_data_at ?? now,
  });
  });
}

export async function saveFood(input: unknown): Promise<ActionResult> {
  return guard(async () => {
  const parsed = foodSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revise os campos destacados.", fieldErrors: zodFieldErrors(parsed.error) };
  return advance(6, {
    food_preferences: {
      restrictions: parsed.data.restrictions,
      dislikes: parsed.data.dislikes ?? "",
      meals_per_day: parsed.data.mealsPerDay ?? null,
    },
  });
  });
}

/** Último passo: medidas opcionais na avaliação inicial e conclusão do onboarding. */
export async function saveFirstAssessment(input: unknown): Promise<ActionResult> {
  return guard(async () => {
  const parsed = firstAssessmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revise os campos destacados.", fieldErrors: zodFieldErrors(parsed.error) };
  const ctx = await getAuthContext();
  const student = await ensureStudent(ctx);

  const first = await ctx.supabase
    .from("physical_assessments")
    .select("id")
    .eq("student_id", student.id)
    .order("assessed_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!first.data) return { ok: false, error: "Volte ao passo de dados físicos e informe peso e altura." };

  if (!parsed.data.skip) {
    const d = parsed.data;
    const upd = await ctx.supabase
      .from("physical_assessments")
      .update({
        body_fat_pct: d.bodyFatPct ?? null,
        body_fat_method: d.bodyFatPct !== undefined ? d.bodyFatMethod || null : null,
        muscle_mass_kg: d.muscleMassKg ?? null,
        muscle_mass_method: d.muscleMassKg !== undefined ? d.muscleMassMethod || null : null,
      })
      .eq("id", first.data.id);
    if (upd.error) return { ok: false, error: "Não foi possível salvar a composição corporal." };
    try {
      await replaceMeasurements(ctx, first.data.id, student.id, d.measurements as Record<string, number | undefined>);
    } catch {
      return { ok: false, error: "Não foi possível salvar as medidas." };
    }
  }

  const done = await advance(7, { onboarding_completed_at: new Date().toISOString() });
  if (!done.ok) return done;

  await ctx.supabase.from("notifications").insert({
    user_id: ctx.userId,
    kind: "system",
    title: "Cadastro concluído",
    body: parsed.data.skip
      ? "Seu peso e altura iniciais foram registrados. Quando quiser, registre suas medidas em Minha evolução."
      : "Sua primeira avaliação foi registrada. Ela será a base para comparar sua evolução.",
    link: "/evolucao",
  });

  revalidatePath("/", "layout");
  return { ok: true };
  });
}
