import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { AuthShowcase } from "@/components/auth/AuthShowcase";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <AuthShowcase />
      <main className="relative flex flex-col overflow-hidden bg-ink px-5 py-8 sm:px-10">
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full bg-[radial-gradient(circle,rgba(204,255,0,0.09),transparent_65%)]" />
        <div className="relative flex items-center justify-between">
          <Link href="/" aria-label="FITCORE AI — página inicial" className="lg:invisible">
            <Logo />
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-mist hover:text-bone">
            <ArrowLeft className="size-3.5" /> Voltar ao site
          </Link>
        </div>
        <div className="relative flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[420px] rounded-[28px] border border-line bg-surface/70 p-7 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.8)] backdrop-blur sm:p-9">
            {children}
          </div>
        </div>
        <p className="relative text-center text-[12px] text-fog">
          Seus dados corporais são privados.{" "}
          <Link href="/privacidade" className="underline underline-offset-2 hover:text-bone">
            Como protegemos
          </Link>
        </p>
      </main>
    </div>
  );
}
