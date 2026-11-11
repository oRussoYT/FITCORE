"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { sendReview } from "./actions";

const LABELS = ["", "Ruim", "Regular", "Bom", "Muito bom", "Excelente"];
const MAX = 600;

export function ReviewComposer({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const shown = hover || rating;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await sendReview({ rating, body, displayName: name });
      if (!r.ok) return setError(r.error);
      setSent(true);
      setRating(0);
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-line bg-surface p-6 sm:p-10">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[radial-gradient(circle,rgba(204,255,0,0.12),transparent_65%)]" />
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div key="ok" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="relative py-8 text-center">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="mx-auto flex size-20 items-center justify-center rounded-full bg-lime text-ink shadow-[0_0_50px_-5px_rgba(204,255,0,0.7)]"
            >
              <Check className="size-10" strokeWidth={3} />
            </motion.span>
            <h2 className="type-display mt-6 text-[30px]">Valeu pela avaliação!</h2>
            <p className="mx-auto mt-3 max-w-sm leading-relaxed text-mist">Ela aparece na página inicial assim que for aprovada.</p>
            <button type="button" onClick={() => setSent(false)} className="mt-8 inline-flex h-12 items-center rounded-full border border-line bg-raised px-6 font-semibold hover:border-lime/50">
              Fazer outra avaliação
            </button>
          </motion.div>
        ) : (
          <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={submit} className="relative">
            <p className="text-[14px] text-mist">Sua nota</p>
            <div className="mt-3 flex items-center gap-2" role="radiogroup" aria-label="Nota de 1 a 5" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <motion.button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} estrela${n > 1 ? "s" : ""} — ${LABELS[n]}`}
                  onMouseEnter={() => setHover(n)}
                  onClick={() => setRating(n)}
                  whileTap={{ scale: 0.85 }}
                  animate={{ scale: n <= shown ? 1.08 : 1 }}
                  className="p-0.5"
                >
                  <Star className={cn("size-11 transition-colors sm:size-12", n <= shown ? "fill-lime text-lime" : "text-line-strong")} />
                </motion.button>
              ))}
              <span className="ml-3 min-w-24 text-[17px] font-semibold text-lime">{LABELS[shown]}</span>
            </div>

            <label className="mt-8 block">
              <span className="text-[14px] text-mist">Conte como está sendo</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, MAX))}
                rows={5}
                placeholder="O que mudou na sua rotina usando o FITCORE? O que você mais gosta? O que podia melhorar?"
                className="mt-2 w-full resize-none rounded-2xl border border-line bg-graphite px-4 py-3.5 text-[16px] leading-relaxed placeholder:text-fog focus:border-lime/70 focus:outline-none"
              />
              <span className={cn("mt-1 block text-right text-[12px]", body.length > MAX - 50 ? "text-amber" : "text-fog")}>
                {body.length}/{MAX}
              </span>
            </label>

            <label className="mt-4 block max-w-sm">
              <span className="text-[14px] text-mist">Nome que vai aparecer</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 60))}
                className="mt-2 h-12 w-full rounded-2xl border border-line bg-graphite px-4 text-[16px] focus:border-lime/70 focus:outline-none"
              />
            </label>

            {error && <p className="mt-4 rounded-xl bg-coral/10 px-4 py-3 text-[14px] text-coral">{error}</p>}

            <button
              type="submit"
              disabled={pending || rating === 0 || body.trim().length < 10}
              className="mt-8 inline-flex h-14 items-center rounded-full bg-lime px-8 text-[17px] font-bold text-ink transition-transform hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
            >
              {pending ? "Enviando…" : "Enviar avaliação"}
            </button>
            {rating === 0 && <p className="mt-2 text-[12.5px] text-fog">Escolha as estrelas e escreva pelo menos 10 caracteres.</p>}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
