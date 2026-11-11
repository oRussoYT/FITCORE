"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

export function AttendanceChart({ data }: { data: Array<{ day: string; count: number }> }) {
  const rows = data.map((d) => ({ ...d, label: new Date(`${d.day}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) }));
  return (
    <div className="mt-4 h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows}>
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#6f7773", fontSize: 10 }} interval="preserveStartEnd" />
          <Tooltip contentStyle={{ background: "#22272b", border: "1px solid #3a4146", borderRadius: 10, fontSize: 12 }} formatter={(v) => [v, "Treinos"]} />
          <Bar dataKey="count" fill="#ccff00" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
