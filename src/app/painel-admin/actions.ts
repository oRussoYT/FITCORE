"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setDataRequestStatus(id: string, status: "processing" | "done" | "rejected") {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false as const, error: "Pedido inválido." };
  const supabase = await createClient();
  // O banco confere admin + segundo fator antes de alterar qualquer coisa.
  const { error } = await supabase.rpc("admin_set_data_request_status", { p_id: id, p_status: status });
  if (error) return { ok: false as const, error: "Ação recusada." };
  revalidatePath("/painel-admin");
  return { ok: true as const };
}

export async function moderateReview(id: string, status: "approved" | "rejected") {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false as const, error: "Avaliação inválida." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_moderate_review", { p_id: id, p_status: status });
  if (error) return { ok: false as const, error: "Ação recusada." };
  revalidatePath("/painel-admin");
  revalidatePath("/");
  return { ok: true as const };
}

const UUID = /^[0-9a-f-]{36}$/i;

export type AdminMember = { id: string; user_id: string; email: string | null; full_name: string | null; role: string; status: string; created_at: string };

export async function loadGymMembers(gymId: string) {
  if (!UUID.test(gymId)) return { ok: false as const, error: "Academia inválida." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_gym_members", { p_gym: gymId });
  if (error) return { ok: false as const, error: "Não foi possível carregar a equipe." };
  return { ok: true as const, data: (data ?? []) as AdminMember[] };
}

export async function setGymSuspended(gymId: string, suspend: boolean, reason?: string) {
  if (!UUID.test(gymId)) return { ok: false as const, error: "Academia inválida." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_gym_suspended", {
    p_gym: gymId,
    p_suspend: suspend,
    p_reason: reason?.trim().slice(0, 300) || null,
  });
  if (error) return { ok: false as const, error: "Ação recusada." };
  revalidatePath("/painel-admin");
  return { ok: true as const };
}

export async function setMemberStatus(memberId: string, active: boolean) {
  if (!UUID.test(memberId)) return { ok: false as const, error: "Membro inválido." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_member_status", { p_member: memberId, p_active: active });
  if (error) return { ok: false as const, error: "Ação recusada." };
  revalidatePath("/painel-admin");
  return { ok: true as const };
}
