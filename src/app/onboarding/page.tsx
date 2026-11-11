import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { getAuthContext } from "@/lib/db/context";
import { OnboardingFlow } from "./OnboardingFlow";

export const metadata: Metadata = { title: "Primeiros passos" };

export default async function OnboardingPage() {
  const ctx = await getAuthContext();
  if (ctx.profile.onboarding_completed_at) redirect("/dashboard");

  let initialWeight: number | null = null;
  if (ctx.student) {
    const { data } = await ctx.supabase
      .from("physical_assessments")
      .select("weight_kg")
      .eq("student_id", ctx.student.id)
      .order("assessed_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    initialWeight = data?.weight_kg != null ? Number(data.weight_kg) : null;
  }

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-6">
        <Link href="/" aria-label="FITCORE AI — página inicial"><Logo /></Link>
        <Link href="/academia" className="text-[13px] text-mist underline-offset-4 hover:text-bone hover:underline">
          Sou dono de academia
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-20">
        <OnboardingFlow profile={ctx.profile} initialWeight={initialWeight} />
      </main>
    </div>
  );
}
