import "server-only";
import type { AuthContext } from "@/lib/db/context";
import type { MeasurementSite, PhysicalAssessment } from "@/types/db";

type MeasurementValues = Partial<Record<MeasurementSite, number | undefined>>;

/** Substitui as medidas de uma avaliação pelas informadas (campos vazios são removidos). */
export async function replaceMeasurements(ctx: AuthContext, assessmentId: string, studentId: string, values: MeasurementValues) {
  const rows = Object.entries(values)
    .filter(([, v]) => typeof v === "number")
    .map(([site, v]) => ({ assessment_id: assessmentId, student_id: studentId, site, side: "center", value_cm: v as number }));

  const del = await ctx.supabase.from("body_measurements").delete().eq("assessment_id", assessmentId);
  if (del.error) throw new Error(del.error.message);
  if (rows.length === 0) return;
  const ins = await ctx.supabase.from("body_measurements").insert(rows);
  if (ins.error) throw new Error(ins.error.message);
}

export async function listAssessments(ctx: AuthContext, studentId: string): Promise<PhysicalAssessment[]> {
  const { data, error } = await ctx.supabase
    .from("physical_assessments")
    .select(
      "id, student_id, assessed_at, source, weight_kg, height_cm, age_years, sex, body_fat_pct, body_fat_method, muscle_mass_kg, muscle_mass_method, notes, is_demo, body_measurements(id, assessment_id, site, side, value_cm)",
    )
    .eq("student_id", studentId)
    .order("assessed_at", { ascending: true });
  if (error) throw new Error(`Falha ao carregar avaliações: ${error.message}`);
  return (data ?? []).map((a) => ({
    ...a,
    weight_kg: a.weight_kg === null ? null : Number(a.weight_kg),
    height_cm: a.height_cm === null ? null : Number(a.height_cm),
    body_fat_pct: a.body_fat_pct === null ? null : Number(a.body_fat_pct),
    muscle_mass_kg: a.muscle_mass_kg === null ? null : Number(a.muscle_mass_kg),
    body_measurements: (a.body_measurements ?? []).map((m: { value_cm: number | string }) => ({ ...m, value_cm: Number(m.value_cm) })),
  })) as PhysicalAssessment[];
}
