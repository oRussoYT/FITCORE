"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/db/context";

export async function markNotificationsRead(ids?: string[]) {
  const ctx = await getAuthContext();
  let q = ctx.supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (ids && ids.length) q = q.in("id", ids);
  await q;
  revalidatePath("/", "layout");
}

export async function signOut() {
  const ctx = await getAuthContext();
  await ctx.supabase.auth.signOut();
  redirect("/login");
}

export async function respondInvite(inviteId: string, accept: boolean) {
  if (!/^[0-9a-f-]{36}$/i.test(inviteId)) return { ok: false as const, error: "Convite inválido." };
  const ctx = await getAuthContext();
  const { error } = await ctx.supabase.rpc("respond_gym_invite", { p_invite: inviteId, p_accept: accept });
  if (error) {
    return { ok: false as const, error: error.message.includes("outra academia") ? "Você já está vinculado a outra academia." : "Não foi possível responder ao convite." };
  }
  revalidatePath("/", "layout");
  return { ok: true as const };
}
