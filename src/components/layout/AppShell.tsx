"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";
import { navFor } from "./nav";

const STORAGE_KEY = "fitcore.sidebar.collapsed";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  userName,
  isTrainer = false,
  isAdmin = false,
}: {
  children: React.ReactNode;
  userName: string;
  isTrainer?: boolean;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const nav = navFor({ isTrainer, isAdmin });
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* armazenamento indisponível */
    }
  }, []);

  function toggle() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(STORAGE_KEY, c ? "0" : "1");
      } catch {
        /* ignora */
      }
      return !c;
    });
  }

  return (
    <div className="min-h-dvh lg:flex">
      {/* Menu lateral (desktop) */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 240 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-graphite lg:flex"
      >
        <div className="flex h-16 items-center px-5">
          <Link href="/" aria-label="FITCORE AI — página inicial">
            <Logo compact={collapsed} />
          </Link>
        </div>
        <nav aria-label="Principal" className="mt-4 flex flex-1 flex-col gap-1 px-3">
          {nav.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium transition-colors",
                  active ? "text-bone" : "text-mist hover:bg-raised/60 hover:text-bone",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg border border-line bg-raised"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                {active && <span className="absolute left-0 top-2.5 h-5 w-[3px] rounded-r bg-lime" />}
                <Icon className="relative size-[18px] shrink-0" strokeWidth={1.8} />
                {!collapsed && <span className="relative truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-3">
          <button
            type="button"
            onClick={toggle}
            className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-[13px] text-fog hover:bg-raised/60 hover:text-bone"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed && <span className="truncate">{userName}</span>}
          </button>
        </div>
      </motion.aside>

      {/* Topo (celular/tablet) — no Início o próprio cartão do dia faz esse papel */}
      {pathname !== "/dashboard" && (
        <header className="sticky top-0 z-30 border-b border-line bg-ink/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/" aria-label="FITCORE AI — página inicial">
              <Logo />
            </Link>
          </div>
        </header>
      )}

      <div className={cn("min-w-0 flex-1 pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-0", pathname === "/dashboard" && "pt-[env(safe-area-inset-top)] lg:pt-0")}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.div>
      </div>

      {/* Barra inferior (celular/tablet), no estilo de aplicativo */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(0.6rem+env(safe-area-inset-bottom))] pt-2 lg:hidden"
      >
        <ul className="mx-auto flex max-w-md items-center justify-around rounded-[26px] border border-white/10 bg-graphite/90 p-1.5 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl">
          {nav.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-14 flex-col items-center justify-center gap-1 rounded-[20px] text-[10.5px] font-semibold transition-colors",
                    active ? "text-ink" : "text-fog active:text-bone",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="tab-active"
                      className="absolute inset-0 rounded-[20px] bg-lime"
                      transition={{ type: "spring", stiffness: 520, damping: 38 }}
                    />
                  )}
                  <Icon className="relative size-[21px]" strokeWidth={active ? 2.3 : 1.8} />
                  <span className="relative">{item.short ?? item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
