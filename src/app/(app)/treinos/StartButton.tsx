"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Play } from "lucide-react";
import { startSession } from "./actions";

export function StartButton({ planId, resume, disabled }: { planId: string; resume?: boolean; disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending || disabled}
        onClick={() =>
          start(async () => {
            const r = await startSession(planId);
            if (!r.ok || !r.data) return setError(r.ok ? "Erro" : r.error);
            router.push(`/treinos/sessao/${r.data.id}`);
          })
        }
        className="inline-flex h-11 items-center gap-2 rounded-full bg-lime px-5 font-bold text-ink transition-transform hover:scale-[1.03] disabled:opacity-50"
      >
        <Play className="size-4 fill-ink" /> {pending ? "Abrindo…" : resume ? "Continuar treino" : "Começar"}
      </button>
      {error && <span className="text-[12px] text-coral">{error}</span>}
    </span>
  );
}
