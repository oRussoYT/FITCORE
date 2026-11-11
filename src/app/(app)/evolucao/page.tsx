import type { Metadata } from "next";
import Link from "next/link";
import { Camera, Plus, Video } from "lucide-react";
import { aiConfigured } from "@/lib/ai/provider";
import { ReportButton } from "./ReportButton";
import { ReportView } from "./ReportView";
import { Notice } from "@/components/ui/Feedback";
import { ensureStudent, getAuthContext } from "@/lib/db/context";
import { listAssessments } from "@/lib/db/assessments";
import { SITE_LABELS } from "@/lib/domain/labels";
import { formatNumber, formatSigned, isStagnant } from "@/lib/domain/metrics";
import { DeleteAssessmentButton } from "./DeleteAssessmentButton";
import { WeightChart } from "./WeightChart";

export const metadata: Metadata = { title: "Minha evolução" };

const SOURCE_LABEL = { self: "Registrada por você", professional: "Feita por profissional", import: "Importada" } as const;

export default async function EvolutionPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const ctx = await getAuthContext();
  const student = await ensureStudent(ctx);
  const assessments = await listAssessments(ctx, student.id);
  const weights = assessments.filter((a) => a.weight_kg !== null).map((a) => ({ date: a.assessed_at, value: a.weight_kg as number }));
  const stagnant = isStagnant(
    weights.map((w) => w.value),
    0.4,
    3,
  );
  const desc = [...assessments].reverse();
  const { data: reportRows } = await ctx.supabase
    .from("body_analysis_reports")
    .select("id, content, created_at")
    .eq("student_id", student.id)
    .eq("kind", "assessment")
    .order("created_at", { ascending: false })
    .limit(3);
  const reports = (reportRows ?? []) as Array<{ id: string; content: Record<string, unknown>; created_at: string }>;
  const reportReason = assessments.length === 0 ? "Registre uma avaliação primeiro." : !aiConfigured() ? "A IA será ativada em breve pelo administrador do sistema." : undefined;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="type-display text-[32px] sm:text-[38px]">Minha evolução</h1>
          <p className="mt-2 text-mist">AI Body Analysis · histórico de todas as avaliações</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/evolucao/ao-vivo"
            className="inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-control)] border border-lime/40 bg-lime/10 px-4 text-sm font-semibold hover:border-lime"
          >
            <Video className="size-4 text-lime" /> Ao vivo (IA)
          </Link>
          <Link
            href="/evolucao/fotos"
            className="inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-control)] border border-line bg-raised px-4 text-sm font-semibold hover:border-line-strong"
          >
            <Camera className="size-4" /> Avaliação por foto (IA)
          </Link>
          <Link
            href="/evolucao/nova"
            className="inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-control)] bg-lime px-4 text-sm font-semibold text-ink transition-colors hover:bg-[#ddff4d]"
          >
            <Plus className="size-4" strokeWidth={2.5} /> Nova avaliação
          </Link>
        </div>
      </div>

      <section className="panel mt-6 p-5">
        <h2 className="text-[15px] font-semibold">Relatório de evolução — AI Body Analysis</h2>
        <p className="mt-1 text-[13px] text-mist">A IA lê só os dados que você registrou e explica sua evolução.</p>
        <div className="mt-4">
          <ReportButton enabled={!reportReason} reason={reportReason} />
        </div>
        {reports.length > 0 && (
          <div className="mt-6 space-y-4">
            {reports.map((r, i) => (
              <ReportView key={r.id} content={r.content} createdAt={r.created_at} highlight={i === 0} kind="assessment" />
            ))}
          </div>
        )}
      </section>

      <div className="mt-6 space-y-3">
        {params.salva && <Notice tone="success">Avaliação salva.</Notice>}
        {stagnant && (
          <Notice tone="info" title="Peso estável nas últimas 3 avaliações">
            A variação ficou abaixo de 0,4 kg. Se o seu objetivo envolve mudar o peso, vale revisar treino e alimentação
            com seu personal.
          </Notice>
        )}
      </div>

      {weights.length > 1 && (
        <section className="panel mt-6 p-5">
          <h2 className="type-label">Peso ao longo do tempo</h2>
          <WeightChart data={weights} />
        </section>
      )}

      <section className="mt-8" aria-labelledby="timeline">
        <h2 id="timeline" className="text-[17px] font-semibold">
          Linha do tempo
        </h2>
        {desc.length === 0 ? (
          <p className="mt-4 text-fog">Nenhuma avaliação ainda. Registre a primeira para começar seu histórico.</p>
        ) : (
          <ol className="relative mt-6 space-y-4 border-l border-line pl-6">
            {desc.map((a, i) => {
              const prev = desc[i + 1];
              const diff = a.weight_kg !== null && prev?.weight_kg != null ? a.weight_kg - prev.weight_kg : null;
              return (
                <li key={a.id} className="relative">
                  <span className={`absolute -left-[29.5px] top-5 size-2.5 rounded-full border-2 border-ink ${i === 0 ? "bg-lime" : "bg-line-strong"}`} />
                  <article className="panel p-5">
                    <header className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-semibold">
                          {new Date(a.assessed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                        </p>
                        <p className="mt-0.5 text-[12.5px] text-fog">
                          {SOURCE_LABEL[a.source]}
                          {a.is_demo && <span className="ml-2 rounded bg-amber/15 px-1.5 py-0.5 text-amber">demonstração</span>}
                        </p>
                      </div>
                      <DeleteAssessmentButton id={a.id} />
                    </header>
                    <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-[13px]">
                      {a.weight_kg !== null && (
                        <div>
                          <dt className="text-fog">Peso</dt>
                          <dd className="mt-0.5 font-semibold tabular-nums">
                            {formatNumber(a.weight_kg, 1)} kg
                            {diff !== null && <span className="ml-1.5 font-normal text-mist">{formatSigned(diff, 1)}</span>}
                          </dd>
                        </div>
                      )}
                      {a.body_fat_pct !== null && (
                        <div>
                          <dt className="text-fog">Gordura ({a.body_fat_method})</dt>
                          <dd className="mt-0.5 font-semibold tabular-nums">{formatNumber(a.body_fat_pct, 1)}%</dd>
                        </div>
                      )}
                      {a.muscle_mass_kg !== null && (
                        <div>
                          <dt className="text-fog">Massa muscular ({a.muscle_mass_method})</dt>
                          <dd className="mt-0.5 font-semibold tabular-nums">{formatNumber(a.muscle_mass_kg, 1)} kg</dd>
                        </div>
                      )}
                      {(a.body_measurements ?? []).map((m) => (
                        <div key={m.id}>
                          <dt className="text-fog">{SITE_LABELS[m.site]}</dt>
                          <dd className="mt-0.5 font-semibold tabular-nums">{formatNumber(m.value_cm, 1)} cm</dd>
                        </div>
                      ))}
                    </dl>
                    {a.notes && <p className="mt-4 border-t border-line pt-3 text-[13px] leading-relaxed text-mist">{a.notes}</p>}
                  </article>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
