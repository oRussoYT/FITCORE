"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { setDataRequestStatus } from "./actions";

export function RequestActions({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const run = (s: "processing" | "done" | "rejected") =>
    start(async () => {
      const r = await setDataRequestStatus(id, s);
      setMsg(r.ok ? null : r.error);
    });
  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-[12px] text-coral">{msg}</span>}
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run("processing")}>
        Em andamento
      </Button>
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run("done")}>
        Concluído
      </Button>
    </div>
  );
}
