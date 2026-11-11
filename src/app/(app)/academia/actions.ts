"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/lib/db/context";
import { getAdminGym } from "@/lib/db/gym";
import type { ActionResult } from "@/lib/validation/common";

const uuid = z.string().uuid();

async function adminGym() {
  const ctx = await getAuthContext();
  const gym = await getAdminGym(ctx);
  if (!gym) throw new Error("Sem academia");
  return { ctx, gym };
}

function done(path = "/academia"): ActionResult {
  revalidatePath(path, "layout");
  return { ok: true };
}

export async function createGym(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ name: z.string().trim().min(2, "Informe o nome da academia.").max(120) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Nome inválido." };
  const ctx = await getAuthContext();
  if (ctx.isAdmin) return { ok: false, error: "Você já administra uma academia." };
  const base = parsed.data.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "academia";
  const slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
  const { error } = await ctx.supabase.from("gyms").insert({ name: parsed.data.name, slug, created_by: ctx.userId });
  if (error) return { ok: false, error: "Não foi possível criar a academia." };
  return done();
}

export async function inviteMember(input: unknown): Promise<ActionResult> {
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().email("E-mail inválido."), role: z.enum(["student", "trainer"]) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const { ctx, gym } = await adminGym();
  const { error } = await ctx.supabase.from("gym_invites").insert({ gym_id: gym.id, email: parsed.data.email, role: parsed.data.role });
  if (error) return { ok: false, error: error.code === "23505" ? "Já existe um convite pendente para este e-mail." : "Não foi possível enviar o convite." };
  return done();
}

export async function revokeInvite(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Convite inválido." };
  const { ctx, gym } = await adminGym();
  const { error } = await ctx.supabase.from("gym_invites").update({ status: "revoked" }).eq("id", id).eq("gym_id", gym.id);
  return error ? { ok: false, error: "Não foi possível cancelar." } : done();
}

export async function setStudentStatus(studentId: string, status: "active" | "inactive"): Promise<ActionResult> {
  if (!uuid.safeParse(studentId).success) return { ok: false, error: "Aluno inválido." };
  const { ctx, gym } = await adminGym();
  const { error } = await ctx.supabase.from("students").update({ status }).eq("id", studentId).eq("gym_id", gym.id);
  return error ? { ok: false, error: "Não foi possível alterar o status." } : done();
}

export async function setTrainerLink(trainerId: string, studentId: string, linked: boolean): Promise<ActionResult> {
  if (!uuid.safeParse(trainerId).success || !uuid.safeParse(studentId).success) return { ok: false, error: "Dados inválidos." };
  const { ctx } = await adminGym();
  const res = linked
    ? await ctx.supabase.from("trainer_students").insert({ trainer_id: trainerId, student_id: studentId })
    : await ctx.supabase.from("trainer_students").delete().eq("trainer_id", trainerId).eq("student_id", studentId);
  if (res.error && res.error.code !== "23505") return { ok: false, error: "Não foi possível alterar o vínculo." };
  return done();
}

export async function savePlan(input: unknown): Promise<ActionResult> {
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Informe o nome do plano.").max(60),
      price: z.coerce.number({ invalid_type_error: "Preço inválido." }).min(0).max(100000),
      interval: z.enum(["monthly", "quarterly", "semiannual", "yearly"]),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const { ctx, gym } = await adminGym();
  const { error } = await ctx.supabase
    .from("gym_plans")
    .insert({ gym_id: gym.id, name: parsed.data.name, price_cents: Math.round(parsed.data.price * 100), billing_interval: parsed.data.interval });
  return error ? { ok: false, error: "Não foi possível criar o plano." } : done();
}

export async function togglePlan(id: string, active: boolean): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Plano inválido." };
  const { ctx, gym } = await adminGym();
  const { error } = await ctx.supabase.from("gym_plans").update({ is_active: active }).eq("id", id).eq("gym_id", gym.id);
  return error ? { ok: false, error: "Não foi possível alterar o plano." } : done();
}

/** Assina um plano para o aluno (cancelando a assinatura anterior, se houver). */
export async function assignPlan(studentId: string, planId: string | null): Promise<ActionResult> {
  if (!uuid.safeParse(studentId).success || (planId && !uuid.safeParse(planId).success)) return { ok: false, error: "Dados inválidos." };
  const { ctx, gym } = await adminGym();
  const cancel = await ctx.supabase
    .from("subscriptions")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("gym_id", gym.id)
    .eq("student_id", studentId)
    .neq("status", "canceled");
  if (cancel.error) return { ok: false, error: "Não foi possível atualizar a assinatura." };
  if (!planId) return done();
  const plan = await ctx.supabase.from("gym_plans").select("price_cents").eq("id", planId).eq("gym_id", gym.id).single();
  if (plan.error || !plan.data) return { ok: false, error: "Plano não encontrado." };
  const { error } = await ctx.supabase
    .from("subscriptions")
    .insert({ gym_id: gym.id, student_id: studentId, gym_plan_id: planId, price_cents: plan.data.price_cents, status: "active" });
  return error ? { ok: false, error: "Não foi possível criar a assinatura." } : done();
}

/** Registra o pagamento da mensalidade de hoje para a assinatura ativa do aluno. */
export async function registerPayment(subscriptionId: string): Promise<ActionResult> {
  if (!uuid.safeParse(subscriptionId).success) return { ok: false, error: "Assinatura inválida." };
  const { ctx, gym } = await adminGym();
  const sub = await ctx.supabase.from("subscriptions").select("price_cents").eq("id", subscriptionId).eq("gym_id", gym.id).single();
  if (sub.error || !sub.data) return { ok: false, error: "Assinatura não encontrada." };
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await ctx.supabase.from("subscription_payments").insert({
    subscription_id: subscriptionId,
    gym_id: gym.id,
    amount_cents: sub.data.price_cents,
    due_on: today,
    paid_at: new Date().toISOString(),
    status: "paid",
  });
  return error ? { ok: false, error: "Não foi possível registrar o pagamento." } : done();
}
