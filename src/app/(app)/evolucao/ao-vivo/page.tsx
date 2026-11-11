import type { Metadata } from "next";
import Link from "next/link";
import { LiveAssessment } from "@/components/live/LiveAssessment";
import { aiConfigured } from "@/lib/ai/provider";
import { ensureStudent, getAuthContext } from "@/lib/db/context";

export const metadata: Metadata = { title: "Avaliação ao vivo" };

export default async function LivePage() {
  const ctx = await getAuthContext();
  const student = await ensureStudent(ctx);
  const { data: consent } = await ctx.supabase
    .from("consent_records")
    .select("granted")
    .eq("user_id", ctx.userId)
    .eq("consent_type", "ai_analysis")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!ctx.profile.consent_photos_at) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="type-display text-[30px]">Falta sua autorização</h1>
        <p className="mt-3 leading-relaxed text-mist">
          A avaliação ao vivo tira 4 fotos suas. Antes, autorize o armazenamento das fotos (e, se quiser, a análise pela IA).
        </p>
        <Link href="/evolucao/fotos" className="mt-8 inline-flex h-12 items-center rounded-full bg-lime px-6 font-bold text-ink">
          Autorizar fotos
        </Link>
      </div>
    );
  }

  return <LiveAssessment studentId={student.id} canAnalyze={Boolean(consent?.granted) && aiConfigured()} />;
}
