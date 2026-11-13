import type { Metadata } from "next";
import { BodyAnatomy } from "@/components/body/BodyAnatomy";
import { Notice } from "@/components/ui/Feedback";
import { ensureStudent, getAuthContext } from "@/lib/db/context";
import { formatNumber } from "@/lib/domain/metrics";
import { ExerciseForm, NewPlanForm } from "../personal/[id]/TrainerForms";
import { StartButton } from "./StartButton";
import { AiWorkoutButton } from "./AiWorkoutButton";
import { aiConfigured } from "@/lib/ai/provider";

export const metadata: Metadata = { title: "Treinos" };

type PlanRow = {
  id: string;
  label: string;
  name: string;
  created_by: string | null;
  workout_exercises: Array<{ id: string; position: number; sets: number; reps: string; exercises: { name: string; primary_muscle: string; secondary_muscles: string[] | null } | null }>;
};

export default async function WorkoutsPage({ searchParams }: { searchParams: Promise<{ concluido?: string; vazio?: string }> }) {
  const params = await searchParams;
  const ctx = await getAuthContext();
  const student = await ensureStudent(ctx);
  const since = new Date(Date.now() - 12 * 3600 * 1000).toISOString();

  const [plansRes, openRes, historyRes, exercisesRes, groupsRes, trainerRes] = await Promise.all([
    ctx.supabase
      .from("workout_plans")
      .select("id, label, name, created_by, workout_exercises(id, position, sets, reps, exercises(name, primary_muscle, secondary_muscles))")
      .eq("student_id", student.id)
      .eq("is_active", true)
      .order("label"),
    ctx.supabase.from("workout_sessions").select("plan_id").eq("student_id", student.id).in("status", ["in_progress", "paused"]).gte("started_at", since),
    ctx.supabase
      .from("workout_sessions")
      .select("id, started_at, finished_at, paused_seconds, workout_plans(label, name), workout_logs(reps, load_kg)")
      .eq("student_id", student.id)
      .eq("status", "completed")
      .order("started_at", { ascending: false })
      .limit(8),
    ctx.supabase.from("exercises").select("id, name, primary_muscle").order("name"),
    ctx.supabase.from("muscle_groups").select("slug, name"),
    ctx.supabase.from("trainer_students").select("trainer_id").eq("student_id", student.id).limit(1),
  ]);
  const plans = (plansRes.data ?? []) as unknown as PlanRow[];
  const open = new Set(((openRes.data ?? []) as Array<{ plan_id: string }>).map((o) => o.plan_id));
  const hasTrainer = (trainerRes.data ?? []).length > 0;
  const groupName = new Map(((groupsRes.data ?? []) as Array<{ slug: string; name: string }>).map((g) => [g.slug, g.name]));
  const exercises = ((exercisesRes.data ?? []) as Array<{ id: string; name: string; primary_muscle: string }>).map((e) => ({
    id: e.id,
    name: e.name,
    group: groupName.get(e.primary_muscle) ?? e.primary_muscle,
  }));
  type Hist = { id: string; started_at: string; finished_at: string | null; paused_seconds: number; workout_plans: { label: string; name: string } | null; workout_logs: Array<{ reps: number | null; load_kg: number | null }> };
  const history = (historyRes.data ?? []) as unknown as Hist[];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
      <h1 className="type-display text-[32px] sm:text-[38px]">Treinos</h1>
      <p className="mt-2 text-mist">{hasTrainer ? "Treinos montados pelo seu personal." : "Monte seus treinos ou peça para sua academia vincular um personal."}</p>

      {!hasTrainer && (
        <div className="mt-6">
          <AiWorkoutButton enabled={aiConfigured()} reason={aiConfigured() ? undefined : "A IA será ativada em breve pelo administrador do sistema."} hasPlans={plans.length > 0} />
        </div>
      )}

      <div className="mt-6 space-y-3">
        {params.concluido && <Notice tone="success" title="Treino salvo">Ele já aparece na sua frequência e no mapa muscular.</Notice>}
        {params.vazio && <Notice tone="error">Esse treino ainda não tem exercícios.</Notice>}
      </div>

      {plans.length === 0 ? (
        <section className="mt-8">
          <p className="text-fog">Nenhum treino ativo.{!hasTrainer && " Crie o primeiro abaixo."}</p>
        </section>
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {plans.map((p) => {
            const items = [...p.workout_exercises].sort((a, b) => a.position - b.position);
            const muscles: Record<string, number> = {};
            for (const it of items) {
              if (!it.exercises) continue;
              muscles[it.exercises.primary_muscle] = 1;
              for (const s of it.exercises.secondary_muscles ?? []) muscles[s] = Math.max(muscles[s] ?? 0, 0.45);
            }
            return (
              <li key={p.id} id={`treino-${p.label}`} className="panel flex scroll-mt-24 gap-4 p-5">
                <div className="hidden h-40 w-28 shrink-0 sm:block">
                  <BodyAnatomy intensityFor={(g) => muscles[g] ?? 0} selected={null} onSelect={() => {}} labelFor={(g) => g} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lime text-[18px] font-bold text-ink">{p.label}</span>
                    <div className="min-w-0">
                      <h2 className="truncate text-[18px] font-semibold">{p.name}</h2>
                      <p className="text-[13px] text-fog">{items.length} exercício(s)</p>
                    </div>
                  </div>
                  <ol className="mt-3 space-y-1 text-[13.5px] text-mist">
                    {items.slice(0, 5).map((it) => (
                      <li key={it.id} className="truncate">
                        {it.exercises?.name} <span className="text-fog">· {it.sets}×{it.reps}</span>
                      </li>
                    ))}
                    {items.length > 5 && <li className="text-fog">+{items.length - 5}</li>}
                  </ol>
                  {items.length === 0 && (
                    <p className="mt-3 rounded-xl bg-amber/10 px-3 py-2 text-[13px] text-amber">
                      Este treino está vazio. Adicione o primeiro exercício abaixo para poder começar.
                    </p>
                  )}
                  {!hasTrainer && (
                    <details className="group mt-3" open={items.length === 0}>
                      <summary className="cursor-pointer list-none text-[13.5px] font-semibold text-lime">
                        <span className="group-open:hidden">+ Adicionar exercício</span>
                        <span className="hidden group-open:inline">− Fechar</span>
                      </summary>
                      <ExerciseForm planId={p.id} studentId={student.id} exercises={exercises} compact />
                    </details>
                  )}
                  <div className="mt-auto flex justify-end pt-4">
                    <StartButton planId={p.id} resume={open.has(p.id)} disabled={items.length === 0} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!hasTrainer && (
        <section className="mt-12">
          <h2 className="text-[17px] font-semibold">Criar outro treino</h2>
          <p className="mt-1 text-[13px] text-mist">Dê uma letra e um nome. Depois adicione os exercícios no cartão do treino, aqui em cima.</p>
          <div className="mt-4">
            <NewPlanForm studentId={student.id} usedLabels={plans.map((p) => p.label)} />
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-[17px] font-semibold">Histórico</h2>
        {history.length === 0 ? (
          <p className="mt-3 text-fog">Os treinos concluídos aparecem aqui.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
            {history.map((h) => {
              const sets = h.workout_logs.length;
              const vol = h.workout_logs.reduce((s, l) => s + (l.reps ?? 0) * Number(l.load_kg ?? 0), 0);
              const min = h.finished_at ? Math.max(1, Math.round((new Date(h.finished_at).getTime() - new Date(h.started_at).getTime()) / 60000 - h.paused_seconds / 60)) : null;
              return (
                <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[14px]">
                  <span>
                    <span className="font-semibold">Treino {h.workout_plans?.label}</span> · {h.workout_plans?.name}
                  </span>
                  <span className="text-[13px] text-mist">
                    {new Date(h.started_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · {sets} séries
                    {min ? ` · ${min} min` : ""}
                    {vol > 0 ? ` · ${formatNumber(vol, 0)} kg de volume` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
