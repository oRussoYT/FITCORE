"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Feedback";

export function ReportButton({ enabled, reason }: { enabled: boolean; reason?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        variant="secondary"
        loading={busy}
        disabled={!enabled}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await fetch("/api/ai/relatorio", { method: "POST" });
            const json = (await res.json()) as { error?: string };
            if (!res.ok) setError(json.error ?? "Não foi possível gerar o relatório.");
            else router.refresh();
          } catch {
            setError("Falha de conexão. Tente de novo.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Sparkles className="size-4 text-lime" /> {busy ? "Gerando relatório…" : "Gerar relatório da IA"}
      </Button>
      {!enabled && reason && <p className="mt-2 text-[13px] text-fog">{reason}</p>}
      {error && <Notice tone="error" className="mt-3">{error}</Notice>}
    </div>
  );
}
