"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  Bar,
  ComposedChart,
  Customized,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";
import { marketsApi } from "@/lib/api";
import { formatGHS } from "@/lib/format";
import { cn } from "@/lib/utils";

interface HistoryPoint {
  date: string;
  value: number;
  volume?: number;
}

interface Candle {
  label: string;
  ts: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

type RangeKey = "1D" | "1W" | "1M" | "YTD" | "1Y" | "ALL";
type ChartMode = "area" | "line" | "candles";

const RANGES: RangeKey[] = ["1D", "1W", "1M", "YTD", "1Y", "ALL"];

/** Points per candle bucket for each range — keeps candles readable. */
const BUCKET_MS: Record<RangeKey, number> = {
  "1D": 60 * 60 * 1000, // hourly
  "1W": 24 * 60 * 60 * 1000, // daily
  "1M": 24 * 60 * 60 * 1000,
  YTD: 7 * 24 * 60 * 60 * 1000, // weekly
  "1Y": 7 * 24 * 60 * 60 * 1000,
  ALL: 30 * 24 * 60 * 60 * 1000, // monthly
};

function bucketLabel(ts: number, range: RangeKey) {
  const d = new Date(ts);
  if (range === "1D")
    return d.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });
  if (range === "ALL" || range === "1Y" || range === "YTD")
    return d.toLocaleDateString("en-GH", { month: "short", year: "2-digit" });
  return d.toLocaleDateString("en-GH", { day: "numeric", month: "short" });
}

function pointLabel(ts: number, range: RangeKey) {
  const d = new Date(ts);
  if (range === "1D")
    return d.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });
  if (range === "ALL" || range === "1Y")
    return d.toLocaleDateString("en-GH", { month: "short", year: "2-digit" });
  return d.toLocaleDateString("en-GH", { day: "numeric", month: "short" });
}

function toCandles(points: HistoryPoint[], range: RangeKey): Candle[] {
  const bucketMs = BUCKET_MS[range];
  const buckets = new Map<number, Candle>();
  for (const p of points) {
    const ts = new Date(p.date).getTime();
    if (!Number.isFinite(ts)) continue;
    const key = Math.floor(ts / bucketMs) * bucketMs;
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, {
        label: bucketLabel(key, range),
        ts: key,
        o: p.value,
        h: p.value,
        l: p.value,
        c: p.value,
        v: p.volume ?? 0,
      });
    } else {
      existing.h = Math.max(existing.h, p.value);
      existing.l = Math.min(existing.l, p.value);
      existing.c = p.value;
      existing.v = Math.max(existing.v, p.volume ?? 0);
    }
  }
  return [...buckets.values()].sort((a, b) => a.ts - b.ts);
}

/** SVG candlesticks drawn against the chart's own scales (real OHLC from recorded snapshots). */
function CandlesLayer(props: {
  data?: Candle[];
  xAxisMap?: Record<string, { scale?: (v: number) => number; type?: string }>;
  yAxisMap?: Record<string, { scale?: (v: number) => number }>;
  offset?: { left: number; top: number; width: number; height: number };
}) {
  const { data = [], offset } = props;
  const yAxis = Object.values(props.yAxisMap ?? {})[0];
  if (!offset || !yAxis?.scale || data.length === 0) return null;
  const y = yAxis.scale;
  const band = offset.width / data.length;
  const wick = Math.max(1, Math.min(2, band / 10));
  const bodyW = Math.max(2, band * 0.6);

  return (
    <g>
      {data.map((d, i) => {
        const x = offset.left + band * (i + 0.5);
        const up = d.c >= d.o;
        const color = up ? "hsl(var(--success))" : "hsl(var(--danger))";
        const top = y(Math.max(d.o, d.c));
        const bodyH = Math.max(1, Math.abs(y(d.o) - y(d.c)));
        return (
          <g key={d.ts}>
            <line x1={x} x2={x} y1={y(d.h)} y2={y(d.l)} stroke={color} strokeWidth={wick} />
            <rect
              x={x - bodyW / 2}
              y={top}
              width={bodyW}
              height={bodyH}
              fill={up ? color : color}
              fillOpacity={up ? 0.85 : 1}
              stroke={color}
            />
          </g>
        );
      })}
    </g>
  );
}

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
} as const;

