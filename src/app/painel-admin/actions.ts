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
