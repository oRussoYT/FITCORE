"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { deleteAssessment } from "./actions";

export function DeleteAssessmentButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex size-8 items-center justify-center rounded-lg text-fog transition-colors hover:bg-raised hover:text-coral"
        aria-label="Excluir avaliação"
      >
        <Trash2 className="size-4" />
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[12.5px] text-mist">{error ?? "Excluir de vez?"}</span>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
        Manter
      </Button>
      <Button
        size="sm"
        variant="danger"
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await deleteAssessment(id);
            if (!res.ok) setError(res.error);
          })
        }
      >
        Excluir
      </Button>
    </div>
  );
}
