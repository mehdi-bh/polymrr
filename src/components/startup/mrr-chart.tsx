"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { getMrrHistory, formatCents } from "@/lib/data";

interface MrrChartProps {
  slug: string;
  height?: number;
}

export function MrrChart({ slug, height = 200 }: MrrChartProps) {
  const data = getMrrHistory(slug).map((s) => ({
    date: new Date(s.date).toLocaleDateString("en-US", { month: "short" }),
    mrr: s.mrr,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`g-${slug}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5a623" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#f5a623" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fill: "#6b7084", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#6b7084", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => formatCents(v)}
          width={50}
        />
        <Tooltip
          contentStyle={{
            background: "#1e1e28",
            border: "1px solid #252530",
            borderRadius: 10,
            fontSize: 12,
            color: "#e5e5e5",
          }}
          formatter={(value) => [formatCents(value as number), "MRR"]}
        />
        <Area
          type="monotone"
          dataKey="mrr"
          stroke="#f5a623"
          strokeWidth={2}
          fill={`url(#g-${slug})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
