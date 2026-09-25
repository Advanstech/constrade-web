"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  Landmark,
  Layers,
  Loader2,
  PieChart as PieIcon,
  Printer,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Table as TableIcon,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadError } from "@/components/layout/LoadError";
import { StatCard } from "@/components/market/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { adminApi } from "@/lib/api";
import type { AdminDashboardData, AdminOrder, AdminUser, AdminAuditLog } from "@/lib/api.types";
import { formatGHS } from "@/lib/format";
import {
  exportOrdersReport,
  exportClientsReport,
  exportFinancialLedgerReport,
  exportAuditLogsReport,
} from "@/lib/exportUtils";
import { PrintableStatementModal } from "@/components/reports/PrintableStatementModal";
import { FormattedExportModal } from "@/components/reports/FormattedExportModal";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

export default function AdminReports() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Modals
  const [printOpen, setPrintOpen] = useState(false);
  const [printReportType, setPrintReportType] = useState<"financial" | "orders" | "clients" | "executive">("executive");
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const [orderSearch, setOrderSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");

  const [ordersPage, setOrdersPage] = useState(1);
  const [clientsPage, setClientsPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const pageSize = 10;

  const loadData = () => {
    setLoading(true);
    setError(false);
    Promise.all([
      adminApi.dashboard().catch(() => null),
      adminApi.orders().catch(() => []),
      adminApi.users().catch(() => []),
      adminApi.auditLogs().catch(() => []),
    ])
      .then(([dash, ords, usrs, logs]) => {
        if (!dash) {
          setError(true);
        } else {
          setData(dash);
          setOrders(ords);
          setUsers(usrs);
          setAuditLogs(logs);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const openPrint = (type: "financial" | "orders" | "clients" | "executive") => {
    setPrintReportType(type);
    setPrintOpen(true);
  };

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (!orderSearch) return orders;
    const q = orderSearch.toLowerCase();
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.client.toLowerCase().includes(q) ||
        o.instrument.toLowerCase().includes(q),
    );
  }, [orders, orderSearch]);

  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice((ordersPage - 1) * pageSize, ordersPage * pageSize);
  }, [filteredOrders, ordersPage]);
  const ordersTotalPages = Math.ceil(filteredOrders.length / pageSize);

  useEffect(() => { setOrdersPage(1); }, [orderSearch]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!clientSearch) return users;
    const q = clientSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.csd_account && u.csd_account.toLowerCase().includes(q)),
    );
  }, [users, clientSearch]);

  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice((clientsPage - 1) * pageSize, clientsPage * pageSize);
  }, [filteredUsers, clientsPage]);
  const clientsTotalPages = Math.ceil(filteredUsers.length / pageSize);

  useEffect(() => { setClientsPage(1); }, [clientSearch]);

  const paginatedAudit = useMemo(() => {
    if (!auditLogs) return [];
    return auditLogs.slice((auditPage - 1) * pageSize, auditPage * pageSize);
  }, [auditLogs, auditPage]);
  const auditTotalPages = Math.ceil((auditLogs?.length || 0) / pageSize);

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <LoadError message="We couldn't load the reports. Please check connectivity and try again." onRetry={loadData} />
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
        <Skeleton className="h-80" />
      </div>
    );
  }

  const m = data.metrics;
  const secLevy = m.turnover * 0.0018; // 0.18%
  const gseLevy = m.turnover * 0.0022; // 0.22%
  const csdLevy = m.turnover * 0.0005; // 0.05%
  const netCommission = Math.max(m.revenue - (secLevy + gseLevy + csdLevy), 0);

  const growth = data.chart.monthLabels.map((label, i) => ({
    month: label,
    clients: data.chart.clientGrowth[i] ?? 0,
    turnover: Math.round(((m.turnover || 6_760_000) / 6) * (i + 1)),
  }));

  const DETAILED_REPORT_CARDS = [
    {
      title: "Financial & Revenue Reconciliation",
      description: "Itemized statutory levies (SEC 0.18%, GSE 0.22%, CSD 0.05%) and net broker margin ledger.",
      href: "/admin/reports/financial",
      icon: Coins,
      badge: "Accounting Ledger",
      actionLabel: "View Financial Report",
      exportAction: () => exportFinancialLedgerReport(m, data.chart.volumeByClass, "YTD 2026"),
    },
    {
      title: "Trade Execution & Order Flow Audit",
      description: "Trading desk blotter detailing side, limit price matching, executed notional, and broker commission.",
      href: "/admin/reports/orders",
      icon: TableIcon,
      badge: `${orders?.length || 0} Orders`,
      actionLabel: "View Trade Blotter",
      exportAction: () => orders && exportOrdersReport(orders, "All Time"),
    },
    {
      title: "Investor Registry & KYC Compliance",
      description: "Depository accounts, verified Ghana Card CSD profiles, liquid reserves, and client ranking.",
      href: "/admin/reports/clients",
      icon: Users,
      badge: `${users?.length || 0} Investors`,
      actionLabel: "View Client Registry",
      exportAction: () => users && exportClientsReport(users, "All Time"),
    },
    {
      title: "Compliance & Regulatory Audit Trail",
      description: "Immutable log of supervisory decisions, tender settlements, and staff authorization actions.",
      href: "/admin/reports/audit",
      icon: ShieldCheck,
      badge: `${auditLogs?.length || 0} Audit Events`,
      actionLabel: "View Audit Trail",
      exportAction: () => auditLogs && exportAuditLogsReport(auditLogs, "All Time"),
    },
    {
      title: "Primary Market & T-Bill Auction Bids",
      description: "Government of Ghana Treasury Bill & Bond primary issuance tenders, allotment rates, and schedules.",
      href: "/admin/reports/auctions",
      icon: Landmark,
      badge: "GSE Primary",
      actionLabel: "View Auction Bids",
      exportAction: () => void adminApi.exportBidsCsv(),
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Reports & Statement Intelligence"
        subtitle="Firm performance summaries, regulatory fee reconciliations, and downloadable formatted exports."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportModalOpen(true)}
              className="gap-1.5 border-brand-bronze/40 hover:bg-brand-bronze/10 text-brand-bronze font-semibold"
            >
              <Download className="h-3.5 w-3.5" /> Export Hub
            </Button>
            <Button
              size="sm"
              onClick={() => openPrint("executive")}
              className="bg-brand-bronze text-white hover:bg-brand-bronze-dark gap-1.5 shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" /> Printable Statement
            </Button>
          </div>
        }
      />

      {/* Executive Performance Ribbon */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Assets Under Management"
          value={formatGHS(m.aum, { compact: true })}
          hint="Cash reserves + custody securities"
          icon={<Wallet className="h-4 w-4 text-brand-bronze" />}
        />
        <StatCard
          label="Turnover (Filled Orders)"
          value={formatGHS(m.turnover, { compact: true })}
          hint={`${m.filledOrders} matched trades executed`}
          icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
        />
        <StatCard
          label="Est. Gross Revenue (Fees)"
          value={formatGHS(m.revenue, { compact: true })}
          hint="≈ 1.15% brokerage commission"
          icon={<Coins className="h-4 w-4 text-brand-bronze" />}
        />
        <StatCard
          label="Liquid Client Cash Reserves"
          value={formatGHS(m.cashReserves, { compact: true })}
          hint="Uninvested wallet liquidity"
          icon={<Building2 className="h-4 w-4 text-brand-navy dark:text-blue-400" />}
        />
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-2">
          <TabsList className="bg-muted/70 p-1 rounded-lg">
            <TabsTrigger value="overview" className="text-xs font-semibold gap-1.5">
              <Layers className="h-3.5 w-3.5" /> Overview & Catalog
            </TabsTrigger>
            <TabsTrigger value="financial" className="text-xs font-semibold gap-1.5">
              <Coins className="h-3.5 w-3.5" /> Financial Ledger
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-xs font-semibold gap-1.5">
              <TableIcon className="h-3.5 w-3.5" /> Trade Flow
            </TabsTrigger>
            <TabsTrigger value="clients" className="text-xs font-semibold gap-1.5">
              <Users className="h-3.5 w-3.5" /> Investor Registry
            </TabsTrigger>
            <TabsTrigger value="audit" className="text-xs font-semibold gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Compliance Trail
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">SEC / GSE Regulatory Compliant</span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
          </div>
        </div>

        {/* ── TAB 1: OVERVIEW & CATALOG ───────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          {/* Detailed Reports Catalog Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Detailed Report Pages & Audit Blotters
                </h3>
                <p className="text-xs text-muted-foreground">
                  Access deep reporting pages with multi-parameter filtering, individual record inspection, and formal exports.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {DETAILED_REPORT_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <Card key={card.title} className="shadow-card hover:border-brand-bronze/50 transition-all flex flex-col justify-between">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-bronze/10 text-brand-bronze">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground">
                          {card.badge}
                        </span>
                      </div>
                      <CardTitle className="mt-2 text-sm font-bold">{card.title}</CardTitle>
                      <CardDescription className="text-xs line-clamp-2 leading-relaxed">
                        {card.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 flex items-center justify-between gap-2 border-t border-border/50 p-4 bg-muted/10">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={card.exportAction}
                        className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-brand-bronze" /> CSV
                      </Button>
                      <Link href={card.href}>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1 hover:border-brand-bronze hover:text-brand-bronze">
                          {card.actionLabel} <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Visual Charts: Growth & Turnover Breakdown */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Turnover Progression */}
            <Card className="lg:col-span-2 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <TrendingUp className="h-4 w-4 text-brand-bronze" /> Client Base & Turnover Trajectory
                </CardTitle>
                <CardDescription className="text-xs">
                  Monthly client velocity alongside aggregate matched trade turnover notional.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={growth} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line
                        type="monotone"
                        dataKey="clients"
                        name="Active Investors"
                        stroke="hsl(var(--brand-bronze))"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "hsl(var(--brand-bronze))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Asset Class Turnover */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <BarChart3 className="h-4 w-4 text-brand-bronze" /> Turnover by Asset Class
                </CardTitle>
                <CardDescription className="text-xs">Equities, T-Bills, and GoG Bonds</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chart.volumeByClass} margin={{ top: 10, right: 10, bottom: 0, left: -15 }}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(v) => `₵${(v / 1_000_000).toFixed(0)}M`}
                      />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatGHS(Number(v)), "Turnover"]} />
                      <Bar dataKey="value" fill="hsl(var(--brand-bronze))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue & Portfolio Health Cards */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-bold">Regulatory Fee Model & Revenue Estimate</CardTitle>
                <Link href="/admin/reports/financial" className="text-xs text-brand-bronze font-semibold flex items-center gap-1 hover:underline">
                  Detailed Ledger <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="Filled Order Notional (Turnover)" value={formatGHS(m.turnover)} />
                <Row label="Gross Brokerage Commission (1.15%)" value={formatGHS(m.revenue)} />
                <Row label="Ghana Stock Exchange (GSE) Levy (0.22%)" value={formatGHS(gseLevy)} />
                <Row label="SEC Investor Protection Levy (0.18%)" value={formatGHS(secLevy)} />
                <Row label="CSD Depository Settlement Fee (0.05%)" value={formatGHS(csdLevy)} />
                <div className="border-t border-border/80 pt-2 flex items-center justify-between font-bold text-brand-bronze">
                  <span>Net Retained Brokerage Margin</span>
                  <span>{formatGHS(netCommission)}</span>
                </div>
                <p className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  Statutory fee allocations audited against Securities Industry Act, 2016 (Act 929) guidelines.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-bold">Portfolio Health & Client Registry</CardTitle>
                <Link href="/admin/reports/clients" className="text-xs text-brand-bronze font-semibold flex items-center gap-1 hover:underline">
                  Full Registry <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="Total Registered Clients" value={String(m.totalClients)} />
                <Row label="New Clients (Last 30 Days)" value={String(m.newClients30d)} />
                <Row label="Orders Placed" value={String(m.totalOrders)} />
                <Row label="Orders Successfully Filled" value={String(m.filledOrders)} />
                <Row label="Orders Awaiting Compliance Approval" value={String(m.pendingApprovals)} />
                <p className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  All accounts reconciled against automated CSD depository balances and verified Ghana Card KYC.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB 2: FINANCIAL PERFORMANCE ───────────────────── */}
        <TabsContent value="financial" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Financial & Fee Reconciliation Ledger</h3>
              <p className="text-xs text-muted-foreground">
                Itemized breakdown of firm commission and statutory exchange and regulatory levies.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportFinancialLedgerReport(m, data.chart.volumeByClass, "YTD 2026")}
                className="gap-1.5"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-brand-bronze" /> Formatted CSV
              </Button>
              <Link href="/admin/reports/financial">
                <Button size="sm" variant="default" className="bg-brand-bronze hover:bg-brand-bronze-dark gap-1.5 text-white">
                  Open Dedicated Page <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/80 bg-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 uppercase tracking-wider text-muted-foreground font-bold text-[10px]">
                <tr>
                  <th className="p-3 border-b border-border/80">Classification</th>
                  <th className="p-3 border-b border-border/80">Agency</th>
                  <th className="p-3 border-b border-border/80">Rate / Basis</th>
                  <th className="p-3 border-b border-border/80 text-right">Notional Sum</th>
                  <th className="p-3 border-b border-border/80 text-right">Accounting Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr>
                  <td className="p-3 font-semibold">Total Matched Turnover</td>
                  <td className="p-3 text-muted-foreground">Market Clearing</td>
                  <td className="p-3 text-muted-foreground font-mono">100.00%</td>
                  <td className="p-3 text-right font-mono font-bold">{formatGHS(m.turnover)}</td>
                  <td className="p-3 text-right text-xs text-muted-foreground">Settled Volume</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">Constant Capital Brokerage Fee</td>
                  <td className="p-3 text-muted-foreground">Constant Capital Ghana</td>
                  <td className="p-3 text-muted-foreground font-mono">1.15%</td>
                  <td className="p-3 text-right font-mono font-semibold text-brand-bronze">{formatGHS(m.revenue)}</td>
                  <td className="p-3 text-right text-xs text-emerald-600 font-semibold">Gross Commission</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">GSE Transaction Levy</td>
                  <td className="p-3 text-muted-foreground">Ghana Stock Exchange</td>
                  <td className="p-3 text-muted-foreground font-mono">0.22%</td>
                  <td className="p-3 text-right font-mono">{formatGHS(gseLevy)}</td>
                  <td className="p-3 text-right text-xs text-muted-foreground">Exchange Fee</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">SEC Investor Protection Levy</td>
                  <td className="p-3 text-muted-foreground">Securities & Exchange Commission</td>
                  <td className="p-3 text-muted-foreground font-mono">0.18%</td>
                  <td className="p-3 text-right font-mono">{formatGHS(secLevy)}</td>
                  <td className="p-3 text-right text-xs text-muted-foreground">Statutory Levy</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">CSD Clearing Fee</td>
                  <td className="p-3 text-muted-foreground">Central Securities Depository</td>
                  <td className="p-3 text-muted-foreground font-mono">0.05%</td>
                  <td className="p-3 text-right font-mono">{formatGHS(csdLevy)}</td>
                  <td className="p-3 text-right text-xs text-muted-foreground">Depository Fee</td>
                </tr>
                <tr className="bg-muted/40 font-bold">
                  <td className="p-3 text-brand-bronze">Net Retained Brokerage Margin</td>
                  <td className="p-3 text-muted-foreground">Operating Retained</td>
                  <td className="p-3 text-brand-bronze font-mono">≈ 0.70%</td>
                  <td className="p-3 text-right font-mono text-brand-bronze">{formatGHS(netCommission)}</td>
                  <td className="p-3 text-right text-xs text-brand-bronze font-semibold">Retained Commission</td>
                </tr>
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── TAB 3: ORDERS & EXECUTION FLOW ─────────────────── */}
        <TabsContent value="orders" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold">Recent Trade Execution Blotter</h3>
              <p className="text-xs text-muted-foreground">
                Showing {filteredOrders.length} of {orders?.length || 0} executed and open platform orders.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter orders..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => orders && exportOrdersReport(orders, "All Time")}
                className="gap-1.5"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-brand-bronze" /> Formatted CSV
              </Button>
              <Link href="/admin/reports/orders">
                <Button size="sm" variant="default" className="bg-brand-bronze hover:bg-brand-bronze-dark gap-1.5 text-white">
                  Open Dedicated Page <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/80 bg-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 uppercase tracking-wider text-muted-foreground font-bold text-[10px]">
                <tr>
                  <th className="p-3 border-b border-border/80">Order Ref</th>
                  <th className="p-3 border-b border-border/80">Client Investor</th>
                  <th className="p-3 border-b border-border/80">Instrument</th>
                  <th className="p-3 border-b border-border/80">Side</th>
                  <th className="p-3 border-b border-border/80 text-right">Quantity</th>
                  <th className="p-3 border-b border-border/80 text-right">Price</th>
                  <th className="p-3 border-b border-border/80 text-right">Gross Notional</th>
                  <th className="p-3 border-b border-border/80">Status</th>
                  <th className="p-3 border-b border-border/80">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((o) => {
                    const price = Number(o.filledPrice ?? o.price ?? 0);
                    const qty = Number(o.quantity ?? 0);
                    const gross = price * qty;
                    const isBuy = o.side.toLowerCase() === "buy";
                    const isFilled = o.status.toLowerCase() === "filled";

                    return (
                      <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-mono font-bold text-foreground">{o.id.slice(0, 8)}</td>
                        <td className="p-3 font-medium text-foreground">{o.client}</td>
                        <td className="p-3 font-semibold text-foreground">{o.instrument}</td>
                        <td className="p-3">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              isBuy
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-red-500/10 text-red-600 dark:text-red-400"
                            }`}
                          >
                            {o.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono">{qty.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono">GHS {price.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono font-semibold">{formatGHS(gross)}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isFilled
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {o.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground font-mono text-[11px]">
                          {new Date(o.created_at).toISOString().slice(0, 10)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {ordersTotalPages > 1 && (
            <div className="pt-2">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setOrdersPage((p) => Math.max(1, p - 1));
                      }}
                      className={ordersPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, ordersTotalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (ordersTotalPages > 5) {
                      if (ordersPage > 3) {
                        pageNum = ordersPage - 2 + i;
                        if (pageNum > ordersTotalPages) pageNum = ordersTotalPages - (4 - i);
                      }
                    }
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href="#"
                          isActive={ordersPage === pageNum}
                          onClick={(e) => {
                            e.preventDefault();
                            setOrdersPage(pageNum);
                          }}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setOrdersPage((p) => Math.min(ordersTotalPages, p + 1));
                      }}
                      className={ordersPage === ordersTotalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </TabsContent>

        {/* ── TAB 4: CLIENT REGISTRY ─────────────────────────── */}
        <TabsContent value="clients" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold">Investor Registry & CSD Accounts</h3>
              <p className="text-xs text-muted-foreground">
                Showing verified depository participants and compliance statuses.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter investors..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => users && exportClientsReport(users, "All Time")}
                className="gap-1.5"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-brand-bronze" /> Formatted CSV
              </Button>
              <Link href="/admin/reports/clients">
                <Button size="sm" variant="default" className="bg-brand-bronze hover:bg-brand-bronze-dark gap-1.5 text-white">
                  Open Dedicated Page <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/80 bg-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 uppercase tracking-wider text-muted-foreground font-bold text-[10px]">
                <tr>
                  <th className="p-3 border-b border-border/80">Investor Name</th>
                  <th className="p-3 border-b border-border/80">Email</th>
                  <th className="p-3 border-b border-border/80">CSD Account #</th>
                  <th className="p-3 border-b border-border/80">KYC Status</th>
                  <th className="p-3 border-b border-border/80 text-right">Cash Reserves</th>
                  <th className="p-3 border-b border-border/80 text-right">Lifetime Orders</th>
                  <th className="p-3 border-b border-border/80">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No investors found.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u) => {
                    const isApproved = u.kyc_status.toUpperCase() === "APPROVED";

                    return (
                      <tr key={u.user_id || u.email} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-semibold text-foreground">{u.full_name}</td>
                        <td className="p-3 text-muted-foreground font-mono text-[11px]">{u.email}</td>
                        <td className="p-3 font-mono font-semibold">
                          {u.csd_account || <span className="text-muted-foreground font-normal">UNASSIGNED</span>}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isApproved
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {isApproved && <ShieldCheck className="h-3 w-3" />}
                            {u.kyc_status}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-semibold">{formatGHS(Number(u.cash || 0))}</td>
                        <td className="p-3 text-right font-mono">{u.orderCount}</td>
                        <td className="p-3 text-muted-foreground font-mono text-[11px]">
                          {new Date(u.created_at).toISOString().slice(0, 10)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {clientsTotalPages > 1 && (
            <div className="pt-2">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setClientsPage((p) => Math.max(1, p - 1));
                      }}
                      className={clientsPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, clientsTotalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (clientsTotalPages > 5) {
                      if (clientsPage > 3) {
                        pageNum = clientsPage - 2 + i;
                        if (pageNum > clientsTotalPages) pageNum = clientsTotalPages - (4 - i);
                      }
                    }
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href="#"
                          isActive={clientsPage === pageNum}
                          onClick={(e) => {
                            e.preventDefault();
                            setClientsPage(pageNum);
                          }}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setClientsPage((p) => Math.min(clientsTotalPages, p + 1));
                      }}
                      className={clientsPage === clientsTotalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </TabsContent>

        {/* ── TAB 5: AUDIT & COMPLIANCE ──────────────────────── */}
        <TabsContent value="audit" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Compliance & Regulatory Audit Trail</h3>
              <p className="text-xs text-muted-foreground">
                Chronological ledger of administrative, settlement, and verification events.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => auditLogs && exportAuditLogsReport(auditLogs, "All Time")}
                className="gap-1.5"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-brand-bronze" /> Formatted CSV
              </Button>
              <Link href="/admin/reports/audit">
                <Button size="sm" variant="default" className="bg-brand-bronze hover:bg-brand-bronze-dark gap-1.5 text-white">
                  Open Dedicated Page <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/80 bg-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 uppercase tracking-wider text-muted-foreground font-bold text-[10px]">
                <tr>
                  <th className="p-3 border-b border-border/80">Timestamp</th>
                  <th className="p-3 border-b border-border/80">Action</th>
                  <th className="p-3 border-b border-border/80">Initiator</th>
                  <th className="p-3 border-b border-border/80">Entity Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {!auditLogs || auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  paginatedAudit.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3 font-mono text-[11px] text-muted-foreground">
                        {new Date(log.createdAt).toISOString().slice(0, 19).replace("T", " ")}
                      </td>
                      <td className="p-3">
                        <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 font-medium">
                        {log.user ? `${log.user.firstName || ""} ${log.user.lastName || ""}`.trim() || log.user.email : "SYSTEM"}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-muted-foreground">
                        {log.entityId ? log.entityId.slice(0, 16) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {auditTotalPages > 1 && (
            <div className="pt-2">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setAuditPage((p) => Math.max(1, p - 1));
                      }}
                      className={auditPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, auditTotalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (auditTotalPages > 5) {
                      if (auditPage > 3) {
                        pageNum = auditPage - 2 + i;
                        if (pageNum > auditTotalPages) pageNum = auditTotalPages - (4 - i);
                      }
                    }
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href="#"
                          isActive={auditPage === pageNum}
                          onClick={(e) => {
                            e.preventDefault();
                            setAuditPage(pageNum);
                          }}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setAuditPage((p) => Math.min(auditTotalPages, p + 1));
                      }}
                      className={auditPage === auditTotalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <PrintableStatementModal
        open={printOpen}
        onOpenChange={setPrintOpen}
        metrics={m}
        orders={orders ?? []}
        users={users ?? []}
        periodLabel="Year to Date (YTD 2026)"
        reportType={printReportType}
      />

      <FormattedExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        dashboardData={data}
        orders={orders}
        users={users}
        onOpenPrintStatement={openPrint}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
