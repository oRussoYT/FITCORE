"use client";

import { useState, useTransition } from "react";
import { Button, type ButtonProps } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/validation/common";

/** Botão que executa uma ação do servidor e mostra o erro, se houver. */
export function ActionButton({
  action,
  confirm,
  children,
  ...rest
}: Omit<ButtonProps, "onClick"> & { action: () => Promise<ActionResult>; confirm?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  function run() {
    start(async () => {
      try {
        const r = await action();
        setError(r.ok ? null : r.error);
      } catch {
        setError("Falha de conexão. Tente de novo.");
      }
      setAsking(false);
    });
  }

  if (confirm && asking) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] text-mist">{confirm}</span>
        <Button size="sm" variant="ghost" onClick={() => setAsking(false)} disabled={pending}>
          Não
        </Button>
        <Button size="sm" variant="danger" loading={pending} onClick={run}>
          Sim
        </Button>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button {...rest} loading={pending} onClick={() => (confirm ? setAsking(true) : run())}>
        {children}
      </Button>
      {error && <span className="text-[12px] text-coral">{error}</span>}
    </span>
  );
}
