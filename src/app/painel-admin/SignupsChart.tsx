"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

export function SignupsChart({ data }: { data: Array<{ day: string; count: number }> }) {
  const rows = data.map((d) => ({ ...d, label: new Date(`${d.day}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) }));
  return (
    <div className="mt-4 h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="signupFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ccff00" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#ccff00" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#6f7773", fontSize: 10 }} interval={4} />
          <Tooltip
            cursor={{ stroke: "#3a4146" }}
            contentStyle={{ background: "#22272b", border: "1px solid #3a4146", borderRadius: 12, fontSize: 12 }}
            formatter={(v) => [v, "Cadastros"]}
          />
          <Area type="monotone" dataKey="count" stroke="#ccff00" strokeWidth={2.5} fill="url(#signupFill)" animationDuration={1400} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
