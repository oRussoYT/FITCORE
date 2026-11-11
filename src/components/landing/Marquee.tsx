"use client";

import { motion } from "framer-motion";

export function Marquee({ items, reverse = false }: { items: string[]; reverse?: boolean }) {
  const reduce = false as boolean;
  const row = (
    <div className="flex shrink-0 items-center gap-10 pr-10">
      {items.map((t) => (
        <span key={t} className="flex items-center gap-10">
          <span className="type-metric whitespace-nowrap text-[clamp(40px,7vw,96px)] text-ink">{t}</span>
          <svg viewBox="0 0 20 20" className="size-6 shrink-0 text-ink" aria-hidden>
            <path d="M10 0l2.6 7.4L20 10l-7.4 2.6L10 20l-2.6-7.4L0 10l7.4-2.6z" fill="currentColor" />
          </svg>
        </span>
      ))}
    </div>
  );
  return (
    <div className="overflow-hidden bg-lime py-4" aria-label={items.join(", ")}>
      <motion.div
        className="flex w-max"
        animate={reduce ? undefined : { x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ duration: 28, ease: "linear", repeat: Infinity }}
        aria-hidden
      >
        {row}
        {row}
      </motion.div>
    </div>
  );
}
