import type { Metadata } from "next";
import { Landing, type PublicReview } from "@/components/landing/Landing";
import { brand } from "@/config/brand";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { absolute: `${brand.name} — ${brand.tagline}` },
  description: brand.description,
};

export default async function Home() {
  let loggedIn = false;
  let reviews: PublicReview[] = [];
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [{ data: auth }, { data }] = await Promise.all([supabase.auth.getUser(), supabase.rpc("public_reviews", { p_limit: 12 })]);
    loggedIn = Boolean(auth.user);
    reviews = (data as PublicReview[] | null) ?? [];
  }
  return <Landing loggedIn={loggedIn} reviews={reviews} />;
}