export function PriceChart({
  ticker,
  instruments,
  className,
}: {
  ticker: string;
  /** Other instruments available for comparison overlay */
  instruments?: Array<{ ticker: string; name: string }>;
  className?: string;
}) {
  const [range, setRange] = useState<RangeKey>("1M");
  const [mode, setMode] = useState<ChartMode>("area");
  const [compareTicker, setCompareTicker] = useState<string>("");
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [comparePoints, setComparePoints] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    marketsApi
      .history(ticker, range)
      .then((h) => {
        if (alive) setPoints(h.points ?? []);
      })
      .catch(() => alive && setPoints([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [ticker, range]);

  useEffect(() => {
    if (!compareTicker) {
      setComparePoints([]);
      return;
    }
    let alive = true;
    marketsApi
      .history(compareTicker, range)
      .then((h) => {
        if (alive) setComparePoints(h.points ?? []);
      })
      .catch(() => alive && setComparePoints([]));
    return () => {
      alive = false;
    };
  }, [compareTicker, range]);

  const candles = useMemo(
    () => (mode === "candles" ? toCandles(points, range) : []),
    [points, range, mode],
  );

  /** Normalized % series when a comparison instrument is selected. */
  const normalized = useMemo(() => {
    if (!compareTicker || comparePoints.length === 0) return null;
    const baseA = points[0]?.value;
    const baseB = comparePoints[0]?.value;
    if (!baseA || !baseB) return null;

    const map = new Map<string, { a?: number; b?: number }>();
    for (const p of points) {
      const k = p.date;
      map.set(k, { ...(map.get(k) ?? {}), a: p.value });
    }
    for (const p of comparePoints) {
      const k = p.date;
      map.set(k, { ...(map.get(k) ?? {}), b: p.value });
    }
    // Forward-fill the last real observation for alignment — no fabricated points.
    let lastA: number | undefined;
    let lastB: number | undefined;
    return [...map.keys()].sort().map((k) => {
      const e = map.get(k)!;
      if (e.a != null) lastA = e.a;
      if (e.b != null) lastB = e.b;
      return {
        label: pointLabel(new Date(k).getTime(), range),
        a: lastA != null ? (lastA / baseA - 1) * 100 : null,
        b: lastB != null ? (lastB / baseB - 1) * 100 : null,
      };
    });
  }, [points, comparePoints, compareTicker, range]);

  const lineData = useMemo(
    () =>
      points.map((p) => ({
        label: pointLabel(new Date(p.date).getTime(), range),
        v: p.value,
        vol: p.volume ?? 0,
      })),
    [points, range],
  );

  const hasVolume = lineData.some((d) => d.vol > 0) || candles.some((d) => d.v > 0);
  const first = points[0]?.value ?? 0;
  const last = points[points.length - 1]?.value ?? 0;
  const positive = last >= first;
  const color = positive ? "hsl(var(--success))" : "hsl(var(--danger))";
  const gradId = `pc-${ticker}-${mode}`;

  return (
    <div className={className}>
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-semibold">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-md px-2.5 py-1 transition-colors",
                range === r
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-semibold">
            {(
              [
                ["area", "Area"],
                ["line", "Line"],
                ["candles", "Candles"],
              ] as Array<[ChartMode, string]>
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-md px-2.5 py-1 transition-colors",
                  mode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {instruments && instruments.length > 1 && (
            <select
              value={compareTicker}
              onChange={(e) => setCompareTicker(e.target.value)}
              className="h-7 rounded-lg border border-border bg-muted/40 px-2 text-xs font-semibold text-muted-foreground outline-none"
              title="Compare performance (normalized %)"
            >
              <option value="">Compare…</option>
              {instruments
                .filter((i) => i.ticker !== ticker)
                .map((i) => (
                  <option key={i.ticker} value={i.ticker}>
                    {i.ticker}
                  </option>
                ))}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex h-56 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : points.length === 0 ? (
        <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
          No price history recorded yet for {ticker}.
        </div>
      ) : normalized ? (
        /* Comparison mode: normalized % lines for both instruments */
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={normalized} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={40} />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              />
              <Tooltip
                formatter={(v: number | null, name: string) =>
                  v == null ? ["—", name] : [`${v.toFixed(2)}%`, name === "a" ? ticker : compareTicker]
                }
                contentStyle={tooltipStyle}
              />
              <Line type="monotone" dataKey="a" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="b" stroke="hsl(var(--brand-bronze, #b7791f))" strokeWidth={2} strokeDasharray="5 3" dot={false} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="mt-1 flex items-center justify-center gap-4 text-[11px] font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded bg-primary" /> {ticker}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded" style={{ background: "hsl(var(--brand-bronze, #b7791f))" }} /> {compareTicker}
            </span>
          </div>
        </div>
      ) : mode === "candles" ? (
        /* Candlesticks from real recorded snapshots */
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={candles} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={40} />
              <YAxis
                domain={[(dataMin: number) => dataMin * 0.998, (dataMax: number) => dataMax * 1.002]}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(v: number) => v.toFixed(2)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as Candle;
                  return (
                    <div style={tooltipStyle} className="p-2">
                      <p className="mb-1 text-[11px] font-semibold text-muted-foreground">{d.label}</p>
                      <div className="grid grid-cols-2 gap-x-3 text-[11px] font-mono">
                        <span className="text-muted-foreground">O</span>
                        <span>{formatGHS(d.o)}</span>
                        <span className="text-muted-foreground">H</span>
                        <span>{formatGHS(d.h)}</span>
                        <span className="text-muted-foreground">L</span>
                        <span>{formatGHS(d.l)}</span>
                        <span className="text-muted-foreground">C</span>
                        <span className="font-semibold">{formatGHS(d.c)}</span>
                      </div>
                      {d.v > 0 && (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Vol {d.v.toLocaleString("en-GH")}
                        </p>
                      )}
                    </div>
                  );
                }}
              />
              <Customized component={CandlesLayer} data={candles} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        /* Area / line */
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={lineData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={40} />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(v: number) => v.toFixed(2)}
              />
              <Tooltip
                formatter={(v: number) => formatGHS(Number(v))}
                contentStyle={tooltipStyle}
              />
              {mode === "area" ? (
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#${gradId})`}
                />
              ) : (
                <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Real traded volume bars */}
      {!loading && points.length > 0 && hasVolume && (
        <div className="mt-1 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={mode === "candles" ? candles.map((d) => ({ label: d.label, vol: d.v })) : lineData.map((d) => ({ label: d.label, vol: d.vol }))}
              margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
            >
              <XAxis dataKey="label" hide />
              <YAxis hide domain={[0, "dataMax"]} />
              <Bar dataKey="vol" fill="hsl(var(--muted-foreground))" fillOpacity={0.25} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
