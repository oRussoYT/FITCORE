import { AlertTriangle, CheckCircle2, FlaskConical } from "lucide-react";
import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-lg bg-[linear-gradient(90deg,var(--color-raised),#2a3034,var(--color-raised))] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}

export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "success" | "error" | "demo";
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const styles = {
    info: "border-line bg-raised/60 text-mist",
    success: "border-lime/30 bg-lime/[0.06] text-bone",
    error: "border-coral/40 bg-coral/[0.07] text-bone",
    demo: "border-amber/40 bg-amber/[0.08] text-bone",
  }[tone];
  const Icon = tone === "error" ? AlertTriangle : tone === "demo" ? FlaskConical : CheckCircle2;
  const iconColor = tone === "error" ? "text-coral" : tone === "demo" ? "text-amber" : tone === "success" ? "text-lime" : "text-fog";
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border px-4 py-3 text-sm", styles, className)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", iconColor)} aria-hidden />
      <div className="space-y-0.5">
        {title && <p className="font-semibold text-bone">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
  className,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-2 rounded-xl border border-dashed border-line px-4 py-4", className)}>
      <p className="text-sm font-semibold text-bone/90">{title}</p>
      {children && <div className="text-[13px] leading-relaxed text-fog">{children}</div>}
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
