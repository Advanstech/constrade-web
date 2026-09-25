"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Coins,
  Download,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  TrendingUp,
  Wallet,
  Building2,
  PieChart as PieIcon,
  BarChart3,
  Layers,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadError } from "@/components/layout/LoadError";
import { StatCard } from "@/components/market/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/api";
import type { AdminDashboardData } from "@/lib/api.types";
import { formatGHS } from "@/lib/format";
import { exportFinancialLedgerReport } from "@/lib/exportUtils";
import { PrintableStatementModal } from "@/components/reports/PrintableStatementModal";
import { FormattedExportModal } from "@/components/reports/FormattedExportModal";

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

const ASSET_COLORS = [
  "hsl(var(--brand-bronze))",
  "hsl(222 59% 45%)",
  "hsl(142 72% 36%)",
  "hsl(262 60% 52%)",
];

export default function FinancialReportPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    adminApi
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
        <LoadError message="Could not load financial report." onRetry={load} />
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const m = data.metrics;
  const secLevy = m.turnover * 0.0018; // 0.18%
  const gseLevy = m.turnover * 0.0022; // 0.22%
  const csdLevy = m.turnover * 0.0005; // 0.05%
  const netCommission = Math.max(m.revenue - (secLevy + gseLevy + csdLevy), 0);

  const volumeByClass = data.chart.volumeByClass;
  const pieData = volumeByClass.map((item, idx) => ({
    name: item.name,
    value: item.value,
    color: ASSET_COLORS[idx % ASSET_COLORS.length],
  }));

  const feeBreakdownData = [
    { name: "Gross Comm. (1.15%)", amount: m.revenue, fill: "hsl(var(--brand-bronze))" },
    { name: "GSE Levy (0.22%)", amount: gseLevy, fill: "hsl(222 59% 45%)" },
    { name: "SEC Levy (0.18%)", amount: secLevy, fill: "hsl(142 72% 36%)" },
    { name: "CSD Fee (0.05%)", amount: csdLevy, fill: "hsl(262 60% 52%)" },
    { name: "Net Retained Margin", amount: netCommission, fill: "hsl(38 92% 50%)" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/admin/reports" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Reports Hub
        </Link>
        <span>/</span>
        <span className="font-semibold text-foreground">Financial & Revenue Reconciliation</span>
      </div>

      <PageHeader
        title="Financial & Fee Reconciliation Report"
        subtitle="Detailed institutional audit of firm turnover, brokerage commissions, and regulatory statutory levies."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportFinancialLedgerReport(m, volumeByClass, "YTD 2026")}
              className="gap-1.5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-brand-bronze" /> Formatted CSV
            </Button>
            <Button
              size="sm"
              onClick={() => setPrintOpen(true)}
              className="bg-brand-bronze text-white hover:bg-brand-bronze-dark gap-1.5 shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" /> Printable Statement
            </Button>
          </div>
        }
      />

      {/* KPI Ribbon */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Gross Assets Under Management"
          value={formatGHS(m.aum, { compact: true })}
          hint="Cash reserves + custody securities"
          icon={<Wallet className="h-4 w-4 text-brand-bronze" />}
        />
        <StatCard
          label="Total Turnover (Filled)"
          value={formatGHS(m.turnover, { compact: true })}
          hint={`${m.filledOrders} matched market orders`}
          icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
        />
        <StatCard
          label="Gross Brokerage Revenue"
          value={formatGHS(m.revenue, { compact: true })}
          hint="≈ 1.15% standard commission rate"
          icon={<Coins className="h-4 w-4 text-brand-bronze" />}
        />
        <StatCard
          label="Net Retained Commission"
          value={formatGHS(netCommission, { compact: true })}
          hint="After statutory SEC/GSE/CSD levies"
          icon={<Building2 className="h-4 w-4 text-brand-navy dark:text-blue-400" />}
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Turnover by Asset Class */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <BarChart3 className="h-4 w-4 text-brand-bronze" /> Turnover Notional by Asset Class
            </CardTitle>
            <CardDescription className="text-xs">
              Distribution of trading volume across Ghana Stock Exchange equities, Treasury Bills, and GoG Bonds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeByClass} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v) => `₵${(v / 1_000_000).toFixed(1)}M`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val: number) => [formatGHS(Number(val)), "Turnover Notional"]}
                  />
                  <Bar dataKey="value" fill="hsl(var(--brand-bronze))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Class Composition */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <PieIcon className="h-4 w-4 text-brand-bronze" /> Asset Composition
            </CardTitle>
            <CardDescription className="text-xs">Relative volume percentage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val: number) => [formatGHS(Number(val)), "Turnover"]}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regulatory Reconciliation Ledger Table */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">Institutional Fee Reconciliation Ledger</CardTitle>
            <CardDescription className="text-xs">
              Itemized statutory fee allocation according to Securities Industry Act, 2016 (Act 929).
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportFinancialLedgerReport(m, volumeByClass, "YTD 2026")}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Export Ledger
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border/80">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3 border-b border-border/80">Fee Category / Description</th>
                  <th className="p-3 border-b border-border/80">Beneficiary Agency</th>
                  <th className="p-3 border-b border-border/80">Statutory Rate</th>
                  <th className="p-3 border-b border-border/80 text-right">Notional Sum (GHS)</th>
                  <th className="p-3 border-b border-border/80 text-right">Accounting Treatment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr className="hover:bg-muted/20">
                  <td className="p-3 font-semibold">Gross Trading Turnover</td>
                  <td className="p-3 text-muted-foreground">Market Clearing & Settlement</td>
                  <td className="p-3 text-muted-foreground font-mono">100.00%</td>
                  <td className="p-3 text-right font-mono font-bold">{formatGHS(m.turnover)}</td>
                  <td className="p-3 text-right text-xs text-muted-foreground">Gross Trading Basis</td>
                </tr>
                <tr className="hover:bg-muted/20">
                  <td className="p-3 font-medium">Constant Capital Brokerage Commission</td>
                  <td className="p-3 text-muted-foreground">Constant Capital Ghana Ltd</td>
                  <td className="p-3 text-muted-foreground font-mono">≈ 1.15%</td>
                  <td className="p-3 text-right font-mono font-semibold text-brand-bronze">{formatGHS(m.revenue)}</td>
                  <td className="p-3 text-right text-xs text-emerald-600 font-semibold">Firm Gross Revenue</td>
                </tr>
                <tr className="hover:bg-muted/20">
                  <td className="p-3 font-medium">Ghana Stock Exchange Transaction Levy</td>
                  <td className="p-3 text-muted-foreground">Ghana Stock Exchange (GSE)</td>
                  <td className="p-3 text-muted-foreground font-mono">0.22%</td>
                  <td className="p-3 text-right font-mono">{formatGHS(gseLevy)}</td>
                  <td className="p-3 text-right text-xs text-muted-foreground">Exchange Operating Levy</td>
                </tr>
                <tr className="hover:bg-muted/20">
                  <td className="p-3 font-medium">SEC Investor Protection & Regulatory Levy</td>
                  <td className="p-3 text-muted-foreground">Securities & Exchange Commission</td>
                  <td className="p-3 text-muted-foreground font-mono">0.18%</td>
                  <td className="p-3 text-right font-mono">{formatGHS(secLevy)}</td>
                  <td className="p-3 text-right text-xs text-muted-foreground">Statutory Regulatory Levy</td>
                </tr>
                <tr className="hover:bg-muted/20">
                  <td className="p-3 font-medium">Central Securities Depository Settlement Fee</td>
                  <td className="p-3 text-muted-foreground">Central Securities Depository (CSD)</td>
                  <td className="p-3 text-muted-foreground font-mono">0.05%</td>
                  <td className="p-3 text-right font-mono">{formatGHS(csdLevy)}</td>
                  <td className="p-3 text-right text-xs text-muted-foreground">Custody & Clearing Fee</td>
                </tr>
                <tr className="bg-muted/40 font-bold">
                  <td className="p-3 text-brand-bronze">Net Retained Firm Margin</td>
                  <td className="p-3 text-muted-foreground">Operating Retained Earnings</td>
                  <td className="p-3 text-brand-bronze font-mono">≈ 0.70%</td>
                  <td className="p-3 text-right font-mono text-brand-bronze">{formatGHS(netCommission)}</td>
                  <td className="p-3 text-right text-xs text-brand-bronze font-semibold">Retained Commission</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <PrintableStatementModal
        open={printOpen}
        onOpenChange={setPrintOpen}
        metrics={m}
        periodLabel="Year to Date 2026"
        reportType="financial"
      />

      <FormattedExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        dashboardData={data}
        orders={null}
        users={null}
        onOpenPrintStatement={() => setPrintOpen(true)}
      />
    </div>
  );
}
