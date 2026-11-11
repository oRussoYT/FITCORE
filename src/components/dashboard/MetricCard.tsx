"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { cn } from "@/lib/cn";
import { formatNumber, formatSigned } from "@/lib/domain/metrics";
import type { Indicator } from "@/lib/domain/dashboard";
import { AnimatedNumber } from "./AnimatedNumber";

function trendTone(diff: number | null, direction: -1 | 0 | 1) {
  if (diff === null || Math.abs(diff) < 0.05 || direction === 0) return "text-mist";
  return Math.sign(diff) === direction ? "text-lime" : "text-amber";
}

export function MetricCard({ indicator, className }: { indicator: Indicator; className?: string }) {
  const { label, unit, digits, current, previous, diff, pct, history, direction, note, emptyText } = indicator;
  const hasData = current !== null;

  return (
    <article className={cn("panel flex min-h-[188px] flex-col p-5", className)}>
      <header className="flex items-start justify-between gap-3">
        <h3 className="type-label">{label}</h3>
        {diff !== null && (
          <span className={cn("text-[13px] font-semibold tabular-nums", trendTone(diff, direction))}>
            {formatSigned(diff, digits, unit ? ` ${unit}` : "")}
            {pct !== null && <span className="ml-1 font-normal text-fog">({formatSigned(pct, 1, "%")})</span>}
          </span>
        )}
      </header>

      {hasData ? (
        <>
          <p className="mt-3 flex items-baseline gap-1.5">
            <AnimatedNumber value={current} digits={digits} className="type-metric text-[44px] text-bone" />
            {unit && <span className="text-[15px] text-mist">{unit}</span>}
          </p>
          <p className="mt-1 text-[12.5px] text-fog">
            {previous !== null ? `Anterior: ${formatNumber(previous, digits)}${unit ? ` ${unit}` : ""}` : "Primeiro registro"}
          </p>
          {history.length > 1 && (
            <div className="-mx-1 mt-auto h-14 pt-3" aria-hidden>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <defs>
                    <linearGradient id={`g-${indicator.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#eceee8" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#eceee8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
                  <Tooltip
                    cursor={{ stroke: "#3a4146" }}
                    contentStyle={{ background: "#22272b", border: "1px solid #3a4146", borderRadius: 10, fontSize: 12 }}
                    labelFormatter={(_, p) => {
                      const d = p?.[0]?.payload?.date as string | undefined;
                      return d ? new Date(d).toLocaleDateString("pt-BR") : "";
                    }}
                    formatter={(v) => [`${formatNumber(Number(v), digits)} ${unit}`, label]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#eceee8"
                    strokeWidth={1.6}
                    fill={`url(#g-${indicator.key})`}
                    dot={false}
                    activeDot={{ r: 3.5, fill: "#ccff00", stroke: "none" }}
                    animationDuration={900}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          {note && <p className="mt-2 text-[11.5px] leading-snug text-fog">{note}</p>}
        </>
      ) : (
        <p className="mt-4 text-[13px] leading-relaxed text-fog">{emptyText}</p>
      )}
    </article>
  );
}
