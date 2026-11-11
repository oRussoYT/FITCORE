import type { Metadata } from "next";
import { Star, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { cn } from "@/lib/cn";
import { getAuthContext } from "@/lib/db/context";
import { deleteReview } from "./actions";
import { ReviewComposer } from "./ReviewComposer";

export const metadata: Metadata = { title: "Avaliar o FITCORE" };

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Aguardando aprovação", cls: "bg-amber/15 text-amber" },
  approved: { label: "Publicada", cls: "bg-lime/15 text-lime" },
  rejected: { label: "Não publicada", cls: "bg-raised text-fog" },
};

export default async function ReviewPage() {
  const ctx = await getAuthContext();
  const { data } = await ctx.supabase
    .from("platform_reviews")
    .select("id, rating, body, display_name, status, created_at")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false });
  const mine = (data ?? []) as Array<{ id: string; rating: number; body: string; display_name: string; status: string; created_at: string }>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-12">
      <h1 className="type-metric text-[clamp(48px,8vw,84px)] leading-[0.9]">
        Avalie o <span className="text-lime">FITCORE</span>
      </h1>
      <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-mist">
        Sua opinião ajuda outras pessoas a decidir e ajuda a gente a melhorar. Avaliações aprovadas aparecem na página inicial.
      </p>

      <div className="mt-10">
        <ReviewComposer defaultName={(ctx.profile.full_name ?? "").split(" ")[0] ?? ""} />
      </div>

      {mine.length > 0 && (
        <section className="mt-12">
          <h2 className="text-[17px] font-semibold">Suas avaliações</h2>
          <ul className="mt-4 space-y-3">
            {mine.map((r) => {
              const st = STATUS[r.status] ?? STATUS.pending!;
              return (
                <li key={r.id} className="rounded-2xl border border-line p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-0.5" aria-label={`${r.rating} de 5 estrelas`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={cn("size-4", n <= r.rating ? "fill-lime text-lime" : "text-line-strong")} />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[12px] font-medium", st.cls)}>{st.label}</span>
                      <ActionButton size="sm" variant="ghost" aria-label="Excluir avaliação" confirm="Excluir?" action={deleteReview.bind(null, r.id)}>
                        <Trash2 className="size-4" />
                      </ActionButton>
                    </div>
                  </div>
                  <p className="mt-3 leading-relaxed">{r.body}</p>
                  <p className="mt-2 text-[12.5px] text-fog">
                    {r.display_name} · {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
