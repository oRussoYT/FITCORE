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

      {/* Topo (celular/tablet) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-ink/85 px-4 backdrop-blur lg:hidden">
        <Link href="/" aria-label="FITCORE AI — página inicial">
          <Logo />
        </Link>
      </header>

      <div className="min-w-0 flex-1 pb-24 lg:pb-0">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.div>
      </div>

      {/* Barra inferior (celular/tablet) */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-graphite/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto flex max-w-md justify-around">
          {nav.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium", active ? "text-bone" : "text-fog")}
                >
                  <Icon className={cn("size-5", active && "text-lime")} strokeWidth={1.8} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
