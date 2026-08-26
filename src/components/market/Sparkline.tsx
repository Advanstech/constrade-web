import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

/** Tiny sparkline for tables and ticker rows. */
export function Sparkline({ points, positive }: { points: number[]; positive: boolean }) {
  const id = useId().replace(/[:]/g, "");
  const data = points.map((v, i) => ({ i, v }));
  const color = positive ? "hsl(var(--success))" : "hsl(var(--danger))";
  return (
    <div className="h-8 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${id})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
