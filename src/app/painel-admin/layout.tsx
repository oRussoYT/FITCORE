import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { createClient } from "@/lib/supabase/server";
import { MfaGate } from "./MfaGate";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Painel",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

/**
 * Camadas de proteção desta área:
 * 1. Endereço secreto (ADMIN_PATH); o nome interno sempre responde 404.
 * 2. Sem sessão ou sem permissão: 404 idêntico ao de qualquer página inexistente.
 * 3. Segundo fator (código do app autenticador) obrigatório nesta sessão.
 * 4. O banco recusa as funções de admin sem esse segundo fator e registra cada acesso.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: isAdmin, error } = await supabase.rpc("is_platform_admin");
  if (error || isAdmin !== true) notFound();

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const verified = aal?.currentLevel === "aal2";

  return (
    <div className="min-h-dvh bg-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-10">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-[12.5px] text-mist sm:flex">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-lime opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-lime" />
              </span>
              {user.email}
            </span>
            <span className="rounded-full border border-coral/40 px-3 py-1 text-[12px] font-semibold text-coral">Área restrita</span>
          </div>
        </div>
      </header>
      {verified ? children : <MfaGate hasFactor={aal?.nextLevel === "aal2"} />}
    </div>
  );
}
