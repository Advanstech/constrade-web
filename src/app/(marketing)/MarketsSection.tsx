"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkline } from "@/components/market/Sparkline";
import { MarketPerformance } from "@/components/market/MarketPerformance";
import { marketsApi } from "@/lib/api";
import type { Quote } from "@/lib/api.types";
import { changeBgClass, formatGHS, formatPercent } from "@/lib/format";

export function MarketsSection() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [sparks, setSparks] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    void marketsApi
      .instruments()
      .then(async (all) => {
        const sparkMap: Record<string, number[]> = {};
        await Promise.all(
          all.map((q) =>
            marketsApi.sparkline(q.ticker, 12).then((p) => {
              sparkMap[q.ticker] = p;
            }),
          ),
        );
        setQuotes(all);
        setSparks(sparkMap);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const equities = useMemo(() => quotes.filter((q) => q.assetClass === "equity"), [quotes]);
  const fixedIncome = useMemo(() => quotes.filter((q) => q.assetClass === "fixed_income"), [quotes]);

  const EquityTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Security</th>
            <th className="px-4 py-3 text-right">Last Price</th>
            <th className="px-4 py-3 text-right">Change</th>
            <th className="hidden px-4 py-3 text-right md:table-cell">Volume</th>
            <th className="hidden px-4 py-3 text-right sm:table-cell">Market Cap</th>
            <th className="hidden px-4 py-3 text-right lg:table-cell">Trend</th>
          </tr>
        </thead>
        <tbody>
          {equities.map((q) => (
            <tr key={q.ticker} className="border-b border-border/60 transition-colors hover:bg-muted/50">
              <td className="px-4 py-3">
                <p className="font-semibold text-card-foreground">{q.ticker}</p>
                <p className="text-xs text-muted-foreground">{q.name}</p>
              </td>
              <td className="px-4 py-3 text-right font-semibold text-card-foreground">
                {formatGHS(q.price)}
              </td>
              <td className="px-4 py-3 text-right">
                <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${changeBgClass(q.changePct)}`}>
                  {formatPercent(q.changePct)}
                </span>
              </td>
              <td className="hidden px-4 py-3 text-right text-muted-foreground md:table-cell">
                {q.volume.toLocaleString("en-GH")}
              </td>
              <td className="hidden px-4 py-3 text-right text-muted-foreground sm:table-cell">
                {formatGHS(q.marketCap ?? 0, { compact: true })}
              </td>
              <td className="hidden px-4 py-3 lg:table-cell">
                <div className="flex justify-end">
                  <Sparkline points={sparks[q.ticker] ?? []} positive={q.changePct >= 0} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const FiTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Instrument</th>
            <th className="px-4 py-3 text-right">Yield</th>
            <th className="px-4 py-3 text-right">Coupon</th>
            <th className="hidden px-4 py-3 text-right md:table-cell">Maturity</th>
            <th className="hidden px-4 py-3 text-right sm:table-cell">Min. Investment</th>
          </tr>
        </thead>
        <tbody>
          {fixedIncome.map((q) => (
            <tr key={q.ticker} className="border-b border-border/60 transition-colors hover:bg-muted/50">
              <td className="px-4 py-3">
                <p className="font-semibold text-card-foreground">{q.ticker}</p>
                <p className="text-xs text-muted-foreground">{q.name}</p>
              </td>
              <td className="px-4 py-3 text-right">
                <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${changeBgClass(q.changePct)}`}>
                  {q.yieldToMaturity?.toFixed(2)}%
                </span>
              </td>
              <td className="px-4 py-3 text-right text-card-foreground">
                {q.coupon && q.coupon > 0 ? `${q.coupon.toFixed(2)}%` : "—"}
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{q.maturity}</td>
              <td className="hidden px-4 py-3 text-right text-muted-foreground sm:table-cell">
                {formatGHS(q.minInvestment ?? 0, { cents: false })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section id="markets" className="bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-bronze">
              Market Data
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Track the Ghana Stock Exchange
            </h2>
            <p className="mt-3 max-w-xl text-base text-muted-foreground">
              Live equity quotes, treasury yields and bond data across Ghana&apos;s capital
              markets — refreshed daily.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button asChild variant="premium" size="sm">
              <Link href="/register">Start Trading</Link>
            </Button>
          </div>
        </div>

        <div className="mt-10 space-y-6">
          {/* Market performance chart module */}
          <MarketPerformance />

          {/* Instrument tables */}
          <div className="rounded-2xl border border-border bg-card shadow-card">
            <Tabs defaultValue="equities">
              <TabsList className="m-4 inline-flex h-auto w-auto gap-1 bg-muted/60 p-1">
                <TabsTrigger value="equities">Equities</TabsTrigger>
                <TabsTrigger value="fixed-income">Fixed Income</TabsTrigger>
              </TabsList>
              <TabsContent value="equities">
                <EquityTable />
              </TabsContent>
              <TabsContent value="fixed-income">
                <FiTable />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </section>
  );
}
