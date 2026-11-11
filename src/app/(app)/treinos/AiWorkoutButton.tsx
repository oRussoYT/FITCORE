"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Field";

export function AiWorkoutButton({ enabled, reason, hasPlans }: { enabled: boolean; reason?: string; hasPlans: boolean }) {
  const router = useRouter();
  const [focus, setFocus] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-lime/30 bg-[linear-gradient(135deg,rgba(204,255,0,0.10),rgba(204,255,0,0.02))] p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-lime text-ink">
          <Sparkles className="size-5" />
        </span>
        <div>
          <h2 className="text-[18px] font-semibold">Criar meu treino com IA</h2>
          <p className="mt-1 text-[14px] leading-relaxed text-mist">
            A IA usa seu objetivo, nível, dias e tempo disponíveis para montar os treinos {hasPlans ? "(os seus atuais serão arquivados)" : ""}.
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Input label="Algo a considerar? (opcional)" placeholder="Ex.: dor no joelho, quero focar glúteos, treino em casa" value={focus} onChange={(e) => setFocus(e.target.value)} maxLength={300} />
        <Button
          size="lg"
          loading={busy}
          disabled={!enabled}
          onClick={async () => {
            setBusy(true);
            setMsg(null);
            try {
              const res = await fetch("/api/ai/treino", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ focus }) });
              const json = (await res.json()) as { error?: string; plans?: number; summary?: string | null };
              if (!res.ok) setMsg({ tone: "error", text: json.error ?? "Não foi possível criar o treino." });
              else {
                setMsg({ tone: "success", text: `${json.plans} treino(s) criado(s). ${json.summary ?? ""}` });
                router.refresh();
              }
            } catch {
              setMsg({ tone: "error", text: "Falha de conexão. Tente de novo." });
            } finally {
              setBusy(false);
            }
          }}
        >
          <Sparkles className="size-4" /> {busy ? "Montando…" : "Criar com IA"}
        </Button>
      </div>
      {!enabled && reason && <p className="mt-3 text-[13px] text-fog">{reason}</p>}
      {msg && <Notice tone={msg.tone} className="mt-4">{msg.text}</Notice>}
    </section>
  );
}
