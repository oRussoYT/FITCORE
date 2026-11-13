import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { aiConfigured, consentMatches, providerInfo } from "@/lib/ai/provider";
import { ensureStudent, getAuthContext } from "@/lib/db/context";
import { deletePhoto } from "./actions";
import { AnalyzeButton, BeforeAfter, ConsentPanel, Uploader } from "./PhotoClient";
import { ReportView } from "../ReportView";

export const metadata: Metadata = { title: "Fotos e análise por IA" };

const POSE_LABEL: Record<string, string> = { front: "Frente", back: "Costas", left: "Lateral esq.", right: "Lateral dir." };

export default async function PhotosPage() {
  const ctx = await getAuthContext();
  const student = await ensureStudent(ctx);
  const [photosRes, consentRes, reportsRes] = await Promise.all([
    ctx.supabase.from("body_photos").select("id, storage_path, pose, taken_at").eq("student_id", student.id).order("taken_at", { ascending: false }).limit(60),
    ctx.supabase.from("consent_records").select("granted, version").eq("user_id", ctx.userId).eq("consent_type", "ai_analysis").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ctx.supabase.from("body_analysis_reports").select("id, content, created_at").eq("student_id", student.id).eq("kind", "photo").order("created_at", { ascending: false }).limit(5),
  ]);
  const photos = (photosRes.data ?? []) as Array<{ id: string; storage_path: string; pose: string; taken_at: string }>;
  const consentPhotos = Boolean(ctx.profile.consent_photos_at);
  const consentAi = Boolean(consentRes.data?.granted) && consentMatches(consentRes.data?.version);

  // Links temporários (10 minutos) — as fotos nunca ficam públicas.
  const signed = photos.length
    ? ((await ctx.supabase.storage.from("body-photos").createSignedUrls(photos.map((p) => p.storage_path), 600)).data ?? [])
    : [];
  const urlOf = new Map(signed.filter((s) => s.signedUrl && s.path).map((s) => [s.path as string, s.signedUrl as string]));

  const byDate = new Map<string, typeof photos>();
  for (const p of photos) {
    const d = p.taken_at.slice(0, 10);
    byDate.set(d, [...(byDate.get(d) ?? []), p]);
  }
  const dates = [...byDate.keys()];
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

  // Comparação: primeira e última data com foto de frente (ou da mesma pose disponível)
  const firstDate = dates.at(-1);
  const lastDate = dates[0];
  let compare: { before: string; after: string; b: string; a: string } | null = null;
  if (firstDate && lastDate && firstDate !== lastDate) {
    for (const pose of ["front", "back", "left", "right"]) {
      const b = byDate.get(firstDate)?.find((p) => p.pose === pose);
      const a = byDate.get(lastDate)?.find((p) => p.pose === pose);
      const bu = b && urlOf.get(b.storage_path);
      const au = a && urlOf.get(a.storage_path);
      if (bu && au) {
        compare = { before: bu, after: au, b: `${fmt(firstDate)} · ${POSE_LABEL[pose]}`, a: fmt(lastDate) };
        break;
      }
    }
  }

  const reports = (reportsRes.data ?? []) as Array<{ id: string; content: Record<string, unknown>; created_at: string }>;
  const ready = aiConfigured();
  const reason = !consentPhotos || !consentAi
    ? "Autorize o armazenamento e o envio para a IA acima."
    : photos.length === 0
      ? "Envie pelo menos uma foto."
      : !ready
        ? "A análise por IA será ativada em breve pelo administrador do sistema."
        : undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6 lg:py-10">
      <div>
        <Link href="/evolucao" className="inline-flex items-center gap-1.5 text-[13px] text-mist hover:text-bone">
          <ArrowLeft className="size-3.5" /> Minha evolução
        </Link>
        <h1 className="type-display mt-4 text-[32px] sm:text-[38px]">Fotos e análise por IA</h1>
        <p className="mt-2 max-w-2xl leading-relaxed text-mist">
          Envie fotos de frente, costas e laterais. A IA compara as datas e descreve postura e mudanças visíveis. Números do
          corpo (peso, medidas, gordura) vêm só das suas avaliações — nunca das fotos.
        </p>
      </div>

      <ConsentPanel photos={consentPhotos} ai={consentAi} provider={providerInfo().name} privacy={providerInfo().privacy} />
      {consentPhotos && (
        <Link
          href="/evolucao/ao-vivo"
          className="flex items-center justify-between gap-4 rounded-[28px] border border-lime/40 bg-[linear-gradient(135deg,rgba(204,255,0,0.12),rgba(204,255,0,0.02))] p-6 transition-colors hover:border-lime"
        >
          <span>
            <span className="block text-[18px] font-semibold">Fazer avaliação ao vivo</span>
            <span className="mt-1 block text-[14px] text-mist">O coach te guia por voz pela câmera e tira as fotos sozinho.</span>
          </span>
          <span className="rounded-full bg-lime px-5 py-2.5 font-bold text-ink">Iniciar</span>
        </Link>
      )}
      {consentPhotos && <Uploader studentId={student.id} />}

      {compare && (
        <section className="panel p-5">
          <h2 className="text-[15px] font-semibold">Antes e depois</h2>
          <p className="mt-1 text-[13px] text-fog">Arraste para comparar a primeira e a última data.</p>
          <div className="mt-4">
            <BeforeAfter before={compare.before} after={compare.after} beforeLabel={compare.b} afterLabel={compare.a} />
          </div>
        </section>
      )}

      <section className="panel p-5">
        <h2 className="text-[15px] font-semibold">Análise visual da IA</h2>
        <div className="mt-4">
          <AnalyzeButton enabled={!reason} reason={reason} />
        </div>
        {reports.length > 0 && (
          <div className="mt-6 space-y-6">
            {reports.map((r, i) => (
              <ReportView key={r.id} content={r.content} createdAt={r.created_at} highlight={i === 0} kind="photo" />
            ))}
          </div>
        )}
      </section>

      {dates.length > 0 && (
        <section>
          <h2 className="text-[17px] font-semibold">Suas fotos</h2>
          <div className="mt-4 space-y-6">
            {dates.map((d) => (
              <div key={d}>
                <p className="text-[13px] text-fog">{fmt(d)}</p>
                <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {byDate.get(d)!.map((p) => (
                    <li key={p.id} className="relative overflow-hidden rounded-xl border border-line">
                      {urlOf.get(p.storage_path) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={urlOf.get(p.storage_path) ?? undefined} alt={POSE_LABEL[p.pose]} className="aspect-[3/4] w-full object-cover" />
                      ) : (
                        <div className="aspect-[3/4] w-full bg-graphite" />
                      )}
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-ink/80 px-2 py-1.5 text-[12px]">
                        {POSE_LABEL[p.pose]}
                        <ActionButton size="sm" variant="ghost" aria-label="Excluir foto" confirm="Excluir?" action={deletePhoto.bind(null, p.id)}>
                          <Trash2 className="size-3.5" />
                        </ActionButton>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
