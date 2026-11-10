"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/db/context";
import type { ActionResult } from "@/lib/validation/common";

/** Apaga avaliações, medidas, relatórios e fotos do próprio aluno (direito de exclusão — LGPD). */
export async function deleteBodyData(confirmation: string): Promise<ActionResult> {
  if (confirmation.trim().toUpperCase() !== "APAGAR") return { ok: false, error: 'Digite APAGAR para confirmar.' };
  const ctx = await getAuthContext();
  if (!ctx.student) return { ok: true };
  const sid = ctx.student.id;

  const photos = await ctx.supabase.from("body_photos").select("storage_path").eq("student_id", sid);
  const paths = (photos.data ?? []).map((p: { storage_path: string }) => p.storage_path);
  if (paths.length) await ctx.supabase.storage.from("body-photos").remove(paths);

  const steps = await Promise.all([
    ctx.supabase.from("body_photos").delete().eq("student_id", sid),
    ctx.supabase.from("body_analysis_reports").delete().eq("student_id", sid),
    ctx.supabase.from("physical_assessments").delete().eq("student_id", sid),
  ]);
  if (steps.some((s) => s.error)) return { ok: false, error: "Parte dos dados não pôde ser apagada. Tente novamente." };

  await ctx.supabase.from("consent_records").insert({ user_id: ctx.userId, consent_type: "health_data", granted: false });
  await ctx.supabase.from("profiles").update({ consent_health_data_at: null, consent_photos_at: null }).eq("id", ctx.userId);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Registra o pedido de exclusão da conta inteira para processamento. */
export async function requestAccountDeletion(reason: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  const pending = await ctx.supabase.from("data_requests").select("id").eq("kind", "delete").eq("status", "pending").maybeSingle();
  if (pending.data) return { ok: true };
  const { error } = await ctx.supabase.from("data_requests").insert({ user_id: ctx.userId, kind: "delete", reason: reason.slice(0, 500) || null });
  if (error) return { ok: false, error: "Não foi possível registrar o pedido." };
  revalidatePath("/perfil");
  return { ok: true };
}
