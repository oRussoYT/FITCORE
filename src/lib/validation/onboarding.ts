import { z } from "zod";
import { ageFromBirthDate } from "@/lib/domain/metrics";
import { optionalNumber, requiredNumber } from "./common";
import { compositionSchema, measurementsSchema } from "./assessment";

export const personalSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome.").max(120),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe sua data de nascimento.")
    .refine((d) => {
      const age = ageFromBirthDate(d);
      return age !== null && age >= 13 && age <= 100;
    }, "A plataforma é para pessoas a partir de 13 anos."),
  sex: z.enum(["male", "female", ""]).transform((v) => (v === "" ? null : v)),
});

export const goalSchema = z.object({
  primaryGoal: z.enum(["lose_fat", "gain_muscle", "recomposition", "performance", "health", "maintain"], {
    errorMap: () => ({ message: "Escolha um objetivo." }),
  }),
});

export const experienceSchema = z.object({
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"], {
    errorMap: () => ({ message: "Escolha seu nível." }),
  }),
});

export const availabilitySchema = z.object({
  weeklyAvailability: requiredNumber(1, 7, "Dias por semana"),
  sessionMinutes: requiredNumber(15, 240, "Tempo por treino"),
});

export const physicalSchema = z.object({
  heightCm: requiredNumber(80, 260, "Altura"),
  weightKg: requiredNumber(20, 400, "Peso"),
  consentHealth: z.literal(true, {
    errorMap: () => ({ message: "Precisamos do seu consentimento para guardar dados corporais." }),
  }),
});

export const foodSchema = z.object({
  restrictions: z.array(z.string().max(40)).max(12),
  dislikes: z.string().trim().max(500).optional(),
  mealsPerDay: optionalNumber(1, 8, "Refeições por dia"),
});

export const firstAssessmentSchema = z
  .object({
    skip: z.boolean(),
    measurements: measurementsSchema,
  })
  .and(compositionSchema);

export const ONBOARDING_STEPS = [
  { key: "personal", title: "Sobre você" },
  { key: "goal", title: "Objetivo" },
  { key: "experience", title: "Experiência" },
  { key: "availability", title: "Disponibilidade" },
  { key: "physical", title: "Dados físicos" },
  { key: "food", title: "Alimentação" },
  { key: "assessment", title: "Primeira avaliação" },
] as const;
