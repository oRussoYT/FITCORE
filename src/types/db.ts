/** Tipos das linhas do banco usadas pela aplicação. */

export type Sex = "male" | "female";
export type PrimaryGoal = "lose_fat" | "gain_muscle" | "recomposition" | "performance" | "health" | "maintain";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type MeasurementSite = "arm" | "forearm" | "chest" | "waist" | "abdomen" | "hip" | "thigh" | "calf";
export type BodySide = "left" | "right" | "center";
export type MemberRole = "admin" | "trainer" | "student";

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_path: string | null;
  birth_date: string | null;
  sex: Sex | null;
  height_cm: number | null;
  primary_goal: PrimaryGoal | null;
  experience_level: ExperienceLevel | null;
  weekly_availability: number | null;
  session_minutes: number | null;
  food_preferences: FoodPreferences;
  onboarding_step: number;
  onboarding_completed_at: string | null;
  consent_health_data_at: string | null;
  consent_photos_at: string | null;
};

export type FoodPreferences = {
  restrictions?: string[];
  dislikes?: string;
  meals_per_day?: number;
};

export type Student = {
  id: string;
  user_id: string;
  gym_id: string | null;
  status: "active" | "inactive";
};

export type BodyMeasurement = {
  id: string;
  assessment_id: string;
  site: MeasurementSite;
  side: BodySide;
  value_cm: number;
};

export type PhysicalAssessment = {
  id: string;
  student_id: string;
  assessed_at: string;
  source: "self" | "professional" | "import";
  weight_kg: number | null;
  height_cm: number | null;
  age_years: number | null;
  sex: Sex | null;
  body_fat_pct: number | null;
  body_fat_method: string | null;
  muscle_mass_kg: number | null;
  muscle_mass_method: string | null;
  notes: string | null;
  is_demo: boolean;
  body_measurements?: BodyMeasurement[];
};

export type Goal = {
  id: string;
  kind: string;
  title: string;
  unit: string | null;
  start_value: number | null;
  target_value: number | null;
  current_value: number | null;
  due_on: string | null;
  status: "active" | "completed" | "abandoned";
};

export type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export type MuscleGroup = {
  slug: string;
  name: string;
  region: "upper" | "core" | "lower";
  sort_order: number;
};
