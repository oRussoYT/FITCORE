"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Feedback";
import { Input, Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { saveReview } from "./actions";

type Existing = { rating: number; body: string; display_name: string; status: string } | null;

const STATUS: Record<string, string> = {
  pending: "Aguardando aprovação",
  approved: "Publicada na página inicial",
  rejected: "Não publicada",
};

export function ReviewForm({ existing, defaultName }: { existing: Existing; defaultName: string }) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [body, setBody] = useState(existing?.body ?? "");
  const [name, setName] = useState(existing?.display_name ?? defaultName);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <section className="panel mt-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold">Avalie o FITCORE</h2>
        {existing && <span className="text-[12.5px] text-fog">{STATUS[existing.status] ?? existing.status}</span>}
      </div>
      <p className="mt-1 text-[13px] text-mist">Avaliações aprovadas aparecem na página inicial com o nome que você escolher.</p>
      {msg && <Notice tone={msg.tone} className="mt-4">{msg.text}</Notice>}
      <div className="mt-4 flex gap-1" role="radiogroup" aria-label="Nota">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} estrela${n > 1 ? "s" : ""}`} onClick={() => setRating(n)}>
            <Star className={cn("size-7 transition-colors", n <= rating ? "fill-lime text-lime" : "text-line-strong")} />
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-4">
        <Textarea label="Seu comentário" value={body} maxLength={600} onChange={(e) => setBody(e.target.value)} placeholder="O que mudou na sua rotina usando o FITCORE?" />
        <Input label="Nome exibido" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} hint="Pode ser só o primeiro nome." />
      </div>
      <Button
        className="mt-4"
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await saveReview({ rating, body, displayName: name });
            setMsg(r.ok ? { tone: "success", text: "Recebida! Ela aparece na página inicial depois de aprovada." } : { tone: "error", text: r.error });
          })
        }
      >
        {existing ? "Atualizar avaliação" : "Enviar avaliação"}
      </Button>
    </section>
  );
}
