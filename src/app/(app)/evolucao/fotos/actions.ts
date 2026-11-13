"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ensureStudent, getAuthContext } from "@/lib/db/context";
import type { ActionResult } from "@/lib/validation/common";
import { consentVersion } from "@/lib/ai/provider";

export async function setPhotoConsent(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ photos: z.boolean(), ai: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const ctx = await getAuthContext();
  const now = new Date().toISOString();
  const recs = [
    { user_id: ctx.userId, consent_type: "body_photos", granted: parsed.data.photos },
    { user_id: ctx.userId, consent_type: "ai_analysis", granted: parsed.data.ai && parsed.data.photos, version: consentVersion() },
  ];
  const a = await ctx.supabase.from("consent_records").insert(recs);
  const b = await ctx.supabase.from("profiles").update({ consent_photos_at: parsed.data.photos ? (ctx.profile.consent_photos_at ?? now) : null }).eq("id", ctx.userId);
  if (a.error || b.error) return { ok: false, error: "Não foi possível salvar sua escolha." };
  revalidatePath("/evolucao/fotos");
  return { ok: true };
}

/** Registra no banco uma foto já enviada ao armazenamento privado. */
export async function registerPhoto(input: unknown): Promise<ActionResult> {
  const parsed = z
    .object({
      path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/i),
      pose: z.enum(["front", "back", "left", "right"]),
      takenOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Foto inválida." };
  const ctx = await getAuthContext();
  const student = await ensureStudent(ctx);
  if (!parsed.data.path.startsWith(`${student.id}/`)) return { ok: false, error: "Foto inválida." };
  if (!ctx.profile.consent_photos_at) return { ok: false, error: "Autorize o armazenamento das fotos primeiro." };
  const { error } = await ctx.supabase.from("body_photos").insert({
    student_id: student.id,
    storage_path: parsed.data.path,
    pose: parsed.data.pose,
    taken_at: new Date(`${parsed.data.takenOn}T12:00:00`).toISOString(),
    consent_at: ctx.profile.consent_photos_at,
  });
  if (error) {
    await ctx.supabase.storage.from("body-photos").remove([parsed.data.path]);
    return { ok: false, error: "Não foi possível salvar a foto." };
  }
  revalidatePath("/evolucao/fotos");
  return { ok: true };
}

export async function deletePhoto(id: string): Promise<ActionResult> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "Foto inválida." };
  const ctx = await getAuthContext();
  const { data } = await ctx.supabase.from("body_photos").select("storage_path").eq("id", id).maybeSingle();
  if (!data) return { ok: false, error: "Foto não encontrada." };
  await ctx.supabase.storage.from("body-photos").remove([data.storage_path]);
  const { error } = await ctx.supabase.from("body_photos").delete().eq("id", id);
  if (error) return { ok: false, error: "Não foi possível excluir." };
  revalidatePath("/evolucao/fotos");
  return { ok: true };
}
