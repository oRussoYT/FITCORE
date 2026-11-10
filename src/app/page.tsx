import type { Metadata } from "next";
import { Landing } from "@/components/landing/Landing";
import { brand } from "@/config/brand";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { absolute: `${brand.name} — ${brand.tagline}` },
  description: brand.description,
};

export default async function Home() {
  let loggedIn = false;
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    loggedIn = Boolean(data.user);
  }
  return <Landing loggedIn={loggedIn} />;
}
