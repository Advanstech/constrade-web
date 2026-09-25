"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Coins,
  Download,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Wallet,
  Building2,
  PieChart as PieIcon,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CreditCard,
  Banknote
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/api";
import type { AdminDashboardData, Transaction } from "@/lib/api.types";
import { formatGHS } from "@/lib/format";
import { exportFinancialLedgerReport } from "@/lib/exportUtils";
import { PrintableStatementModal } from "@/components/reports/PrintableStatementModal";
import { FormattedExportModal } from "@/components/reports/FormattedExportModal";
import { format, parseISO } from "date-fns";

const tooltipStyle = {
  background: "hsl(var(--popover) / 0.9)",
  backdropFilter: "blur(8px)",
  border: "1px solid hsl(var(--border) / 0.5)",
  borderRadius: "12px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
};

const ASSET_COLORS = [
  "hsl(var(--brand-bronze))",
  "hsl(222 59% 45%)",
  "hsl(142 72% 36%)",
  "hsl(262 60% 52%)",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } },
};

export default function FinancialReportPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    Promise.all([
      adminApi.dashboard(),
      adminApi.transactions().catch(() => [])
    ])
      .then(([dashData, txs]) => {
        setData(dashData);
        setTransactions(txs);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const flowData = useMemo(() => {
    if (!transactions.length) return [];
    
    // Group transactions by date (YYYY-MM-DD)
    const grouped = transactions.reduce((acc, tx) => {
      if (tx.status.toLowerCase() !== "completed") return acc;
      const date = tx.created_at ? tx.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
      if (!acc[date]) {
        acc[date] = { date, deposits: 0, withdrawals: 0 };
      }
      if (tx.type === "deposit") acc[date].deposits += Number(tx.amount || 0);
      if (tx.type === "withdraw") acc[date].withdrawals += Number(tx.amount || 0);
      return acc;
    }, {} as Record<string, { date: string; deposits: number; withdrawals: number }>);
    
    // Sort by date and take last 30 days if available
    return Object.values(grouped)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        ...d,
        label: format(parseISO(d.date), "MMM dd")
      }))
      .slice(-30);
  }, [transactions]);

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
  
  const totalDeposits = transactions.filter(t => t.type === 'deposit' && t.status.toLowerCase() === 'completed').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalWithdrawals = transactions.filter(t => t.type === 'withdraw' && t.status.toLowerCase() === 'completed').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const netLiquidityFlow = totalDeposits - totalWithdrawals;

  const volumeByClass = data.chart.volumeByClass;
  const pieData = volumeByClass.map((item, idx) => ({
    name: item.name,
    value: item.value,
    color: ASSET_COLORS[idx % ASSET_COLORS.length],
  }));

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants}
      className="p-4 sm:p-6 lg:p-8 space-y-8"
    >
      {/* Breadcrumb & Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <Link href="/admin/reports" className="hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Reports Hub
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground">Financial Intelligence & Accounting</span>
        </div>

        <PageHeader
          title={
            <div className="flex items-center gap-3">
              <span className="bg-gradient-to-r from-brand-bronze to-amber-500 bg-clip-text text-transparent">
                Financial Intelligence
              </span>
              <span className="rounded-full bg-brand-bronze/10 px-2.5 py-0.5 text-xs font-semibold text-brand-bronze border border-brand-bronze/20">
                Premium
              </span>
            </div>
          }
          subtitle="Advanced institutional accounting, cash flow analytics, and statutory fee reconciliation."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={load} className="gap-1.5 shadow-sm rounded-full bg-background/50 backdrop-blur-sm border-border/60 hover:bg-muted/50">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportFinancialLedgerReport(m, volumeByClass, "YTD 2026")}
                className="gap-1.5 shadow-sm rounded-full bg-background/50 backdrop-blur-sm border-border/60 hover:bg-muted/50 text-brand-bronze"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Export Ledger
              </Button>
              <Button
                size="sm"
                onClick={() => setPrintOpen(true)}
                className="bg-brand-bronze text-white hover:bg-brand-bronze-dark gap-1.5 shadow-md shadow-brand-bronze/20 rounded-full"
              >
                <Printer className="h-3.5 w-3.5" /> Statement
              </Button>
            </div>
          }
        />
      </motion.div>

      {/* Premium KPI Ribbon */}
      <motion.div variants={itemVariants} className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <PremiumStatCard
          label="Total AUM"
          value={formatGHS(m.aum, { compact: true })}
          hint="Assets under management"
          icon={<Wallet className="h-5 w-5 text-indigo-500" />}
          gradient="from-indigo-500/10 via-indigo-500/5 to-transparent"
        />
        <PremiumStatCard
          label="Gross Brokerage Rev."
          value={formatGHS(m.revenue, { compact: true })}
          hint="1.15% average fee structure"
          icon={<Coins className="h-5 w-5 text-amber-500" />}
          gradient="from-amber-500/10 via-amber-500/5 to-transparent"
        />
        <PremiumStatCard
          label="Net Retained Margin"
          value={formatGHS(netCommission, { compact: true })}
          hint="Post statutory levies (SEC/GSE/CSD)"
          icon={<Building2 className="h-5 w-5 text-emerald-500" />}
          gradient="from-emerald-500/10 via-emerald-500/5 to-transparent"
        />
        <PremiumStatCard
          label="Net Liquidity Flow"
          value={formatGHS(Math.abs(netLiquidityFlow), { compact: true })}
          hint={netLiquidityFlow >= 0 ? "Positive cash flow" : "Negative cash flow"}
          icon={netLiquidityFlow >= 0 ? <ArrowUpRight className="h-5 w-5 text-cyan-500" /> : <ArrowDownRight className="h-5 w-5 text-rose-500" />}
          gradient={netLiquidityFlow >= 0 ? "from-cyan-500/10 via-cyan-500/5 to-transparent" : "from-rose-500/10 via-rose-500/5 to-transparent"}
        />
      </motion.div>

      {/* Cash Flow Flows Area Chart */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-lg border-border/40 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-muted/20 pointer-events-none" />
          <CardHeader className="relative z-10 border-b border-border/40 bg-card/50 backdrop-blur-md pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <Activity className="h-5 w-5 text-brand-bronze" /> Firm Liquidity Flows
                </CardTitle>
                <CardDescription className="text-sm mt-1">
                  Daily net cash flows (deposits vs. withdrawals) across client wallets.
                </CardDescription>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500" />
                  <span className="text-muted-foreground font-medium">Deposits</span>
                  <span className="font-bold text-foreground ml-1">{formatGHS(totalDeposits, { compact: true })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500" />
                  <span className="text-muted-foreground font-medium">Withdrawals</span>
                  <span className="font-bold text-foreground ml-1">{formatGHS(totalWithdrawals, { compact: true })}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 pt-6">
            <div className="h-80">
              {flowData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={flowData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                    <defs>
                      <linearGradient id="colorDep" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142 72% 29%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(142 72% 29%)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorWith" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(346 87% 43%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(346 87% 43%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(var(--border) / 0.5)" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} dy={10} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `₵${(v / 1000).toFixed(0)}k`}
                      dx={-10}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '4 4' }}
                      formatter={(val: number, name: string) => [formatGHS(Number(val)), name.charAt(0).toUpperCase() + name.slice(1)]}
                    />
                    <Area type="monotone" dataKey="deposits" stroke="hsl(142 72% 45%)" strokeWidth={3} fillOpacity={1} fill="url(#colorDep)" />
                    <Area type="monotone" dataKey="withdrawals" stroke="hsl(346 87% 55%)" strokeWidth={3} fillOpacity={1} fill="url(#colorWith)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
                  <CreditCard className="h-8 w-8 mb-2 opacity-20" />
                  <p>No settled flow data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Secondary Charts Section */}
      <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-3">
        {/* Turnover by Asset Class */}
        <Card className="lg:col-span-2 shadow-card border-border/40 overflow-hidden">
          <CardHeader className="bg-muted/10 border-b border-border/30">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <BarChart3 className="h-4 w-4 text-brand-bronze" /> Traded Volume Composition
            </CardTitle>
            <CardDescription className="text-xs">
              Distribution of trading volume across asset classes.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeByClass} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                  <CartesianGrid stroke="hsl(var(--border) / 0.5)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} dy={10} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₵${(v / 1_000_000).toFixed(1)}M`}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
                    formatter={(val: number) => [formatGHS(Number(val)), "Turnover Notional"]}
                  />
                  <Bar dataKey="value" fill="hsl(var(--brand-bronze))" radius={[6, 6, 0, 0]}>
                    {volumeByClass.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ASSET_COLORS[index % ASSET_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Class Composition */}
        <Card className="shadow-card border-border/40 overflow-hidden">
          <CardHeader className="bg-muted/10 border-b border-border/30">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <PieIcon className="h-4 w-4 text-brand-bronze" /> Asset Relativity
            </CardTitle>
            <CardDescription className="text-xs">Relative volume percentage</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val: number) => [formatGHS(Number(val)), "Turnover"]}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11, paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Regulatory Reconciliation Ledger Table */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-lg border-border/40 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-muted/30 to-muted/10 border-b border-border/40">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Banknote className="h-5 w-5 text-brand-bronze" />
                Operating Ledger & Statutory Reconciliation
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Itemized statutory fee allocation according to Securities Industry Act, 2016 (Act 929).
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportFinancialLedgerReport(m, volumeByClass, "YTD 2026")}
              className="gap-1.5 rounded-full border-border/60 hover:bg-muted bg-background/50 backdrop-blur-sm"
            >
              <Download className="h-3.5 w-3.5 text-brand-bronze" /> Export Matrix
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  <tr>
                    <th className="p-4 border-b border-border/40">Fee Category / Description</th>
                    <th className="p-4 border-b border-border/40">Beneficiary Agency</th>
                    <th className="p-4 border-b border-border/40">Statutory Rate</th>
                    <th className="p-4 border-b border-border/40 text-right">Notional Sum (GHS)</th>
                    <th className="p-4 border-b border-border/40 text-right">Accounting Treatment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  <tr className="hover:bg-muted/20 transition-colors group">
                    <td className="p-4 font-semibold text-foreground">Gross Trading Turnover</td>
                    <td className="p-4 text-muted-foreground text-xs">Market Clearing & Settlement</td>
                    <td className="p-4 text-muted-foreground font-mono text-xs bg-muted/20 rounded-md w-max">100.00%</td>
                    <td className="p-4 text-right font-mono font-bold text-[15px]">{formatGHS(m.turnover)}</td>
                    <td className="p-4 text-right text-xs text-muted-foreground">Gross Trading Basis</td>
                  </tr>
                  <tr className="hover:bg-muted/20 transition-colors group">
                    <td className="p-4 font-medium text-foreground">Constant Capital Brokerage Commission</td>
                    <td className="p-4 text-muted-foreground text-xs">Constant Capital Ghana Ltd</td>
                    <td className="p-4 text-muted-foreground font-mono text-xs">≈ 1.15%</td>
                    <td className="p-4 text-right font-mono font-semibold text-brand-bronze text-[15px]">{formatGHS(m.revenue)}</td>
                    <td className="p-4 text-right"><span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">Firm Gross Revenue</span></td>
                  </tr>
                  <tr className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-medium text-foreground">Ghana Stock Exchange Transaction Levy</td>
                    <td className="p-4 text-muted-foreground text-xs">Ghana Stock Exchange (GSE)</td>
                    <td className="p-4 text-muted-foreground font-mono text-xs">0.22%</td>
                    <td className="p-4 text-right font-mono text-rose-500/90">{formatGHS(gseLevy)}</td>
                    <td className="p-4 text-right text-xs text-muted-foreground">Exchange Operating Levy</td>
                  </tr>
                  <tr className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-medium text-foreground">SEC Investor Protection & Regulatory Levy</td>
                    <td className="p-4 text-muted-foreground text-xs">Securities & Exchange Commission</td>
                    <td className="p-4 text-muted-foreground font-mono text-xs">0.18%</td>
                    <td className="p-4 text-right font-mono text-rose-500/90">{formatGHS(secLevy)}</td>
                    <td className="p-4 text-right text-xs text-muted-foreground">Statutory Regulatory Levy</td>
                  </tr>
                  <tr className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-medium text-foreground">Central Securities Depository Settlement Fee</td>
                    <td className="p-4 text-muted-foreground text-xs">Central Securities Depository (CSD)</td>
                    <td className="p-4 text-muted-foreground font-mono text-xs">0.05%</td>
                    <td className="p-4 text-right font-mono text-rose-500/90">{formatGHS(csdLevy)}</td>
                    <td className="p-4 text-right text-xs text-muted-foreground">Custody & Clearing Fee</td>
                  </tr>
                  <tr className="bg-brand-bronze/5 font-bold border-t border-brand-bronze/20">
                    <td className="p-5 text-brand-bronze text-base">Net Retained Firm Margin</td>
                    <td className="p-5 text-muted-foreground text-xs">Operating Retained Earnings</td>
                    <td className="p-5 text-brand-bronze font-mono text-xs">≈ 0.70%</td>
                    <td className="p-5 text-right font-mono text-brand-bronze text-lg">{formatGHS(netCommission)}</td>
                    <td className="p-5 text-right">
                      <span className="px-2.5 py-1.5 rounded-md bg-brand-bronze/10 text-brand-bronze text-xs font-bold border border-brand-bronze/20">
                        Net Operating Income
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

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
    </motion.div>
  );
}

function PremiumStatCard({ label, value, hint, icon, gradient }: { label: string, value: string, hint: string, icon: React.ReactNode, gradient: string }) {
  return (
    <Card className="relative overflow-hidden shadow-card border-border/40 group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />
      <CardContent className="p-5 relative z-10">
        <div className="flex justify-between items-start mb-2">
          <p className="text-sm font-semibold text-muted-foreground group-hover:text-foreground/80 transition-colors">{label}</p>
          <div className="p-2 rounded-xl bg-background/80 shadow-sm border border-border/40 backdrop-blur-md">
            {icon}
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-3xl font-black tracking-tight text-foreground">{value}</h3>
          <p className="text-xs text-muted-foreground mt-1.5 font-medium">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}
