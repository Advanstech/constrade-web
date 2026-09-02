"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowLeftRight, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
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

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Allocation */}
        <Card>
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
                        {data.allocation.map((a) => (
                          <Cell key={a.label} fill={a.color} />
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
                <div className="mt-4 space-y-2">
                  {data.allocation.map((a) => (
                    <div key={a.label} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
                        {a.label}
                      </span>
                      <span className="font-semibold">{formatGHS(a.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Holdings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold">Holdings</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.holdings.length === 0 ? (
              <p className="px-6 pb-10 text-center text-sm text-muted-foreground">
                You don't hold any securities yet. Browse the market to place your first order.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-6 py-3">Instrument</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Avg cost</th>
                      <th className="hidden px-4 py-3 text-right sm:table-cell">Price</th>
                      <th className="px-4 py-3 text-right">Market value</th>
                      <th className="px-4 py-3 text-right">P/L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.holdings.slice((page - 1) * itemsPerPage, page * itemsPerPage)).map((h) => (
                      <tr key={h.instrument} className="border-b border-border/60 hover:bg-muted/40">
                        <td className="px-6 py-3.5">
                          <p className="font-semibold">{h.instrument}</p>
                        </td>
                        <td className="px-4 py-3.5 text-right">{h.quantity}</td>
                        <td className="px-4 py-3.5 text-right">{formatGHS(h.avgPrice)}</td>
                        <td className="hidden px-4 py-3.5 text-right sm:table-cell">{formatGHS(h.marketPrice)}</td>
                        <td className="px-4 py-3.5 text-right font-semibold">{formatGHS(h.marketValue)}</td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={changeBgClass(h.pl)}>{formatGHS(h.pl)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {data.holdings.length > itemsPerPage && (
              <div className="flex items-center justify-between border-t border-border p-4 text-sm">
                <span className="text-muted-foreground">
                  Page {page} of {Math.ceil(data.holdings.length / itemsPerPage)}
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
                    disabled={page === Math.ceil(data.holdings.length / itemsPerPage)}
                    onClick={() => setPage((p) => Math.min(Math.ceil(data.holdings.length / itemsPerPage), p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PortfolioPage;
