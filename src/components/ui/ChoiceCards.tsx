"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

type Option<T extends string> = { value: T; label: string; hint?: string };

/** Grupo de escolha única em cartões, acessível como radio group. */
export function ChoiceCards<T extends string>({
  name,
  options,
  value,
  onChange,
  columns = 2,
}: {
  name: string;
  options: Option<T>[];
  value: T | null | undefined;
  onChange: (v: T) => void;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div role="radiogroup" aria-label={name} className={cn("grid gap-3", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-3")}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              "group relative flex flex-col items-start gap-1 rounded-2xl border px-4 py-4 text-left transition-[border,background] duration-200",
              selected ? "border-lime/70 bg-lime/[0.06]" : "border-line bg-surface hover:border-line-strong",
            )}
          >
            <span className="flex w-full items-center justify-between gap-3">
              <span className="text-[15px] font-semibold">{o.label}</span>
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border transition-colors",
                  selected ? "border-lime bg-lime text-ink" : "border-line-strong",
                )}
              >
                {selected && <Check className="size-3" strokeWidth={3} />}
              </span>
            </span>
            {o.hint && <span className="text-[13px] leading-snug text-mist">{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
