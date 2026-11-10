"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";

export function AnimatedNumber({ value, digits = 1, className }: { value: number; digits?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = fmt(value);
      return;
    }
    const controls = animate(value * 0.92, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = fmt(v);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, digits, reduce]);

  return (
    <span ref={ref} className={className}>
      {fmt(value)}
    </span>
  );
}
