"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeftRight, Search, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { marketsApi } from "@/lib/api";
import type { Quote } from "@/lib/api.types";
import { changeBgClass, formatGHS, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

const Chart = ({ ticker, points }: { ticker: string; points: number[] }) => {
  const data = points.map((v, i) => ({ i, v }));
  const first = points[0] ?? 0;
  const last = points[points.length - 1] ?? 0;
  const positive = last >= first;
  const color = positive ? "hsl(var(--success))" : "hsl(var(--danger))";
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`chart-${ticker}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="i" hide />
          <YAxis domain={["auto", "auto"]} hide />
          <Tooltip
            formatter={(v) => formatGHS(Number(v))}
            labelFormatter={() => ""}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            fill={`url(#chart-${ticker})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const AppMarkets = () => {
  const [tab, setTab] = useState("equity");
  const [query, setQuery] = useState("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selected, setSelected] = useState<Quote | null>(null);
  const [sparks, setSparks] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void marketsApi
      .instruments()
      .then((all) => {
        if (!alive) return;
        setQuotes(all);
        const first = all.find((q) => q.assetClass === "equity") ?? all[0];
        setSelected(first ?? null);
        if (first) {
          void marketsApi.sparkline(first.ticker, 30).then((p) => {
            if (alive) setSparks((s) => ({ ...s, [first.ticker]: p }));
          });
        }
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const select = (q: Quote) => {
    setSelected(q);
    void marketsApi.sparkline(q.ticker, 30).then((p) =>
      setSparks((s) => ({ ...s, [q.ticker]: p })),
    );
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return quotes
      .filter((x) => x.assetClass === (tab === "all" ? x.assetClass : tab))
      .filter(
        (x) =>
          !q ||
          x.ticker.toLowerCase().includes(q) ||
          x.name.toLowerCase().includes(q),
      );
  }, [quotes, tab, query]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Markets"
        subtitle="Ghana Stock Exchange — equities, treasury bills and bonds."
        actions={
          <Button asChild variant="premium" size="sm" disabled={!selected}>
            <Link href={`/app/trade?ticker=${selected?.ticker ?? ""}`}>
              <ArrowLeftRight className="h-4 w-4" /> Trade
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        {/* List */}
        <div className="rounded-2xl border border-border bg-card shadow-card">
          <div className="border-b border-border p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by ticker or name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Tabs value={tab} onValueChange={setTab} className="mt-3">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="equity">Equities</TabsTrigger>
                <TabsTrigger value="fixed_income">Fixed income</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="max-h-[28rem] overflow-y-auto">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="mx-4 my-2 h-14" />
                ))
              : list.map((q) => (
                  <button
                    key={q.ticker}
                    onClick={() => select(q)}
                    className={cn(
                      "flex w-full items-center justify-between border-b border-border/50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/50",
                      selected?.ticker === q.ticker && "bg-brand-bronze-soft/60 hover:bg-brand-bronze-soft/60",
                    )}
                  >
                    <div>
                      <p className="text-sm font-semibold text-card-foreground">{q.ticker}</p>
                      <p className="text-xs text-muted-foreground">{q.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-card-foreground">
                        {q.assetClass === "fixed_income" && q.yieldToMaturity
                          ? `${q.yieldToMaturity.toFixed(2)}%`
                          : formatGHS(q.price)}
                      </p>
                      <p className={`text-xs font-semibold ${changeBgClass(q.changePct)}`}>
                        {formatPercent(q.changePct)}
                      </p>
                    </div>
                  </button>
                ))}
            {!loading && list.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No instruments match "{query}".
              </p>
            )}
          </div>
        </div>

        {/* Detail */}
        {selected ? (
          <div className="rounded-2xl border border-border bg-card shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-glow">
                  <TrendingUp className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-bold">{selected.ticker}</h2>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {selected.assetClass === "equity" ? "Equity" : "Fixed income"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{selected.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl font-extrabold">
                  {selected.assetClass === "fixed_income" && selected.yieldToMaturity
                    ? `${selected.yieldToMaturity.toFixed(2)}%`
                    : formatGHS(selected.price)}
                </p>
                <p className={`text-sm font-semibold ${changeBgClass(selected.changePct)}`}>
                  {formatPercent(selected.changePct)} today
                </p>
              </div>
            </div>

            <div className="p-5">
              <Chart ticker={selected.ticker} points={sparks[selected.ticker] ?? []} />

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KeyStat
                  label="Volume"
                  value={selected.volume.toLocaleString("en-GH")}
                />
                {selected.assetClass === "equity" ? (
                  <>
                    <KeyStat label="Sector" value={selected.sector ?? "—"} />
                    <KeyStat
                      label="Market cap"
                      value={formatGHS(selected.marketCap ?? 0, { compact: true })}
                    />
                    <KeyStat label="Currency" value={selected.currency} />
                  </>
                ) : (
                  <>
                    <KeyStat label="Coupon" value={selected.coupon ? `${selected.coupon.toFixed(2)}%` : "Zero"} />
                    <KeyStat label="Maturity" value={selected.maturity ?? "—"} />
                    <KeyStat
                      label="Min. investment"
                      value={formatGHS(selected.minInvestment ?? 0, { cents: false })}
                    />
                  </>
                )}
              </div>

              <Button asChild size="lg" variant="premium" className="mt-6 w-full">
                <Link href={`/app/trade?ticker=${selected.ticker}`}>
                  <ArrowLeftRight className="h-4 w-4" />
                  Trade {selected.ticker}
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[24rem] items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">
            Select an instrument to view details.
          </div>
        )}
      </div>
    </div>
  );
};

function KeyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-card-foreground">{value}</p>
    </div>
  );
}

export default AppMarkets;
