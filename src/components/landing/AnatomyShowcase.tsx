"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BodyAnatomy } from "@/components/body/BodyAnatomy";

/** Sequência ilustrativa de treinos (demonstração — não são dados de ninguém). */
const DEMO_DAYS: Array<{ name: string; groups: Record<string, number> }> = [
  { name: "Treino A · Pernas", groups: { quads: 1, glutes: 0.85, hamstrings: 0.7, calves: 0.5 } },
  { name: "Treino B · Empurrar", groups: { chest: 1, shoulders: 0.8, triceps: 0.65 } },
  { name: "Treino C · Puxar", groups: { back: 1, traps: 0.6, biceps: 0.75, forearms: 0.4 } },
  { name: "Treino D · Core", groups: { abs: 1, glutes: 0.4 } },
];

export function AnatomyShowcase({ compact = false }: { compact?: boolean }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setI((v) => (v + 1) % DEMO_DAYS.length), 2600);
    return () => clearInterval(id);
  }, [reduce]);

  const day = DEMO_DAYS[i] ?? DEMO_DAYS[0]!;
  return (
    <div className="relative">
      <div className={compact ? "aspect-[966/1024] w-full" : "aspect-[966/1024] w-full max-w-[640px]"}>
        <BodyAnatomy
          intensityFor={(g) => day.groups[g] ?? 0}
          selected={selected}
          onSelect={setSelected}
          labelFor={(g) => g}
        />
      </div>
      <div className="mt-4 flex items-center justify-between gap-4 text-[13px]">
        <AnimatePresence mode="wait">
          <motion.span
            key={day.name}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="font-semibold text-bone"
          >
            {day.name}
          </motion.span>
        </AnimatePresence>
        <span className="rounded-full border border-amber/40 px-2.5 py-0.5 text-[11.5px] text-amber">Demonstração</span>
      </div>
    </div>
  );
}
