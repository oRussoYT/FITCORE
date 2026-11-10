import type { ExperienceLevel, MeasurementSite, PrimaryGoal } from "@/types/db";

export const GOAL_LABELS: Record<PrimaryGoal, string> = {
  lose_fat: "Perder gordura",
  gain_muscle: "Ganhar massa muscular",
  recomposition: "Recomposição corporal",
  performance: "Melhorar desempenho",
  health: "Saúde e bem-estar",
  maintain: "Manter a forma",
};

export const GOAL_HINTS: Record<PrimaryGoal, string> = {
  lose_fat: "Reduzir medidas e percentual de gordura preservando força.",
  gain_muscle: "Aumentar medidas musculares e cargas ao longo do tempo.",
  recomposition: "Perder gordura e ganhar músculo ao mesmo tempo.",
  performance: "Ficar mais forte, rápido ou resistente.",
  health: "Criar constância e se sentir melhor no dia a dia.",
  maintain: "Preservar o que já conquistou.",
};

export const LEVEL_LABELS: Record<ExperienceLevel, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};

export const LEVEL_HINTS: Record<ExperienceLevel, string> = {
  beginner: "Treino há menos de 6 meses ou estou voltando agora.",
  intermediate: "Treino com regularidade há 6 meses a 2 anos.",
  advanced: "Treino com consistência há mais de 2 anos.",
};

export const SITE_LABELS: Record<MeasurementSite, string> = {
  arm: "Braço",
  forearm: "Antebraço",
  chest: "Peito",
  waist: "Cintura",
  abdomen: "Abdômen",
  hip: "Quadril",
  thigh: "Coxa",
  calf: "Panturrilha",
};

export const SITE_ORDER: MeasurementSite[] = ["chest", "arm", "forearm", "waist", "abdomen", "hip", "thigh", "calf"];

/**
 * Direção desejada de cada medida conforme o objetivo.
 * 1 = aumentar é positivo; -1 = diminuir é positivo; 0 = neutro.
 */
export function desiredDirection(goal: PrimaryGoal | null, site: MeasurementSite): -1 | 0 | 1 {
  const reduce: MeasurementSite[] = ["waist", "abdomen"];
  const grow: MeasurementSite[] = ["arm", "forearm", "chest", "thigh", "calf"];
  if (reduce.includes(site)) return goal === "gain_muscle" || goal === "performance" ? 0 : -1;
  if (grow.includes(site)) return goal === "lose_fat" ? 0 : 1;
  return 0;
}

export function weightDirection(goal: PrimaryGoal | null): -1 | 0 | 1 {
  if (goal === "lose_fat") return -1;
  if (goal === "gain_muscle") return 1;
  return 0;
}

export const FOOD_RESTRICTIONS = [
  { value: "vegetarian", label: "Vegetariano" },
  { value: "vegan", label: "Vegano" },
  { value: "lactose_free", label: "Sem lactose" },
  { value: "gluten_free", label: "Sem glúten" },
  { value: "no_pork", label: "Sem carne de porco" },
  { value: "no_seafood", label: "Sem frutos do mar" },
] as const;

export const BODY_FAT_METHODS = [
  "Bioimpedância",
  "Dobras cutâneas (adipômetro)",
  "DEXA (densitometria)",
  "Pesagem hidrostática",
  "Bod Pod (pletismografia)",
] as const;
