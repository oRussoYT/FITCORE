import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Video } from "lucide-react";
import { BodyMapPanel } from "@/components/dashboard/BodyMapPanel";
import { CoachCard } from "@/components/dashboard/CoachCard";
import { InvitesBanner } from "@/components/dashboard/InvitesBanner";
import { EvolutionCard } from "@/components/dashboard/EvolutionCard";
import { FrequencyCard } from "@/components/dashboard/FrequencyCard";
import { GoalCard } from "@/components/dashboard/GoalCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Notice } from "@/components/ui/Feedback";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { TodayHome } from "@/components/today/TodayHome";
import { weekStreak } from "@/lib/domain/achievements";
import { daysSince, nextPlan, pendingItems, waterGoal, weightTrend } from "@/lib/domain/today";
import { ensureStudent, getAuthContext } from "@/lib/db/context";
import { loadDashboard } from "@/lib/db/dashboard";
import { GOAL_LABELS } from "@/lib/domain/labels";

export const metadata: Metadata = { title: "Início" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const ctx = await getAuthContext();
  const student = await ensureStudent(ctx);
  const data = await loadDashboard(ctx, student.id);
  const objective = ctx.profile.primary_goal ? GOAL_LABELS[ctx.profile.primary_goal] : null;
  const weight = weightTrend(data.assessments.map((a) => ({ assessed_at: a.assessed_at, weight_kg: a.weight_kg })));
  const today = new Date();
  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7)).getTime();

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <TodayHome
          name={ctx.profile.full_name ?? "Aluno"}
          avatarUrl={data.avatarUrl}
          notifications={data.notifications}
          weekStreak={weekStreak(data.sessionDates)}
          daysWithoutTraining={daysSince(data.lastSessionAt)}
          pending={[
            ...data.coachPlans
              .filter((p) => p.exercises === 0)
              .map((p) => ({ key: `vazio-${p.id}`, title: `Treino ${p.label} está vazio`, detail: `${p.name} · adicione os exercícios`, href: `/treinos#treino-${p.label}` })),
            ...pendingItems({ lastAssessmentAt: data.assessments.at(-1)?.assessed_at ?? null, hasAvatar: Boolean(data.avatarUrl), hasPlans: data.coachPlans.length > 0 }),
          ]}
          plan={nextPlan(data.coachPlans.filter((p) => p.exercises > 0), data.lastPlanId)}
          openSessionId={data.openSession?.id ?? null}
          water={data.water}
          waterGoal={waterGoal(weight?.kg ?? null, ctx.profile.water_goal_ml)}
          weight={weight}
          weekSessions={data.sessionDates.filter((d) => new Date(d).getTime() >= weekStart).length}
          weekTarget={ctx.profile.weekly_availability ?? null}
        />
      <div className="mt-5">
        <InstallPrompt />
      </div>

      <div className="mt-6 space-y-3">
        <InvitesBanner invites={data.invites} />
        {params.bemvindo && (
          <Notice tone="success" title="Tudo pronto">
            Seus dados iniciais foram salvos. A partir da próxima avaliação você verá comparações aqui.
          </Notice>
        )}
        {params.senha && <Notice tone="success">Senha alterada.</Notice>}
        {data.hasDemo && (
          <Notice tone="demo" title="Dados de demonstração">
            Parte das informações exibidas é fictícia e foi criada apenas para demonstrar o sistema.
          </Notice>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-[17px] font-semibold">Seu corpo em números</h2>
            <div className="flex flex-wrap gap-2">
            <Link
              href="/evolucao/ao-vivo"
              className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-lime/40 bg-lime/10 px-3.5 text-[13px] font-semibold hover:border-lime"
            >
              <Video className="size-4 text-lime" /> Avaliação ao vivo (IA)
            </Link>
            <Link
              href="/evolucao/nova"
              className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] bg-lime px-3.5 text-[13px] font-semibold text-ink transition-colors hover:bg-[#ddff4d]"
            >
              <Plus className="size-4" strokeWidth={2.5} /> Nova avaliação
            </Link>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            {data.indicators.map((ind) => (
              <MetricCard key={ind.key} indicator={ind} />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FrequencyCard data={data.frequency} />
            <GoalCard goal={data.goal} objective={objective} />
          </div>
          <CoachCard plans={data.coachPlans} notes={data.coachNotes} />
          <EvolutionCard data={data.evolution} />
        </div>

        <BodyMapPanel groups={data.muscleGroups} stimulus={data.stimulus} changes={data.evolution.changes} setsLast30={data.setsLast30} />
      </div>
    </div>
  );
}
