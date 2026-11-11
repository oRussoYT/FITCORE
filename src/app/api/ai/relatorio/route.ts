import { NextResponse } from "next/server";
import { aiConfigured, callAI, parseJsonBlock } from "@/lib/ai/provider";
import { REPORT_SYSTEM } from "@/lib/ai/prompts";
import { getAuthContext } from "@/lib/db/context";
import { listAssessments } from "@/lib/db/assessments";
import { buildEvolution, buildFrequency } from "@/lib/domain/dashboard";
import { GOAL_LABELS, SITE_LABELS } from "@/lib/domain/labels";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Relatório de evolução feito pela IA usando SOMENTE os dados registrados. */
export async function POST() {
  const ctx = await getAuthContext();
  if (!ctx.student) return NextResponse.json({ error: "Complete seu cadastro primeiro." }, { status: 400 });
  if (!aiConfigured()) return NextResponse.json({ error: "A análise por IA ainda não foi ativada pelo administrador do sistema." }, { status: 503 });

  const assessments = await listAssessments(ctx, ctx.student.id);
  if (assessments.length === 0) return NextResponse.json({ error: "Registre pelo menos uma avaliação." }, { status: 400 });

  const since = new Date(Date.now() - 8 * 7 * 86400000).toISOString();
  const { data: sessions } = await ctx.supabase.from("workout_sessions").select("started_at").eq("student_id", ctx.student.id).eq("status", "completed").gte("started_at", since);
  const frequency = buildFrequency(((sessions ?? []) as Array<{ started_at: string }>).map((s) => s.started_at), ctx.profile.weekly_availability);
  const evolution = buildEvolution(assessments, ctx.profile.primary_goal);

  const snapshot = {
    objetivo: ctx.profile.primary_goal ? GOAL_LABELS[ctx.profile.primary_goal] : "não informado",
    altura_cm: ctx.profile.height_cm,
    avaliacoes: assessments.map((a) => ({
      data: a.assessed_at.slice(0, 10),
      origem: a.source,
      peso_kg: a.weight_kg,
      gordura_pct: a.body_fat_pct,
      metodo_gordura: a.body_fat_method,
      massa_muscular_kg: a.muscle_mass_kg,
      metodo_massa: a.muscle_mass_method,
      medidas_cm: Object.fromEntries((a.body_measurements ?? []).map((m) => [SITE_LABELS[m.site], m.value_cm])),
      observacoes: a.notes,
    })),
    frequencia: {
      treinos_semana_atual: frequency.thisWeek,
      treinos_semana_passada: frequency.lastWeek,
      meta_semanal: frequency.target,
      total_8_semanas: frequency.totalSessions,
    },
    mudancas_desde_primeira_avaliacao: evolution.changes.map((c) => ({ medida: c.label, de: c.first, para: c.last, diferenca_cm: Number(c.diff.toFixed(1)) })),
    dias_acompanhados: evolution.days,
  };

  const ai = await callAI({ system: REPORT_SYSTEM, text: `Dados do aluno (JSON):\n${JSON.stringify(snapshot)}` });
  if (!ai.ok) return NextResponse.json({ error: ai.error }, { status: ai.status });

  const content = parseJsonBlock<Record<string, unknown>>(ai.text) ?? { resumo: ai.text };
  const latest = assessments.at(-1);
  const { data: report, error } = await ctx.supabase
    .from("body_analysis_reports")
    .insert({ student_id: ctx.student.id, assessment_id: latest?.id ?? null, kind: "assessment", provider: ai.provider, model: ai.model, content, input_snapshot: snapshot })
    .select("id, content, created_at")
    .single();
  if (error) return NextResponse.json({ error: "O relatório foi gerado, mas não pôde ser salvo." }, { status: 500 });

  await ctx.supabase.from("notifications").insert({ user_id: ctx.userId, kind: "report_ready", title: "Seu relatório de evolução está pronto", link: "/evolucao" });
  return NextResponse.json({ report });
}
