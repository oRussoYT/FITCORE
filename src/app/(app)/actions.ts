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
