import type { Metadata } from "next";
import Link from "next/link";
import { Award, Download, Flame, Lock, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { ensureStudent, getAuthContext } from "@/lib/db/context";
import { signedAvatarUrl } from "@/lib/db/dashboard";
import { achievements, dayStreak, weekStreak } from "@/lib/domain/achievements";
import { GOAL_LABELS, LEVEL_LABELS } from "@/lib/domain/labels";
import { signOut } from "../actions";
import { PrivacyActions } from "./PrivacyActions";
import { AvatarPicker, ProfileForm } from "./ProfileClient";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const ctx = await getAuthContext();
  const p = ctx.profile;
  const student = await ensureStudent(ctx);

  const [avatarUrl, sessionsRes, assessRes, photoRes, setsRes, pending] = await Promise.all([
    signedAvatarUrl(ctx, p.avatar_path),
    ctx.supabase.from("workout_sessions").select("started_at").eq("student_id", student.id).eq("status", "completed").order("started_at", { ascending: false }).limit(1000),
    ctx.supabase.from("physical_assessments").select("assessed_at").eq("student_id", student.id),
    ctx.supabase.from("body_photos").select("id", { count: "exact", head: true }).eq("student_id", student.id),
    ctx.supabase.from("workout_logs").select("id", { count: "exact", head: true }).eq("student_id", student.id),
    ctx.supabase.from("data_requests").select("id, created_at").eq("kind", "delete").eq("status", "pending").maybeSingle(),
  ]);
  const sessionDates = ((sessionsRes.data ?? []) as Array<{ started_at: string }>).map((s) => s.started_at);
  const assessmentDates = ((assessRes.data ?? []) as Array<{ assessed_at: string }>).map((a) => a.assessed_at);
  const list = achievements({ sessionDates, assessmentDates, hasPhoto: (photoRes.count ?? 0) > 0, totalSets: setsRes.count ?? 0 });
  const earned = list.filter((a) => a.earned).length;
  const name = p.full_name ?? "Sem nome";
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("") || "?";
  const since = new Date(student.id ? (sessionDates.at(-1) ?? new Date().toISOString()) : new Date().toISOString());

  const stats: Array<[string, string | number]> = [
    ["Treinos concluídos", sessionDates.length],
    ["Dias seguidos", dayStreak(sessionDates)],
    ["Semanas seguidas", weekStreak(sessionDates)],
    ["Avaliações", assessmentDates.length],
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-10">
      {/* Cabeçalho */}
      <section className="relative overflow-hidden rounded-[32px] border border-line bg-surface p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-[radial-gradient(circle,rgba(204,255,0,0.12),transparent_65%)]" />
        <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <AvatarPicker userId={ctx.userId} url={avatarUrl} initials={initials} />
          <div className="text-center sm:text-left">
            <h1 className="type-display text-[30px] sm:text-[36px]">{name}</h1>
            <p className="mt-1 text-[14px] text-mist">{ctx.email}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {p.primary_goal && <span className="rounded-full bg-lime px-3 py-1 text-[12.5px] font-semibold text-ink">{GOAL_LABELS[p.primary_goal]}</span>}
              {p.experience_level && <span className="rounded-full border border-line px-3 py-1 text-[12.5px] text-mist">{LEVEL_LABELS[p.experience_level]}</span>}
              {ctx.isTrainer && <span className="rounded-full border border-line px-3 py-1 text-[12.5px] text-mist">Personal trainer</span>}
              {ctx.isAdmin && <span className="rounded-full border border-line px-3 py-1 text-[12.5px] text-mist">Administrador de academia</span>}
            </div>
          </div>
        </div>
        <dl className="relative mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-graphite/70 p-4">
              <dt className="flex items-center gap-1.5 text-[12px] text-fog">
                {k.includes("seguid") && <Flame className="size-3.5 text-lime" />}
                {k}
              </dt>
              <dd className="type-metric mt-1 text-[34px]">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Conquistas */}
      <section className="mt-8">
        <div className="flex items-end justify-between">
          <h2 className="text-[17px] font-semibold">Conquistas</h2>
          <span className="text-[13px] text-fog">
            {earned} de {list.length}
          </span>
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {list.map((a) => (
            <li key={a.code} className={cn("rounded-2xl border p-4", a.earned ? "border-lime/40 bg-lime/[0.06]" : "border-line")}>
              <div className="flex items-center gap-2">
                <span className={cn("flex size-9 items-center justify-center rounded-xl", a.earned ? "bg-lime text-ink" : "bg-raised text-fog")}>
                  {a.earned ? <Award className="size-5" /> : <Lock className="size-4" />}
                </span>
                <p className={cn("text-[14px] font-semibold", !a.earned && "text-mist")}>{a.title}</p>
              </div>
              <p className="mt-2 text-[12.5px] leading-snug text-fog">{a.description}</p>
              {!a.earned && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-raised">
                  <div className="h-full rounded-full bg-lime/70" style={{ width: `${Math.round(a.progress * 100)}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Dados */}
      <section className="panel mt-8 p-5 sm:p-6">
        <h2 className="text-[17px] font-semibold">Seus dados</h2>
        <p className="mt-1 text-[13px] text-mist">Usados para calcular indicadores e personalizar treinos e relatórios.</p>
        <div className="mt-5">
          <ProfileForm profile={p} />
        </div>
      </section>

      <Link
        href="/avaliar"
        className="mt-6 flex items-center justify-between gap-4 rounded-[28px] border border-line bg-surface p-5 transition-colors hover:border-lime/50"
      >
        <span className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-lime text-ink">
            <Star className="size-5 fill-ink" />
          </span>
          <span>
            <span className="block font-semibold">Avaliar o FITCORE</span>
            <span className="block text-[13px] text-mist">Conte como está sendo sua experiência</span>
          </span>
        </span>
        <span className="text-[13px] font-semibold text-lime">Avaliar</span>
      </Link>

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
        <a href="/perfil/exportar" className="mt-6 inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-line bg-raised px-4 text-sm font-semibold hover:border-line-strong">
          <Download className="size-4" /> Baixar meus dados
        </a>
        <PrivacyActions deletionRequestedAt={pending.data?.created_at ?? null} />
      </section>

      <form action={signOut} className="mt-8 flex items-center justify-between">
        <button type="submit" className="text-sm text-mist underline-offset-4 hover:text-bone hover:underline">
          Sair da conta
        </button>
        <span className="text-[12px] text-fog">Primeiro treino registrado: {sessionDates.length ? since.toLocaleDateString("pt-BR") : "—"}</span>
      </form>
    </div>
  );
}
