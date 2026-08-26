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
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/market/StatCard";
import { Sparkline } from "@/components/market/Sparkline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { accountApi, marketsApi, tradingApi } from "@/lib/api";
import { useAuth } from "@/auth/AuthProvider";
import type { Order, Portfolio } from "@/lib/api.types";
import { changeBgClass, formatDate, formatGHS, shortId, statusClass, statusLabel } from "@/lib/format";

const ClientDashboard = () => {
  const { profile } = useAuth();
  const kycApproved = profile?.kyc_status === "approved";
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sparks, setSparks] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void Promise.all([
      accountApi.portfolio(),
      tradingApi.myOrders(),
      marketsApi.sparkline("MTNGH", 30),
    ])
      .then(([p, o, spark]) => {
        if (!alive) return;
        setPortfolio(p);
        setOrders(o.slice(0, 5));
        setSparks({ MTNGH: spark });
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
                Complete your KYC to start trading
              </p>
              <p className="text-xs text-muted-foreground">
                Finish the CSD account opening wizard to unlock order placement on the Ghana
                Stock Exchange.
              </p>
            </div>
          </div>
          <Button asChild variant="premium" size="sm" className="shrink-0">
            <Link href="/register/onboarding">
              Continue <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
      <PageHeader
        title="Good day, Investor"
        subtitle="Here's how your portfolio is performing today."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/funding">
                <Wallet className="h-4 w-4" /> Fund
              </Link>
            </Button>
            <Button asChild variant="premium" size="sm">
              <Link href="/app/trade">
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

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Holdings */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
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
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.holdings.slice(0, 5).map((h) => (
                      <tr key={h.instrument} className="border-b border-border/60 hover:bg-muted/40">
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent orders */}
        <Card>
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
  );
};

export default ClientDashboard;
