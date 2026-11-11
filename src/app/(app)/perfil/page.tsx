import type { Metadata } from "next";
import { Download } from "lucide-react";
import { getAuthContext } from "@/lib/db/context";
import { GOAL_LABELS, LEVEL_LABELS } from "@/lib/domain/labels";
import { signOut } from "../actions";
import { PrivacyActions } from "./PrivacyActions";
import { ReviewForm } from "./ReviewForm";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const ctx = await getAuthContext();
  const p = ctx.profile;
  const review = await ctx.supabase.from("platform_reviews").select("rating, body, display_name, status").eq("user_id", ctx.userId).maybeSingle();
  const pending = await ctx.supabase.from("data_requests").select("id, created_at").eq("kind", "delete").eq("status", "pending").maybeSingle();

  const rows: Array<[string, string]> = [
    ["Nome", p.full_name ?? "—"],
    ["E-mail", ctx.email ?? "—"],
    ["Nascimento", p.birth_date ? new Date(`${p.birth_date}T12:00:00`).toLocaleDateString("pt-BR") : "—"],
    ["Altura", p.height_cm ? `${p.height_cm} cm` : "—"],
    ["Objetivo", p.primary_goal ? GOAL_LABELS[p.primary_goal] : "—"],
    ["Nível", p.experience_level ? LEVEL_LABELS[p.experience_level] : "—"],
    ["Disponibilidade", p.weekly_availability ? `${p.weekly_availability}× por semana, ${p.session_minutes ?? "?"} min` : "—"],
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-10">
      <h1 className="type-display text-[32px]">Perfil</h1>

      <section className="panel mt-8 p-5">
        <h2 className="text-[15px] font-semibold">Seus dados</h2>
        <dl className="mt-4 divide-y divide-line">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2.5 text-[14px]">
              <dt className="text-fog">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <ReviewForm existing={review.data ?? null} defaultName={(p.full_name ?? "").split(" ")[0] ?? ""} />

      <section className="panel mt-6 p-5">
        <h2 className="text-[15px] font-semibold">Privacidade e consentimentos</h2>
        <ul className="mt-4 space-y-2 text-[14px]">
          <li className="flex justify-between gap-4">
            <span className="text-mist">Guardar dados corporais</span>
            <span>{p.consent_health_data_at ? `Autorizado em ${new Date(p.consent_health_data_at).toLocaleDateString("pt-BR")}` : "Não autorizado"}</span>
          </li>
          <li className="flex justify-between gap-4">
            <span className="text-mist">Fotografias corporais</span>
            <span>{p.consent_photos_at ? `Autorizado em ${new Date(p.consent_photos_at).toLocaleDateString("pt-BR")}` : "Não autorizado"}</span>
          </li>
        </ul>
        <a
          href="/perfil/exportar"
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-line bg-raised px-4 text-sm font-semibold hover:border-line-strong"
        >
          <Download className="size-4" /> Baixar meus dados
        </a>
        <PrivacyActions deletionRequestedAt={pending.data?.created_at ?? null} />
      </section>

      <form action={signOut} className="mt-8">
        <button type="submit" className="text-sm text-mist underline-offset-4 hover:text-bone hover:underline">
          Sair da conta
        </button>
      </form>
    </div>
  );
}
