import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";

/** Marca: um anel aberto (o ciclo de medir → treinar → medir) com um ponto de progresso. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#1a1e21" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" fill="none" stroke="#2c3236" />
      <path d="M22.5 10.2A9 9 0 1 0 25 16" fill="none" stroke="#eceee8" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="25" cy="16" r="2.6" fill="#ccff00" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span className="text-[15px] font-bold tracking-[-0.01em]" style={{ fontStretch: "112%" }}>
          {brand.shortName}
          <span className="ml-1 font-medium text-fog">AI</span>
        </span>
      )}
    </span>
  );
}
