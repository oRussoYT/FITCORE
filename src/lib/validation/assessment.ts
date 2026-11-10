import { z } from "zod";
import type { MeasurementSite } from "@/types/db";
import { optionalNumber } from "./common";

export const MEASUREMENT_FIELDS: Array<{ site: MeasurementSite; label: string; min: number; max: number }> = [
  { site: "chest", label: "Peito", min: 40, max: 200 },
  { site: "arm", label: "Braço", min: 10, max: 80 },
  { site: "forearm", label: "Antebraço", min: 10, max: 60 },
  { site: "waist", label: "Cintura", min: 30, max: 250 },
  { site: "abdomen", label: "Abdômen", min: 30, max: 250 },
  { site: "hip", label: "Quadril", min: 40, max: 250 },
  { site: "thigh", label: "Coxa", min: 20, max: 120 },
  { site: "calf", label: "Panturrilha", min: 15, max: 80 },
];

const measurementShape = Object.fromEntries(
  MEASUREMENT_FIELDS.map((f) => [f.site, optionalNumber(f.min, f.max, f.label)]),
) as Record<MeasurementSite, ReturnType<typeof optionalNumber>>;

export const measurementsSchema = z.object(measurementShape);

/** Composição corporal só entra com o método de medição informado. */
export const compositionSchema = z
  .object({
    bodyFatPct: optionalNumber(2, 70, "Gordura corporal"),
    bodyFatMethod: z.string().trim().max(80).optional().or(z.literal("")),
    muscleMassKg: optionalNumber(5, 150, "Massa muscular"),
    muscleMassMethod: z.string().trim().max(80).optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (v.bodyFatPct !== undefined && !v.bodyFatMethod) {
      ctx.addIssue({ code: "custom", path: ["bodyFatMethod"], message: "Informe como o percentual foi medido." });
    }
    if (v.muscleMassKg !== undefined && !v.muscleMassMethod) {
      ctx.addIssue({ code: "custom", path: ["muscleMassMethod"], message: "Informe como a massa muscular foi medida." });
    }
  });

export const assessmentSchema = z
  .object({
    assessedOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
      .refine((d) => new Date(`${d}T12:00:00`) <= new Date(Date.now() + 24 * 3600 * 1000), "A data não pode estar no futuro."),
    source: z.enum(["self", "professional", "import"]),
    weightKg: optionalNumber(20, 400, "Peso"),
    heightCm: optionalNumber(80, 260, "Altura"),
    notes: z.string().trim().max(4000).optional(),
    measurements: measurementsSchema,
  })
  .and(compositionSchema);

export type AssessmentInput = z.input<typeof assessmentSchema>;
export type AssessmentData = z.output<typeof assessmentSchema>;
