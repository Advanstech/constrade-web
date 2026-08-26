"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  ClipboardCheck,
  Coins,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadError } from "@/components/layout/LoadError";
import { StatCard } from "@/components/market/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/api";
import type { AdminDashboardData } from "@/lib/api.types";
import { changeBgClass, formatDateTime, formatGHS, shortId, statusClass, statusLabel } from "@/lib/format";

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

const AdminDashboard = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    void adminApi
      .dashboard()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <LoadError message="We couldn't load the analytics. Please try again." onRetry={load} />
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-9 w-72" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="mt-6 h-80" />
      </div>
    );
  }

  const m = data.metrics;
  const growth = data.chart.monthLabels.map((label, i) => ({
    month: label,
    clients: data.chart.clientGrowth[i] ?? 0,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Staff analytics"
        subtitle="Firm-wide overview across clients, orders and assets."
        actions={
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assets under management" value={formatGHS(m.aum, { compact: true })} icon={<Wallet className="h-4 w-4 text-brand-bronze" />} />
        <StatCard label="Total clients" value={String(m.totalClients)} hint={`+${m.newClients30d} this month`} icon={<Users className="h-4 w-4 text-brand-bronze" />} />
        <StatCard label="Pending approvals" value={String(m.pendingApprovals)} icon={<ClipboardCheck className="h-4 w-4 text-brand-bronze" />} />
        <StatCard label="Est. revenue (fees)" value={formatGHS(m.revenue, { compact: true })} icon={<Coins className="h-4 w-4 text-brand-bronze" />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Client growth */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <TrendingUp className="h-4 w-4 text-brand-bronze" /> Client growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growth} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="clients"
                    stroke="hsl(var(--brand-bronze))"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "hsl(var(--brand-bronze))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Volume by class */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Volume by asset class</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chart.volumeByClass} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="value"
                    fill="hsl(var(--brand-bronze))"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Market summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Market snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {[
              { label: "GSE Composite", value: data.market.gseComposite.toFixed(2), change: data.market.gseChangePct },
              { label: "USD/GHS", value: data.market.usdGhs.toFixed(4), change: data.market.usdGhsChangePct },
              { label: "91-Day T-Bill", value: `${data.market.tbill91.toFixed(2)}%`, change: data.market.tbill91ChangePct },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 px-3.5 py-2.5">
                <span className="text-xs text-muted-foreground">{r.label}</span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{r.value}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${changeBgClass(r.change)}`}>
                    {r.change > 0 ? "+" : ""}{r.change.toFixed(2)}%
                  </span>
                </span>
              </div>
            ))}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div>
                <p className="text-lg font-bold text-success">{data.market.advancers}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Up</p>
              </div>
              <div>
                <p className="text-lg font-bold text-danger">{data.market.decliners}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Down</p>
              </div>
              <div>
                <p className="text-lg font-bold">{data.market.activeStocks}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Latest orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-bold">Latest orders</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-brand-bronze">
              <Link href="/admin/orders">
                Review <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-6 py-3">Order</th>
                    <th className="px-4 py-3">Instrument</th>
                    <th className="px-4 py-3">Side</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="hidden px-4 py-3 text-right sm:table-cell">Placed</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.latestOrders.map((o) => (
                    <tr key={o.id} className="border-b border-border/60 hover:bg-muted/40">
                      <td className="px-6 py-3 font-mono text-xs text-muted-foreground">#{shortId(o.id)}</td>
                      <td className="px-4 py-3 font-semibold">{o.instrument}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${o.side === "buy" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                          {o.side}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{o.quantity}</td>
                      <td className="hidden px-4 py-3 text-right text-muted-foreground sm:table-cell">
                        {formatDateTime(o.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${statusClass(o.status)}`}>
                          {statusLabel(o.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
