import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getAuthContext } from "@/lib/db/context";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  const path = (await headers()).get("x-pathname") ?? "";
  // Donos de academia e personal não precisam do cadastro corporal para usar seus painéis.
  const staffArea = path.startsWith("/academia") || path.startsWith("/personal");
  if (!ctx.profile.onboarding_completed_at && !staffArea && !ctx.isAdmin && !ctx.isTrainer) redirect("/onboarding");
  return (
    <AppShell userName={ctx.profile.full_name ?? ctx.email ?? "Conta"} isTrainer={ctx.isTrainer} isAdmin={ctx.isAdmin}>
      {children}
    </AppShell>
  );
}
