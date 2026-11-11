"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/domain/metrics";

export function WeightChart({ data }: { data: Array<{ date: string; value: number }> }) {
  const rows = data.map((d) => ({ ...d, label: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) }));
  return (
    <div className="mt-4 h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#22272b" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#6f7773", fontSize: 11 }} />
          <YAxis domain={["dataMin - 1", "dataMax + 1"]} tickLine={false} axisLine={false} tick={{ fill: "#6f7773", fontSize: 11 }} tickFormatter={(v) => formatNumber(Number(v), 0)} />
          <Tooltip
            contentStyle={{ background: "#22272b", border: "1px solid #3a4146", borderRadius: 10, fontSize: 12 }}
            formatter={(v) => [`${formatNumber(Number(v), 1)} kg`, "Peso"]}
          />
          <Line type="monotone" dataKey="value" stroke="#eceee8" strokeWidth={2} dot={{ r: 3, fill: "#eceee8", stroke: "none" }} activeDot={{ r: 5, fill: "#ccff00", stroke: "none" }} animationDuration={900} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
