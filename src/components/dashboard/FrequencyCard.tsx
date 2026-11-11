"use client";

import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { FrequencyIndicator } from "@/lib/domain/dashboard";

export function FrequencyCard({ data }: { data: FrequencyIndicator }) {
  const diff = data.thisWeek - data.lastWeek;
  return (
    <article className="panel flex flex-col p-5">
      <header className="flex items-start justify-between">
        <h3 className="type-label">Frequência semanal</h3>
        {data.target !== null && <span className="text-[12.5px] text-fog">Meta: {data.target}× por semana</span>}
      </header>
      <p className="mt-3 flex items-baseline gap-2">
        <span className="type-metric text-[44px]">{data.thisWeek}</span>
        <span className="text-[15px] text-mist">{data.thisWeek === 1 ? "treino" : "treinos"} nesta semana</span>
      </p>
      <p className="mt-1 text-[12.5px] text-fog">
        Semana passada: {data.lastWeek}
        {data.totalSessions > 0 && diff !== 0 && ` (${diff > 0 ? "+" : "−"}${Math.abs(diff)})`}
      </p>
      {data.totalSessions > 0 ? (
        <div className="mt-4 h-28" aria-label="Treinos por semana nas últimas 8 semanas">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.weeks} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#6f7773", fontSize: 10 }} interval={1} />
              {data.target !== null && <ReferenceLine y={data.target} stroke="#ccff00" strokeDasharray="3 4" strokeOpacity={0.6} />}
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                contentStyle={{ background: "#22272b", border: "1px solid #3a4146", borderRadius: 10, fontSize: 12 }}
                formatter={(v) => [`${v} treino(s)`, "Semana"]}
              />
              <Bar dataKey="count" fill="#a3aaa6" radius={[4, 4, 0, 0]} maxBarSize={22} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-4 text-[13px] leading-relaxed text-fog">
          Os treinos concluídos no modo de execução aparecem aqui, semana a semana.
        </p>
      )}
    </article>
  );
}
