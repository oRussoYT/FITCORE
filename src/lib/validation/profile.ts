import { z } from "zod";
import { optionalNumber } from "./common";

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome.").max(120),
  heightCm: optionalNumber(80, 260, "Altura"),
  primaryGoal: z.enum(["lose_fat", "gain_muscle", "recomposition", "performance", "health", "maintain"]),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
  weeklyAvailability: optionalNumber(1, 7, "Dias por semana"),
  sessionMinutes: optionalNumber(15, 240, "Tempo por treino"),
});
