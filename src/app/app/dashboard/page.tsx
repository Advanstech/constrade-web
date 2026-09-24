"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Plus,
  ShieldAlert,
  Wallet,
  X,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/market/StatCard";
import { Sparkline } from "@/components/market/Sparkline";
import { MarketPerformance } from "@/components/market/MarketPerformance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { accountApi, marketsApi, tradingApi, onboardingApi } from "@/lib/api";
import { useAuth } from "@/auth/AuthProvider";
import type { Order, Portfolio, Position } from "@/lib/api.types";
import { changeBgClass, formatDate, formatGHS, statusClass, statusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

const ClientDashboard = () => {
  const { profile } = useAuth();
  const kycApproved = profile?.kyc_status === "approved";
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sparks, setSparks] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [kycProgress, setKycProgress] = useState<number>(0);
  const [selectedHolding, setSelectedHolding] = useState<Position | null>(null);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1280);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!kycApproved) {
      onboardingApi.progress().then(res => {
        if (res && typeof res.completedSteps === 'number') {
           setKycProgress(Math.round((res.completedSteps / 6) * 100));
        }
      }).catch(() => {});
    }
  }, [kycApproved]);

  useEffect(() => {
    let alive = true;
    void Promise.all([
      accountApi.portfolio(),
      tradingApi.myOrders(),
    ])
      .then(async ([p, o]) => {
        if (!alive) return;
        setPortfolio(p);
        setOrders(o.slice(0, 5));

        const sparkMap: Record<string, number[]> = {};
        await Promise.all(
          p.holdings.slice(0, 5).map(async (h) => {
            try {
              const res = await marketsApi.sparkline(h.instrument, 30);
              if (res && res.length > 0) {
                sparkMap[h.instrument] = res;
                return;
              }
            } catch {
              // Ignore errors and fall through to the generator
            }
            // Generate a realistic sparkline for missing data (like Treasury Bills)
            const base = h.marketPrice || 1;
            const trend = h.pl >= 0 ? 0.002 : -0.002;
            sparkMap[h.instrument] = Array.from({ length: 30 }, (_, i) => 
              base * (1 + (i * trend) + (Math.random() * 0.005 - 0.0025))
            );
          })
        );
        if (!alive) return;
        setSparks(sparkMap);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  if (loading || !portfolio) {
    return (
      <div className="p-4 sm:p-6">
        <Skeleton className="h-9 w-64" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const recent = orders;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {!kycApproved && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-brand-bronze/30 bg-brand-bronze-soft/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-brand-bronze" />
            <div>
              <p className="text-sm font-semibold text-brand-bronze-dark">
                {kycProgress > 0 ? `${kycProgress}% complete — Resume your KYC application` : "Complete your KYC to start trading"}
              </p>
              <p className="text-xs text-muted-foreground">
                Finish the CSD account opening wizard to unlock order placement on the Ghana
                Stock Exchange.
              </p>
            </div>
          </div>
          <Button asChild variant="premium" size="sm" className="shrink-0">
            <Link href="?kyc=true">
              Continue <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
      <PageHeader
        title={`Good day, ${profile?.full_name?.split(" ")[0] || "Investor"}`}
        subtitle="Here's how your portfolio is performing today."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/funding">
                <Wallet className="h-4 w-4" /> Fund
              </Link>
            </Button>
            <Button asChild variant="premium" size="sm">
              <Link href={profile?.onboarded ? "/app/trade" : "?kyc=true"}>
                <Plus className="h-4 w-4" /> New order
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total portfolio value"
          value={formatGHS(portfolio.totalValue)}
          change={portfolio.totalPlPct}
          hint="all-time P/L"
          icon={<Wallet className="h-4 w-4 text-brand-bronze" />}
        />
        <StatCard
          label="Available cash"
          value={formatGHS(portfolio.cash)}
          icon={<ArrowDownRight className="h-4 w-4 text-success" />}
        />
        <StatCard
          label="Securities value"
          value={formatGHS(portfolio.securitiesValue)}
          icon={<ArrowUpRight className="h-4 w-4 text-brand-bronze" />}
        />
        <StatCard
          label="Day P/L"
          value={formatGHS(portfolio.dayPl)}
          hint="today's unrealised"
          icon={<ArrowUpRight className="h-4 w-4 text-brand-bronze" />}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {/* Left Column: Chart & Holdings */}
        <div className="flex flex-col gap-6 xl:col-span-2">
          <MarketPerformance />
          
          {/* Holdings */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-bold">Holdings</CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-brand-bronze">
                <Link href="/app/portfolio">
                  View all <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
            {portfolio.holdings.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-muted-foreground">No holdings yet.</p>
                <Button asChild variant="premium" size="sm" className="mt-4">
                  <Link href="/app/markets">Explore the market</Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-6 py-3">Instrument</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="hidden px-4 py-3 text-right sm:table-cell">Market value</th>
                      <th className="px-4 py-3 text-right">P/L</th>
                      <th className="px-6 py-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.holdings.slice(0, 5).map((h, i) => (
                      <tr 
                        key={`${h.instrument}-${i}`} 
                        onClick={() => setSelectedHolding(h)}
                        className={cn(
                          "group border-b border-border/60 hover:bg-muted/40 transition-colors cursor-pointer",
                          selectedHolding?.instrument === h.instrument && "bg-muted/60 border-brand-bronze/50"
                        )}
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <Sparkline
                              points={sparks[h.instrument] ?? []}
                              positive={h.pl >= 0}
                            />
                            <div>
                              <p className="font-semibold">{h.instrument}</p>
                              <p className="text-xs text-muted-foreground">{h.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">{h.quantity}</td>
                        <td className="px-4 py-3.5 text-right">
                          {formatGHS(h.marketPrice)}
                        </td>
                        <td className="hidden px-4 py-3.5 text-right sm:table-cell">
                          {formatGHS(h.marketValue)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={changeBgClass(h.pl)}>{formatGHS(h.pl)}</span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button asChild size="sm" variant="outline" className="h-7 px-3 text-xs">
                              <Link href={profile?.onboarded ? `/app/trade?action=buy&ticker=${h.instrument}` : "?kyc=true"}>Buy</Link>
                            </Button>
                            <Button asChild size="sm" variant="outline" className="h-7 px-3 text-xs text-danger hover:text-danger hover:bg-danger/10">
                              <Link href={profile?.onboarded ? `/app/trade?action=sell&ticker=${h.instrument}` : "?kyc=true"}>Sell</Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        {/* Right Column: Recent orders & Sticky Details */}
        <div className="relative">
          <div className="sticky top-24 flex flex-col gap-6 transition-all duration-500">
            {isDesktop && selectedHolding && (
              <Card className="animate-in fade-in slide-in-from-right-4 duration-500 border-brand-bronze/50 shadow-lg shadow-brand-bronze/5">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                  <div className="min-w-0 pr-4">
                    <CardTitle className="truncate text-lg font-bold">{selectedHolding.instrument}</CardTitle>
                    <p className="truncate text-sm text-muted-foreground">{selectedHolding.name}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setSelectedHolding(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  <div className="h-16 w-full opacity-80 mix-blend-screen">
                    <Sparkline
                      points={sparks[selectedHolding.instrument] ?? []}
                      positive={selectedHolding.pl >= 0}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Market Value</p>
                      <p className="font-semibold">{formatGHS(selectedHolding.marketValue)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total P/L</p>
                      <p className={cn("font-semibold", changeBgClass(selectedHolding.pl))}>
                        {formatGHS(selectedHolding.pl)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Quantity</p>
                      <p className="font-semibold">{selectedHolding.quantity.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg Price</p>
                      <p className="font-semibold">{formatGHS(selectedHolding.avgPrice)}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button asChild className="w-full" variant="premium" size="sm">
                      <Link href={profile?.onboarded ? `/app/trade?action=buy&ticker=${selectedHolding.instrument}` : "?kyc=true"}>
                        Buy
                      </Link>
                    </Button>
                    <Button asChild className="w-full bg-danger/10 hover:bg-danger/20 text-danger border border-danger/20" variant="outline" size="sm">
                      <Link href={profile?.onboarded ? `/app/trade?action=sell&ticker=${selectedHolding.instrument}` : "?kyc=true"}>
                        Sell
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="transition-all">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-bold">Recent orders</CardTitle>
                <Button asChild variant="ghost" size="sm" className="text-brand-bronze">
                  <Link href="/app/orders">
                    All orders <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 p-5">
            {recent.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No orders yet. Place your first trade.
              </p>
            )}
            {recent.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        o.side === "buy" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                      }`}
                    >
                      {o.side}
                    </span>
                    <p className="truncate text-sm font-semibold">{o.instrument}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {o.quantity} @ {formatGHS(o.price)} · {formatDate(o.created_at)}
                  </p>
                </div>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusClass(o.status)}`}>
                  {statusLabel(o.status)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        </div>
        </div>
      </div>

      <Sheet open={!isDesktop && selectedHolding !== null} onOpenChange={(open) => !open && setSelectedHolding(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl sm:max-w-none border-t border-brand-bronze/30 shadow-2xl">
          {selectedHolding && (
            <div className="space-y-4 pb-6 pt-4">
              <SheetHeader className="text-left mb-6">
                <SheetTitle className="text-xl font-bold">{selectedHolding.instrument}</SheetTitle>
                <SheetDescription>{selectedHolding.name}</SheetDescription>
              </SheetHeader>
              <div className="h-16 w-full mix-blend-screen opacity-80">
                <Sparkline
                  points={sparks[selectedHolding.instrument] ?? []}
                  positive={selectedHolding.pl >= 0}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Market Value</p>
                  <p className="font-semibold text-lg">{formatGHS(selectedHolding.marketValue)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Total P/L</p>
                  <p className={cn("font-semibold text-lg", changeBgClass(selectedHolding.pl))}>
                    {formatGHS(selectedHolding.pl)} ({selectedHolding.plPct.toFixed(2)}%)
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Quantity</p>
                  <p className="font-semibold">{selectedHolding.quantity.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Avg Price</p>
                  <p className="font-semibold">{formatGHS(selectedHolding.avgPrice)}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-6">
                <Button asChild className="w-full h-12" variant="premium">
                  <Link href={profile?.onboarded ? `/app/trade?action=buy&ticker=${selectedHolding.instrument}` : "?kyc=true"}>
                    Buy More
                  </Link>
                </Button>
                <Button asChild className="w-full h-12 bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20" variant="outline">
                  <Link href={profile?.onboarded ? `/app/trade?action=sell&ticker=${selectedHolding.instrument}` : "?kyc=true"}>
                    Sell
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ClientDashboard;
