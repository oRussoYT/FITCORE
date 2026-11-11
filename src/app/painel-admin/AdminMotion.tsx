"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { animate, motion, useInView } from "framer-motion";
import { Building2, FileLock2, Gauge, ScrollText, Star, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/** Número que sobe do zero até o valor quando aparece na tela. */
export function Counter({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    const controls = animate(0, value, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => (node.textContent = Math.round(v).toLocaleString("pt-BR")),
    });
    return () => controls.stop();
  }, [inView, value]);
  return (
    <span ref={ref} className={className}>
      0
    </span>
  );
}

/** Entrada em cascata para listas e grades. */
export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
      {children}
    </motion.div>
  );
}

export function Item({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } } }}
    >
      {children}
    </motion.div>
  );
}

export const ADMIN_TABS: Array<{ key: string; label: string; icon: LucideIcon }> = [
  { key: "visao", label: "Visão geral", icon: Gauge },
  { key: "academias", label: "Academias", icon: Building2 },
  { key: "usuarios", label: "Usuários", icon: Users },
  { key: "avaliacoes", label: "Avaliações", icon: Star },
  { key: "lgpd", label: "Pedidos LGPD", icon: FileLock2 },
  { key: "registro", label: "Registro", icon: ScrollText },
];

export function AdminNav({ base, active, badges }: { base: string; active: string; badges: Record<string, number> }) {
  return (
    <nav aria-label="Seções do painel" className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
      {ADMIN_TABS.map(({ key, label, icon: Icon }) => {
        const on = key === active;
        return (
          <Link
            key={key}
            href={`${base}?aba=${key}`}
            aria-current={on ? "page" : undefined}
            className={cn(
              "relative flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-[14px] font-medium transition-colors",
              on ? "text-ink" : "text-mist hover:bg-raised hover:text-bone",
            )}
          >
            {on && (
              <motion.span
                layoutId="admin-tab"
                className="absolute inset-0 rounded-2xl bg-lime shadow-[0_10px_30px_-12px_rgba(204,255,0,0.8)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <Icon className="relative size-[18px]" />
            <span className="relative">{label}</span>
            {badges[key] ? (
              <span className={cn("relative ml-auto rounded-full px-2 text-[11.5px] font-bold", on ? "bg-ink text-lime" : "bg-amber/20 text-amber")}>
                {badges[key]}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
