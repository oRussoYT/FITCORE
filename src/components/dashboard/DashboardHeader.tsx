"use client";

import { useEffect, useState } from "react";
import type { NotificationRow } from "@/types/db";
import { NotificationBell } from "./NotificationBell";

function greeting(hour: number) {
  if (hour < 5) return "Boa noite";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function DashboardHeader({
  name,
  avatarUrl,
  level,
  objective,
  lastAssessment,
  notifications,
}: {
  name: string;
  avatarUrl: string | null;
  level: string | null;
  objective: string | null;
  lastAssessment: string | null;
  notifications: { items: NotificationRow[]; unread: number };
}) {
  // Saudação calculada no navegador para respeitar o fuso do aluno.
  const [hello, setHello] = useState("Olá");
  useEffect(() => setHello(greeting(new Date().getHours())), []);
  const firstName = name.split(" ")[0] ?? name;
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <header className="flex flex-wrap items-center gap-x-5 gap-y-4">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="size-14 rounded-2xl border border-line object-cover" />
        ) : (
          <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-line bg-raised text-[18px] font-bold" style={{ fontStretch: "112%" }}>
            {initials || "?"}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="type-display truncate text-[26px] sm:text-[32px]">
            {hello}, {firstName}
          </h1>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-mist">
            {level && <span>{level}</span>}
            {objective && (
              <span>
                <span className="text-fog">Objetivo:</span> {objective}
              </span>
            )}
            <span>
              <span className="text-fog">Última avaliação:</span>{" "}
              {lastAssessment ? new Date(lastAssessment).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "nenhuma"}
            </span>
          </p>
        </div>
      </div>
      <NotificationBell items={notifications.items} unread={notifications.unread} />
    </header>
  );
}
