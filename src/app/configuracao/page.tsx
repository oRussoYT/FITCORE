import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Configuração pendente" };
export const dynamic = "force-dynamic";

export default function SetupPage() {
  if (isSupabaseConfigured) redirect("/login");
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <Logo />
      <h1 className="type-display mt-10 text-[34px]">Falta conectar o banco de dados</h1>
      <p className="mt-4 leading-relaxed text-mist">
        O sistema está instalado, mas ainda não sabe qual projeto do Supabase usar. Sem isso não há login nem dados — e
        não vamos fingir que há.
      </p>
      <ol className="mt-8 space-y-4 text-[15px] leading-relaxed">
        <li>
          <span className="font-semibold">1.</span> No Supabase, abra o projeto e vá em <em>Project Settings → API</em>.
        </li>
        <li>
          <span className="font-semibold">2.</span> Copie a <em>Project URL</em> e a chave <em>anon public</em>.
        </li>
        <li>
          <span className="font-semibold">3.</span> Na Vercel (ou no arquivo <code>.env.local</code>), cadastre{" "}
          <code className="text-lime">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
          <code className="text-lime">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
        </li>
        <li>
          <span className="font-semibold">4.</span> Publique novamente. Esta página some sozinha.
        </li>
      </ol>
    </main>
  );
}
