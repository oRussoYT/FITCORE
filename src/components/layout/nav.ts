import { Activity, LayoutDashboard, UserRound, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Itens do menu. Cada módulo novo entra aqui quando estiver pronto — nada de link sem página. */
export const STUDENT_NAV: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/evolucao", label: "Minha evolução", icon: Activity },
  { href: "/perfil", label: "Perfil", icon: UserRound },
];
