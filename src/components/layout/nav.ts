import { Activity, Building2, Dumbbell, LayoutDashboard, UserRound, Users, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Itens do menu. Cada módulo novo entra aqui quando estiver pronto — nada de link sem página. */
export const STUDENT_NAV: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/treinos", label: "Treinos", icon: Dumbbell },
  { href: "/evolucao", label: "Minha evolução", icon: Activity },
  { href: "/perfil", label: "Perfil", icon: UserRound },
];

export const TRAINER_NAV: NavItem = { href: "/personal", label: "Meus alunos", icon: Users };
export const GYM_NAV: NavItem = { href: "/academia", label: "Academia", icon: Building2 };

export function navFor(roles: { isTrainer: boolean; isAdmin: boolean }): NavItem[] {
  const [home, workouts, evo, profile] = STUDENT_NAV as [NavItem, NavItem, NavItem, NavItem];
  return [home, workouts, evo, ...(roles.isTrainer ? [TRAINER_NAV] : []), ...(roles.isAdmin ? [GYM_NAV] : []), profile];
}
