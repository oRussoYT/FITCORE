import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ActionButton } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/Feedback";
import { getAuthContext } from "@/lib/db/context";
import { listAssessments } from "@/lib/db/assessments";
import { buildBodyIndicators, buildEvolution, buildFrequency } from "@/lib/domain/dashboard";
import { GOAL_LABELS, LEVEL_LABELS } from "@/lib/domain/labels";
import { formatSigned } from "@/lib/domain/metrics";
import type { Profile } from "@/types/db";
import { archivePlan, removeExercise } from "../actions";
import { ExerciseForm, NewPlanForm, NoteForm } from "./TrainerForms";

export const metadata: Metadata = { title: "Aluno" };

export default async function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ctx = await getAuthContext();

  // Só abre se o banco permitir (personal vinculado ou admin da academia).
  const { data: student } = await ctx.supabase.from("students").select("id, user_id, status").eq("id", id).maybeSingle();
  if (!student || student.user_id === ctx.userId) notFound();
  const { data: canManage } = await ctx.supabase.rpc("can_manage_student", { p_student: id });
  if (!canManage) notFound();

  const since = new Date(Date.now() - 8 * 7 * 86400000).toISOString();
  const [profileRes, assessments, sessionsRes, notesRes, plansRes, exercisesRes, groupsRes] = await Promise.all([
    ctx.supabase.from("profiles").select("*").eq("id", student.user_id).maybeSingle(),
    listAssessments(ctx, id),
    ctx.supabase.from("workout_sessions").select("started_at").eq("student_id", id).eq("status", "completed").gte("started_at", since),
    ctx.supabase.from("student_notes").select("id, body, visible_to_student, created_at").eq("student_id", id).order("created_at", { ascending: false }).limit(20),
    ctx.supabase
      .from("workout_plans")
      .select("id, label, name, notes, workout_exercises(id, position, sets, reps, rest_seconds, target_load_kg, exercises(name))")
      .eq("student_id", id)
      .eq("is_active", true)
      .order("label"),
    ctx.supabase.from("exercises").select("id, name, primary_muscle").order("name"),
    ctx.supabase.from("muscle_groups").select("slug, name"),
  ]);

  const profile = profileRes.data as Profile | null;
  const groupName = new Map(((groupsRes.data ?? []) as Array<{ slug: string; name: string }>).map((g) => [g.slug, g.name]));
  const exercises = ((exercisesRes.data ?? []) as Array<{ id: string; name: string; primary_muscle: string }>).map((e) => ({
    id: e.id,
    name: e.name,
    group: groupName.get(e.primary_muscle) ?? e.primary_muscle,
  }));
  const indicators = buildBodyIndicators(assessments, { goal: profile?.primary_goal ?? null, profileHeightCm: profile?.height_cm ?? null });
  const frequency = buildFrequency(((sessionsRes.data ?? []) as Array<{ started_at: string }>).map((s) => s.started_at), profile?.weekly_availability ?? null);
  const evolution = buildEvolution(assessments, profile?.primary_goal ?? null);
  type PlanRow = {
    id: string;
    label: string;
    name: string;
    notes: string | null;
    workout_exercises: Array<{ id: string; position: number; sets: number; reps: string; rest_seconds: number; target_load_kg: number | null; exercises: { name: string } | null }>;
  };
  const plans = (plansRes.data ?? []) as unknown as PlanRow[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <Link href="/personal" className="inline-flex items-center gap-1.5 text-[13px] text-mist hover:text-bone">
        <ArrowLeft className="size-3.5" /> Meus alunos
      </Link>
      <h1 className="type-display mt-4 text-[32px] sm:text-[38px]">{profile?.full_name ?? "Aluno"}</h1>
      <p className="mt-2 text-[14px] text-mist">
        {[profile?.primary_goal && GOAL_LABELS[profile.primary_goal], profile?.experience_level && LEVEL_LABELS[profile.experience_level], profile?.weekly_availability && `${profile.weekly_availability}× por semana`]
          .filter(Boolean)
          .join(" · ") || "Cadastro incompleto"}
        {student.status !== "active" && " · inativo"}
      </p>

      <section className="mt-8">
        <h2 className="text-[17px] font-semibold">Indicadores</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {indicators.map((i) => (
            <MetricCard key={i.key} indicator={i} />
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="panel p-5">
            <p className="type-label">Frequência</p>
            <p className="type-metric mt-2 text-[40px]">{frequency.thisWeek}</p>
            <p className="text-[13px] text-fog">
              treino(s) nesta semana{frequency.target ? ` · meta ${frequency.target}` : ""} · {frequency.totalSessions} nas últimas 8 semanas
            </p>
          </div>
          <div className="panel p-5">
            <p className="type-label">Medidas desde a primeira avaliação</p>
            {evolution.changes.length === 0 ? (
              <p className="mt-3 text-[13px] text-fog">Precisa de pelo menos 2 avaliações com as mesmas medidas.</p>
            ) : (
              <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[13px]">
                {evolution.changes.map((c) => (
                  <li key={c.site} className="flex justify-between">
                    <span className="text-mist">{c.label}</span>
                    <span className={c.verdict === "better" ? "text-lime" : c.verdict === "worse" ? "text-amber" : ""}>{formatSigned(c.diff, 1, " cm")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-[17px] font-semibold">Treinos</h2>
        <div className="mt-4">
          <NewPlanForm studentId={id} usedLabels={plans.map((p) => p.label)} />
        </div>
        {plans.length === 0 ? (
          <EmptyState className="mt-4" title="Nenhum treino ativo">Crie o Treino A acima e adicione os exercícios.</EmptyState>
        ) : (
          <div className="mt-6 space-y-6">
            {plans.map((p) => (
              <article key={p.id} className="panel p-5">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="text-[18px] font-semibold">
                    <span className="mr-2 inline-flex size-8 items-center justify-center rounded-lg bg-lime text-ink">{p.label}</span>
                    {p.name}
                  </h3>
                  <ActionButton size="sm" variant="ghost" confirm="Arquivar este treino?" action={archivePlan.bind(null, p.id, id)}>
                    Arquivar
                  </ActionButton>
                </header>
                {p.workout_exercises.length > 0 && (
                  <ol className="mt-4 divide-y divide-line">
                    {[...p.workout_exercises]
                      .sort((a, b) => a.position - b.position)
                      .map((we, idx) => (
                        <li key={we.id} className="flex items-center justify-between gap-3 py-2.5 text-[14px]">
                          <span>
                            <span className="mr-2 text-fog">{idx + 1}.</span>
                            {we.exercises?.name}
                            <span className="ml-2 text-[13px] text-mist">
                              {we.sets} × {we.reps} · descanso {we.rest_seconds}s{we.target_load_kg != null ? ` · ${we.target_load_kg} kg` : ""}
                            </span>
                          </span>
                          <ActionButton size="sm" variant="ghost" aria-label="Remover exercício" action={removeExercise.bind(null, we.id, id)}>
                            <Trash2 className="size-4" />
                          </ActionButton>
                        </li>
                      ))}
                  </ol>
                )}
                <ExerciseForm planId={p.id} studentId={id} exercises={exercises} />
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-[17px] font-semibold">Observações</h2>
          <div className="panel mt-4 p-5">
            <NoteForm studentId={id} />
          </div>
        </div>
        <div>
          <h2 className="text-[17px] font-semibold">Histórico de observações</h2>
          {(notesRes.data ?? []).length === 0 ? (
            <p className="mt-4 text-fog">Nenhuma observação ainda.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {((notesRes.data ?? []) as Array<{ id: string; body: string; visible_to_student: boolean; created_at: string }>).map((n) => (
                <li key={n.id} className="rounded-xl border border-line p-4 text-[14px]">
                  <p className="whitespace-pre-line leading-relaxed">{n.body}</p>
                  <p className="mt-2 text-[12px] text-fog">
                    {new Date(n.created_at).toLocaleString("pt-BR")} · {n.visible_to_student ? "visível ao aluno" : "só para a equipe"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
