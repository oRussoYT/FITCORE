import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Exporta em JSON todos os dados do usuário logado (portabilidade — LGPD art. 18). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });

  const student = await supabase.from("students").select("id").eq("user_id", user.id).maybeSingle();
  const sid = student.data?.id ?? "00000000-0000-0000-0000-000000000000";

  const [profile, consents, assessments, measurements, reports, sessions, logs, goals, nutrition, notifications] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("consent_records").select("*").eq("user_id", user.id),
    supabase.from("physical_assessments").select("*").eq("student_id", sid),
    supabase.from("body_measurements").select("*").eq("student_id", sid),
    supabase.from("body_analysis_reports").select("*").eq("student_id", sid),
    supabase.from("workout_sessions").select("*").eq("student_id", sid),
    supabase.from("workout_logs").select("*").eq("student_id", sid),
    supabase.from("goals").select("*").eq("student_id", sid),
    supabase.from("nutrition_logs").select("*").eq("student_id", sid),
    supabase.from("notifications").select("*").eq("user_id", user.id),
  ]);

  const body = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at },
    profile: profile.data,
    consents: consents.data,
    physical_assessments: assessments.data,
    body_measurements: measurements.data,
    body_analysis_reports: reports.data,
    workout_sessions: sessions.data,
    workout_logs: logs.data,
    goals: goals.data,
    nutrition_logs: nutrition.data,
    notifications: notifications.data,
    note: "Fotografias não são incluídas neste arquivo; ficam disponíveis na área de evolução.",
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="meus-dados-fitcore.json"`,
      "Cache-Control": "no-store",
    },
  });
}
