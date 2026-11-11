/** Conquistas calculadas a partir do que foi realmente registrado. Nada é concedido sem dado. */

export type AchievementInput = {
  sessionDates: string[]; // treinos concluídos (ISO)
  assessmentDates: string[];
  hasPhoto: boolean;
  totalSets: number;
};

export type Achievement = { code: string; title: string; description: string; earned: boolean; progress: number };

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Dias seguidos com treino terminando hoje ou ontem. */
export function dayStreak(sessionDates: string[], now: Date = new Date()): number {
  const days = new Set(sessionDates.map((s) => dayKey(new Date(s))));
  const cur = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(dayKey(cur))) cur.setDate(cur.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(cur))) {
    n++;
    cur.setDate(cur.getDate() - 1);
  }
  return n;
}

/** Semanas seguidas (segunda a domingo) com pelo menos um treino, contando a atual se já houver. */
export function weekStreak(sessionDates: string[], now: Date = new Date()): number {
  const weekOf = (d: Date) => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x.getTime();
  };
  const weeks = new Set(sessionDates.map((s) => weekOf(new Date(s))));
  let cur = weekOf(now);
  if (!weeks.has(cur)) cur -= 7 * 86400000;
  let n = 0;
  while (weeks.has(cur)) {
    n++;
    cur = weekOf(new Date(cur - 3 * 86400000)); // volta uma semana com folga de horário de verão
  }
  return n;
}

export function achievements(input: AchievementInput, now: Date = new Date()): Achievement[] {
  const sessions = input.sessionDates.length;
  const weeks = weekStreak(input.sessionDates, now);
  const list: Array<[string, string, string, number, number]> = [
    ["first_workout", "Primeiro treino", "Concluiu o primeiro treino no modo guiado.", sessions, 1],
    ["ten_workouts", "10 treinos", "Concluiu 10 treinos.", sessions, 10],
    ["fifty_workouts", "50 treinos", "Concluiu 50 treinos.", sessions, 50],
    ["four_weeks", "4 semanas seguidas", "Treinou em 4 semanas consecutivas.", weeks, 4],
    ["twelve_weeks", "12 semanas seguidas", "Treinou em 12 semanas consecutivas.", weeks, 12],
    ["second_assessment", "Primeira comparação", "Registrou a segunda avaliação física.", input.assessmentDates.length, 2],
    ["five_assessments", "Acompanhamento sério", "Registrou 5 avaliações físicas.", input.assessmentDates.length, 5],
    ["hundred_sets", "100 séries", "Completou 100 séries registradas.", input.totalSets, 100],
    ["first_photo", "Registro visual", "Enviou as primeiras fotos de evolução.", input.hasPhoto ? 1 : 0, 1],
  ];
  return list.map(([code, title, description, value, goal]) => ({
    code,
    title,
    description,
    earned: value >= goal,
    progress: Math.min(1, value / goal),
  }));
}
