"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/env";

let client: ReturnType<typeof createBrowserClient> | null = null;

/** Cliente Supabase para componentes do navegador (login, envio de fotos). */
export function getBrowserClient() {
  if (!client) client = createBrowserClient(supabaseEnv.url, supabaseEnv.anonKey);
  return client;
}
