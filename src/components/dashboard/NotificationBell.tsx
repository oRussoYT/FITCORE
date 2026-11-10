"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";
import { markNotificationsRead } from "@/app/(app)/actions";
import { cn } from "@/lib/cn";
import type { NotificationRow } from "@/types/db";

function timeAgo(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "agora";
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function NotificationBell({ items, unread }: { items: NotificationRow[]; unread: number }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [localUnread, setLocalUnread] = useState(unread);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setLocalUnread(unread), [unread]);
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={localUnread > 0 ? `Notificações: ${localUnread} não lidas` : "Notificações"}
        className="relative flex size-10 items-center justify-center rounded-xl border border-line bg-surface text-mist transition-colors hover:border-line-strong hover:text-bone"
      >
        <Bell className="size-[18px]" strokeWidth={1.8} />
        {localUnread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-lime px-1 text-[10.5px] font-bold text-ink">
            {localUnread > 9 ? "9+" : localUnread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 z-40 mt-2 w-[min(360px,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-2xl border border-line bg-raised shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-semibold">Notificações</p>
              {localUnread > 0 && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      await markNotificationsRead();
                      setLocalUnread(0);
                    })
                  }
                  className="text-[12.5px] text-mist hover:text-bone disabled:opacity-50"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-fog">Nenhuma notificação por enquanto.</p>
            ) : (
              <ul className="max-h-[360px] overflow-y-auto">
                {items.map((n) => {
                  const unreadItem = !n.read_at && localUnread > 0;
                  const body = (
                    <div className="flex gap-3 px-4 py-3">
                      <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", unreadItem ? "bg-lime" : "bg-transparent")} />
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-medium text-bone">{n.title}</p>
                        {n.body && <p className="mt-0.5 text-[12.5px] leading-snug text-mist">{n.body}</p>}
                        <p className="mt-1 text-[11px] text-fog">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  );
                  return (
                    <li key={n.id} className="border-b border-line/60 last:border-0">
                      {n.link ? (
                        <Link href={n.link} onClick={() => setOpen(false)} className="block hover:bg-surface/60">
                          {body}
                        </Link>
                      ) : (
                        body
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
