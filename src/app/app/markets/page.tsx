"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Search, TrendingUp, Star, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Sparkline } from "@/components/market/Sparkline";
import { PriceChart } from "@/components/market/PriceChart";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/auth/AuthProvider";
import { marketsApi } from "@/lib/api";
import { subscribeEvents, type MarketTick } from "@/lib/realtime";
import type { Quote } from "@/lib/api.types";
import { changeBgClass, formatGHS, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

const AppMarkets = () => {
  const { profile, updateProfile } = useAuth();
  const [tab, setTab] = useState("equity");
  const [query, setQuery] = useState("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selected, setSelected] = useState<Quote | null>(null);
  const [sparks, setSparks] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [isUpdatingWatchlist, setIsUpdatingWatchlist] = useState(false);

  useEffect(() => {
    let alive = true;
    void marketsApi
      .instruments()
      .then((all) => {
        if (!alive) return;
        setQuotes(all);
        const first = all.find((q) => q.assetClass === "equity") ?? all[0];
        setSelected(first ?? null);
        // One batched call fills every row's real 1-week trend sparkline.
        const tickers = all.map((q) => q.ticker);
        if (tickers.length) {
          void marketsApi.historyBatch(tickers, "1W").then((h) => {
            if (!alive) return;
            setSparks(
              Object.fromEntries(
                Object.entries(h).map(([t, pts]) => [t, pts.map((p) => p.value)]),
              ),
            );
          });
        }
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // Live GSE price ticks pushed over SSE — update quotes in place.
  useEffect(() => {
    const unsubscribe = subscribeEvents((e) => {
      if (e.event !== "market" || !Array.isArray(e.data)) return;
      const ticks = e.data as MarketTick[];
      const applyTick = (q: Quote): Quote => {
        const t = ticks.find((x) => x.ticker === q.ticker);
        if (!t) return q;
        const prevClose = t.previousClose ?? q.price;
        return {
          ...q,
          price: t.price,
          volume: t.volume,
          changePct: prevClose
            ? ((t.price - prevClose) / prevClose) * 100
            : q.changePct,
        };
      };
      setQuotes((prev) => prev.map(applyTick));
      setSelected((prev) => (prev ? applyTick(prev) : prev));
    });
    return unsubscribe;
  }, []);

  const select = (q: Quote) => {
    setSelected(q);
    if (!sparks[q.ticker]?.length) {
      void marketsApi.sparkline(q.ticker, 30).then((p) =>
        setSparks((s) => ({ ...s, [q.ticker]: p })),
      );
    }
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const currentWatchlist = profile?.watchlist || [];
    
    return quotes
      .filter((x) => {
        if (tab === "watchlist") return currentWatchlist.includes(x.ticker);
        if (tab === "all") return true;
        return x.assetClass === tab;
      })
      .filter(
        (x) =>
          !q ||
          x.ticker.toLowerCase().includes(q) ||
          x.name.toLowerCase().includes(q),
      );
  }, [quotes, tab, query, profile?.watchlist]);

  const toggleWatchlist = async (ticker: string) => {
    if (!profile) return;
    setIsUpdatingWatchlist(true);
    try {
      const current = profile.watchlist || [];
      const updated = current.includes(ticker) 
        ? current.filter(t => t !== ticker) 
        : [...current, ticker];
      
      await updateProfile({ watchlist: updated });
    } finally {
      setIsUpdatingWatchlist(false);
    }
  };

  const isWatched = selected ? (profile?.watchlist || []).includes(selected.ticker) : false;

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
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
                <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
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
                      "flex w-full items-center border-b border-border/50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/50",
                      selected?.ticker === q.ticker && "bg-brand-bronze-soft/60 hover:bg-brand-bronze-soft/60",
                    )}
                  >
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-card-foreground">
                          {q.assetClass === "fixed_income" ? q.name : q.ticker}
                        </p>
                        {q.assetClass === "fixed_income" && (q.coupon === 0 || (q.name || "").toLowerCase().includes("bill")) && (
                          <span className="rounded bg-brand-bronze/10 text-brand-bronze px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0">
                            Discount
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground font-mono mt-0.5">
                        {q.assetClass === "fixed_income"
                          ? q.ticker?.startsWith("GH") ? `ISIN: ${q.ticker}` : q.ticker
                          : q.name}
                      </p>
                    </div>
                    
                    <div className="mx-4 hidden w-16 shrink-0 sm:block">
                      <Sparkline
                        points={sparks[q.ticker] ?? []}
                        positive={q.changePct >= 0}
                      />
                    </div>

                    <div className="text-right shrink-0">
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
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-bold">
                      {selected.assetClass === "fixed_income" ? selected.name : selected.ticker}
                    </h2>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {selected.assetClass === "equity" ? "Equity" : "Fixed income"}
                    </span>
                    {selected.assetClass === "fixed_income" && (selected.coupon === 0 || (selected.name || "").toLowerCase().includes("bill")) && (
                      <span className="rounded bg-brand-bronze/10 text-brand-bronze px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                        Discount
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">
                    {selected.assetClass === "fixed_income"
                      ? selected.ticker?.startsWith("GH") ? `ISIN: ${selected.ticker}` : selected.ticker
                      : selected.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className={cn(
                    "h-10 w-10 shrink-0 rounded-full transition-colors",
                    isWatched ? "text-amber-500 border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20" : "text-muted-foreground hover:text-foreground"
                  )}
                  disabled={isUpdatingWatchlist || !profile}
                  onClick={() => toggleWatchlist(selected.ticker)}
                  title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
                >
                  {isUpdatingWatchlist ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Star className="h-5 w-5" fill={isWatched ? "currentColor" : "none"} />
                  )}
                </Button>
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
            </div>

            <div className="p-5">
              <PriceChart
                ticker={selected.ticker}
                instruments={
                  selected.assetClass === "equity"
                    ? quotes.filter((q) => q.assetClass === "equity")
                    : undefined
                }
              />

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
                      value={formatGHS(selected.minInvestment ?? 1, { cents: false })}
                    />
                  </>
                )}
              </div>

              <Button asChild size="lg" variant="premium" className="mt-6 w-full">
                <Link href={profile?.onboarded ? `/app/trade?ticker=${selected.ticker}` : "?kyc=true"}>
                  <ArrowLeftRight className="h-4 w-4" />
                  Trade {selected.assetClass === "fixed_income" ? selected.name : selected.ticker}
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
