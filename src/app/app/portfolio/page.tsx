"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowLeftRight, Wallet, Search, TrendingUp, BarChart3, Clock, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/market/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { accountApi } from "@/lib/api";
import type { Portfolio } from "@/lib/api.types";
import { changeBgClass, formatGHS } from "@/lib/format";

const PortfolioPage = () => {
  const [data, setData] = useState<Portfolio | null>(null);
  const [page, setPage] = useState(1);
  const [activeSlice, setActiveSlice] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 10;

  useEffect(() => {
    void accountApi.portfolio().then(setData);
  }, []);

  if (!data) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-9 w-64" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="mt-6 h-96" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Portfolio"
        subtitle="Your holdings across equities and fixed income."
        actions={
          <Button asChild variant="premium" size="sm">
            <Link href="/app/trade">
              <ArrowLeftRight className="h-4 w-4" /> Trade
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total value" value={formatGHS(data.totalValue)} icon={<Wallet className="h-4 w-4 text-brand-bronze" />} />
        <StatCard label="Cash" value={formatGHS(data.cash)} />
        <StatCard
          label="Total P/L"
          value={formatGHS(data.totalPl)}
          change={data.totalPlPct}
          hint="all-time"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3 items-start">
        {/* Allocation */}
        <Card className="sticky top-20 z-10 shadow-sm border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-bold">Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            {data.allocation.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                No assets yet — your balance is held in cash.
              </p>
            ) : (
              <>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.allocation}
                        dataKey="value"
                        nameKey="label"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        stroke="hsl(var(--card))"
                      >
                        {data.allocation.map((a, i) => (
                          <Cell 
                            key={`${a.label}-${i}`} 
                            fill={a.color}
                            style={{
                              outline: 'none',
                              opacity: activeSlice === null || activeSlice === i ? 1 : 0.25,
                              cursor: 'pointer',
                              filter: activeSlice === i ? `drop-shadow(0 0 8px ${a.color}90)` : 'none',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                            onMouseEnter={() => setActiveSlice(i)}
                            onMouseLeave={() => setActiveSlice(null)}
                            onClick={() => setActiveSlice(activeSlice === i ? null : i)}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => formatGHS(Number(v))}
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-1">
                  {data.allocation.map((a, i) => (
                    <div 
                      key={`${a.label}-${i}`} 
                      className={cn(
                        "flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-300 ease-out",
                        activeSlice === i 
                          ? "bg-muted shadow-sm ring-1 ring-border/50 translate-x-1" 
                          : activeSlice !== null 
                            ? "opacity-30 grayscale saturate-0"
                            : "hover:bg-muted/40"
                      )}
                      onMouseEnter={() => setActiveSlice(i)}
                      onMouseLeave={() => setActiveSlice(null)}
                      onClick={() => setActiveSlice(activeSlice === i ? null : i)}
                    >
                      <span className={cn(
                        "flex items-center gap-2.5 transition-colors duration-300",
                        activeSlice === i ? "text-foreground font-semibold" : "text-muted-foreground"
                      )}>
                        <span 
                          className={cn(
                            "h-2.5 w-2.5 rounded-full transition-all duration-300",
                            activeSlice === i && "scale-[1.4] ring-[3px] ring-background shadow-sm"
                          )}
                          style={{ 
                            background: a.color, 
                            boxShadow: activeSlice === i ? `0 0 10px ${a.color}` : undefined 
                          }} 
                        />
                        {a.label}
                      </span>
                      <span className={cn(
                        "font-semibold transition-colors duration-300 tracking-tight",
                        activeSlice === i ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {formatGHS(a.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Holdings */}
        <Card className="lg:col-span-2 shadow-sm border-border/60">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-brand-bronze" /> 
              Your Holdings
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search instrument..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1); // Reset page on search
                }}
                className="h-9 w-full sm:w-64 rounded-md border border-input bg-transparent pl-9 pr-4 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-bronze"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.holdings.length === 0 ? (
              <p className="px-6 pb-10 text-center text-sm text-muted-foreground">
                You don't hold any securities yet. Browse the market to place your first order.
              </p>
            ) : (() => {
              const filteredHoldings = data.holdings.filter(h => 
                h.instrument.toLowerCase().includes(searchQuery.toLowerCase())
              );
              
              if (filteredHoldings.length === 0) {
                return (
                  <div className="py-12 text-center">
                    <p className="text-sm text-muted-foreground">No holdings match your search.</p>
                    <Button variant="link" onClick={() => setSearchQuery("")} className="mt-2">Clear search</Button>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/20 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="px-6 py-3">Instrument</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3 text-right">Avg cost</th>
                        <th className="hidden px-4 py-3 text-right sm:table-cell">Mkt Price</th>
                        <th className="px-4 py-3 text-right">Market value</th>
                        <th className="px-4 py-3 text-right">P/L</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {(filteredHoldings.slice((page - 1) * itemsPerPage, page * itemsPerPage)).map((h, i) => (
                        <tr key={`${h.instrument}-${i}`} className="group hover:bg-muted/40 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-foreground">{h.instrument}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Updated recently
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right font-mono text-xs">
                            {Number(h.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-4 text-right font-medium">{formatGHS(h.avgPrice)}</td>
                          <td className="hidden px-4 py-4 text-right sm:table-cell text-muted-foreground">{formatGHS(h.marketPrice)}</td>
                          <td className="px-4 py-4 text-right font-bold text-foreground">{formatGHS(h.marketValue)}</td>
                          <td className="px-4 py-4 text-right">
                            <span className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                              h.pl > 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                              h.pl < 0 ? "bg-red-500/10 text-red-600 dark:text-red-400" :
                              "bg-muted text-muted-foreground"
                            )}>
                              {h.pl > 0 ? <TrendingUp className="h-3 w-3" /> : null}
                              {formatGHS(h.pl)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <Button asChild variant="ghost" size="sm" className="h-8 text-xs font-semibold hover:text-brand-bronze opacity-0 group-hover:opacity-100 transition-opacity">
                              <Link href={`/app/trade?symbol=${encodeURIComponent(h.instrument)}`}>
                                Trade <ChevronRight className="ml-1 h-3 w-3" />
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {filteredHoldings.length > itemsPerPage && (
                    <div className="flex items-center justify-between border-t border-border/60 p-4 text-sm bg-muted/10">
                      <span className="text-muted-foreground font-medium">
                        Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filteredHoldings.length)} of {filteredHoldings.length}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page === 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page === Math.ceil(filteredHoldings.length / itemsPerPage)}
                          onClick={() => setPage((p) => Math.min(Math.ceil(filteredHoldings.length / itemsPerPage), p + 1))}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PortfolioPage;
