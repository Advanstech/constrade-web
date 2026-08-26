"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { marketsApi } from "@/lib/api";
import type { PerformanceData, PerformanceGroup, PerformanceSeries } from "@/lib/api.types";
import { formatGHS } from "@/lib/format";
import { cn } from "@/lib/utils";

const GROUPS: { key: PerformanceGroup; label: string }[] = [
  { key: "gse", label: "GSE Composite Index" },
  { key: "equities", label: "Equities" },
  { key: "fixed", label: "Fixed Income Yields" },
  { key: "eurobonds", label: "SSA Eurobonds" },
  { key: "fx", label: "Foreign Exchange" },
];

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 10,
  boxShadow: "0 8px 24px -8px rgb(0 0 0 / 0.25)",
  fontSize: 12,
  padding: "8px 10px",
};

function formatValue(group: PerformanceGroup, value: number): string {
  if (group === "equities" || group === "gse") return formatGHS(value);
  if (group === "fx") return value.toLocaleString("en-GH", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return `${value.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

/**
 * Multi-series "Market Performance" chart with per-asset-class tabs,
 * mirroring the reference Market Data module.
 */
export function MarketPerformance() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<PerformanceGroup>("equities");

  const load = () => {
    setLoading(true);
    void marketsApi
      .performance(30)
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const chartData = useMemo(() => {
    if (!data) return [];
    const series = data.series[group] ?? [];
    return data.labels.map((label, i) => {
      const row: Record<string, string | number> = { label };
      for (const s of series) {
        row[s.label] = s.points[i] ?? 0;
      }
      return row;
    });
  }, [data, group]);

  const activeSeries: PerformanceSeries[] = data?.series[group] ?? [];
  const lastUpdated = data
    ? new Date(data.updatedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h3 className="font-display text-lg font-bold text-card-foreground">
            Market Performance
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Track key market indicators across different asset classes
            {lastUpdated && (
              <span className="ml-1 text-muted-foreground/70">· Last updated: {lastUpdated}</span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Asset-class tabs */}
      <div className="overflow-x-auto border-b border-border p-4 sm:p-5">
        <div className="inline-flex min-w-max gap-1 rounded-full bg-muted/70 p-1">
          {GROUPS.map((g) => (
            <button
              key={g.key}
              onClick={() => setGroup(g.key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
                group === g.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="p-4 sm:p-5">
        {loading || !data ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    {activeSeries.map((s) => (
                      <linearGradient key={s.label} id={`perf-${s.label.replace(/\s+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.color} stopOpacity={0.32} />
                        <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    interval={Math.max(1, Math.floor(chartData.length / 6) - 1)}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                    domain={["auto", "auto"]}
                    tickFormatter={(v: number) => (group === "fx" ? v.toFixed(3) : group === "fixed" || group === "eurobonds" ? `${v.toFixed(1)}%` : formatGHS(v, { cents: v < 100 }))}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                    formatter={(value, name) => [formatValue(group, Number(value)), name]}
                  />
                  {activeSeries.map((s) => (
                    <Area
                      key={s.label}
                      type="monotone"
                      dataKey={s.label}
                      stroke={s.color}
                      strokeWidth={2}
                      fill={`url(#perf-${s.label.replace(/\s+/g, "")})`}
                      connectNulls
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {activeSeries.map((s) => {
                const last = s.points[s.points.length - 1] ?? 0;
                const first = s.points[0] ?? 0;
                const change = first !== 0 ? ((last - first) / first) * 100 : 0;
                return (
                  <span key={s.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    {s.label}
                    <span className="font-semibold text-foreground">
                      {formatValue(group, last)}
                    </span>
                    <span className={change >= 0 ? "text-success" : "text-danger"}>
                      {change >= 0 ? "+" : ""}
                      {change.toFixed(1)}%
                    </span>
                  </span>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
