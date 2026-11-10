import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getAuthContext } from "@/lib/db/context";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx.profile.onboarding_completed_at) redirect("/onboarding");
  return <AppShell userName={ctx.profile.full_name ?? ctx.email ?? "Conta"}>{children}</AppShell>;
}
