import { NextResponse } from "next/server";
import { z } from "zod";
import { aiConfigured, callAI, parseJsonBlock } from "@/lib/ai/provider";
import { WORKOUT_SYSTEM } from "@/lib/ai/prompts";
import { ensureStudent, getAuthContext } from "@/lib/db/context";
import { GOAL_LABELS, LEVEL_LABELS } from "@/lib/domain/labels";

export const runtime = "nodejs";
export const maxDuration = 60;

const planSchema = z.object({
  plans: z
    .array(
      z.object({
        label: z.enum(["A", "B", "C", "D", "E"]),
        name: z.string().min(1).max(80),
        notes: z.string().max(600).optional(),
        exercises: z
          .array(
            z.object({
              id: z.string().uuid(),
              sets: z.number().int().min(1).max(8),
              reps: z.string().min(1).max(20),
              rest_seconds: z.number().int().min(15).max(300),
              notes: z.string().max(300).optional(),
            }),
          )
          .min(1)
          .max(10),
      }),
    )
    .min(1)
    .max(5),
  summary: z.string().max(1200).optional(),
});

/** A IA monta os treinos A–E do aluno usando apenas exercícios do catálogo. */
export async function POST(request: Request) {
  const ctx = await getAuthContext();
  const student = await ensureStudent(ctx);
  if (!aiConfigured()) return NextResponse.json({ error: "A IA ainda não foi ativada pelo administrador do sistema." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { focus?: string };
  const focus = typeof body.focus === "string" ? body.focus.slice(0, 300) : "";

  // Treinos montados pelo personal têm prioridade: a IA não substitui.
  const { data: active } = await ctx.supabase.from("workout_plans").select("id, label, created_by").eq("student_id", student.id).eq("is_active", true);
  const trainerPlans = ((active ?? []) as Array<{ id: string; label: string; created_by: string | null }>).filter((p) => p.created_by && p.created_by !== ctx.userId);
  if (trainerPlans.length > 0) return NextResponse.json({ error: "Seus treinos são montados pelo seu personal. Converse com ele para ajustar." }, { status: 409 });

  const since = new Date(Date.now() - 86400000).toISOString();
  const { count } = await ctx.supabase.from("workout_plans").select("id", { count: "exact", head: true }).eq("student_id", student.id).gte("created_at", since);
  if ((count ?? 0) >= 15) return NextResponse.json({ error: "Muitos treinos criados nas últimas 24 horas. Tente amanhã." }, { status: 429 });

  const [{ data: catalog }, { data: last }] = await Promise.all([
    ctx.supabase.from("exercises").select("id, name, primary_muscle, secondary_muscles, equipment").order("name"),
    ctx.supabase.from("physical_assessments").select("weight_kg, body_fat_pct, assessed_at").eq("student_id", student.id).order("assessed_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const ids = new Set(((catalog ?? []) as Array<{ id: string }>).map((c) => c.id));
  const days = Math.min(5, Math.max(1, ctx.profile.weekly_availability ?? 3));

  const input = {
    objetivo: ctx.profile.primary_goal ? GOAL_LABELS[ctx.profile.primary_goal] : "saúde",
    nivel: ctx.profile.experience_level ? LEVEL_LABELS[ctx.profile.experience_level] : "iniciante",
    dias_por_semana: days,
    minutos_por_treino: ctx.profile.session_minutes ?? 60,
    restricoes_ou_foco_do_aluno: focus || null,
    ultima_avaliacao: last ? { peso_kg: last.weight_kg, gordura_pct: last.body_fat_pct } : null,
    catalogo: catalog,
  };

  const ai = await callAI({ system: WORKOUT_SYSTEM, text: `Dados (JSON):\n${JSON.stringify(input)}`, maxTokens: 3500 });
  if (!ai.ok) return NextResponse.json({ error: ai.error }, { status: ai.status });

  const parsed = planSchema.safeParse(parseJsonBlock(ai.text));
  if (!parsed.success) return NextResponse.json({ error: "A IA respondeu em um formato inesperado. Tente de novo." }, { status: 502 });
  const plans = parsed.data.plans
    .slice(0, days)
    .map((p) => ({ ...p, exercises: p.exercises.filter((e) => ids.has(e.id)) }))
    .filter((p) => p.exercises.length > 0);
  if (plans.length === 0) return NextResponse.json({ error: "A IA não conseguiu montar um treino válido. Tente de novo." }, { status: 502 });

  // Arquiva os treinos anteriores do próprio aluno e grava os novos.
  await ctx.supabase.from("workout_plans").update({ is_active: false }).eq("student_id", student.id).eq("is_active", true);
  for (const p of plans) {
    const { data: plan, error } = await ctx.supabase
      .from("workout_plans")
      .insert({ student_id: student.id, label: p.label, name: p.name, notes: `Criado pela IA. ${p.notes ?? ""}`.trim() })
      .select("id")
      .single();
    if (error || !plan) return NextResponse.json({ error: "Não foi possível salvar o treino." }, { status: 500 });
    const rows = p.exercises.map((e, i) => ({ plan_id: plan.id, exercise_id: e.id, position: i, sets: e.sets, reps: e.reps, rest_seconds: e.rest_seconds, notes: e.notes ?? null }));
    const ins = await ctx.supabase.from("workout_exercises").insert(rows);
    if (ins.error) {
      console.error("[ai] treino exercícios", ins.error.message);
      await ctx.supabase.from("workout_plans").delete().eq("id", plan.id);
      return NextResponse.json({ error: "Não foi possível salvar os exercícios. Tente de novo." }, { status: 500 });
    }
  }

  await ctx.supabase.from("notifications").insert({ user_id: ctx.userId, kind: "workout_released", title: "A IA montou seus treinos", body: parsed.data.summary?.slice(0, 200) ?? null, link: "/treinos" });
  return NextResponse.json({ ok: true, plans: plans.length, summary: parsed.data.summary ?? null });
}
