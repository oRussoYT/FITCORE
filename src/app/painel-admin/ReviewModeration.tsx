"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { moderateReview } from "./actions";

export function ReviewModeration({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const run = (s: "approved" | "rejected") =>
    start(async () => {
      const r = await moderateReview(id, s);
      setMsg(r.ok ? null : r.error);
    });
  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-[12px] text-coral">{msg}</span>}
      {status !== "rejected" && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run("rejected")}>
          Recusar
        </Button>
      )}
      {status !== "approved" && (
        <Button size="sm" disabled={pending} onClick={() => run("approved")}>
          Publicar
        </Button>
      )}
    </div>
  );
}
