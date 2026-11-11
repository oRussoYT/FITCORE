"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/lib/db/context";
import type { ActionResult } from "@/lib/validation/common";

const reviewSchema = z.object({
  rating: z.number().int().min(1, "Escolha de 1 a 5 estrelas.").max(5),
  body: z.string().trim().min(10, "Escreva pelo menos 10 caracteres.").max(600, "Use no máximo 600 caracteres."),
  displayName: z.string().trim().min(2, "Informe um nome de exibição.").max(60),
});

/** Envia uma nova avaliação (sempre passa por aprovação antes de aparecer na página inicial). */
export async function sendReview(input: unknown): Promise<ActionResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const ctx = await getAuthContext();
  const { error } = await ctx.supabase.from("platform_reviews").insert({
    user_id: ctx.userId,
    rating: parsed.data.rating,
    body: parsed.data.body,
    display_name: parsed.data.displayName,
  });
  if (error) {
    return { ok: false, error: error.message.includes("limite") ? "Você já enviou 3 avaliações hoje. Tente novamente amanhã." : "Não foi possível enviar sua avaliação." };
  }
  revalidatePath("/avaliar");
  return { ok: true };
}

export async function deleteReview(id: string): Promise<ActionResult> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "Avaliação inválida." };
  const ctx = await getAuthContext();
  const { error } = await ctx.supabase.from("platform_reviews").delete().eq("id", id).eq("user_id", ctx.userId);
  if (error) return { ok: false, error: "Não foi possível excluir." };
  revalidatePath("/avaliar");
  revalidatePath("/");
  return { ok: true };
}
