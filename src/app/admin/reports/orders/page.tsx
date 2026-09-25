"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Filter,
  Printer,
  RefreshCw,
  Search,
  Table as TableIcon,
  XCircle,
  TrendingUp,
  DollarSign,
  Calendar,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadError } from "@/components/layout/LoadError";
import { StatCard } from "@/components/market/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/api";
import type { AdminOrder, AdminMetrics } from "@/lib/api.types";
import { formatGHS } from "@/lib/format";
import { exportOrdersReport } from "@/lib/exportUtils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { PrintableStatementModal } from "@/components/reports/PrintableStatementModal";

export default function OrdersReportPage() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [sideFilter, setSideFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [printOpen, setPrintOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const load = () => {
    setLoading(true);
    setError(false);
    adminApi
      .orders()
      .then(setOrders)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o) => {
      const matchSearch =
        !search ||
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.client.toLowerCase().includes(search.toLowerCase()) ||
        o.instrument.toLowerCase().includes(search.toLowerCase());

      const matchSide = sideFilter === "ALL" || o.side.toLowerCase() === sideFilter.toLowerCase();
      const matchStatus =
        statusFilter === "ALL" || o.status.toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchSide && matchStatus;
    });
  }, [orders, search, sideFilter, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sideFilter, statusFilter]);

  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredOrders.length / pageSize);

  const metrics = useMemo(() => {
    if (!orders) return { totalVolume: 0, estFees: 0, fillRate: 0, totalFilled: 0 };
    const total = orders.length || 1;
    const filled = orders.filter((o) => o.status.toLowerCase() === "filled").length;
    const totalVolume = orders.reduce((s, o) => {
      const price = Number(o.filledPrice ?? o.price ?? 0);
      const qty = Number(o.quantity ?? 0);
      return s + price * qty;
    }, 0);
    const estFees = totalVolume * 0.0115;
    const fillRate = Math.round((filled / total) * 100);

    return { totalVolume, estFees, fillRate, totalFilled: filled };
  }, [orders]);

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <LoadError message="Could not load orders report." onRetry={load} />
      </div>
    );
  }

  if (loading || !orders) {
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/admin/reports" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Reports Hub
        </Link>
        <span>/</span>
        <span className="font-semibold text-foreground">Trade Execution & Order Flow Audit</span>
      </div>

      <PageHeader
        title="Trade Execution & Order Flow Audit"
        subtitle="Comprehensive trading desk audit blotter detailing executed trades, broker fees, and limit order matching."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportOrdersReport(filteredOrders, "Filtered Scope")}
              className="gap-1.5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-brand-bronze" /> Formatted CSV ({filteredOrders.length})
            </Button>
            <Button
              size="sm"
              onClick={() => setPrintOpen(true)}
              className="bg-brand-bronze text-white hover:bg-brand-bronze-dark gap-1.5 shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" /> Printable Blotter
            </Button>
          </div>
        }
      />

      {/* KPI Ribbon */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Orders Placed"
          value={String(orders.length)}
          hint={`${metrics.totalFilled} successfully filled`}
          icon={<TableIcon className="h-4 w-4 text-brand-bronze" />}
        />
        <StatCard
          label="Total Trade Notional"
          value={formatGHS(metrics.totalVolume, { compact: true })}
          hint="Gross order value"
          icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
        />
        <StatCard
          label="Est. Brokerage Fees"
          value={formatGHS(metrics.estFees, { compact: true })}
          hint="1.15% fee model calculation"
          icon={<TrendingUp className="h-4 w-4 text-brand-bronze" />}
        />
        <StatCard
          label="Trade Fill Rate"
          value={`${metrics.fillRate}%`}
          hint="Executed vs open ratio"
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
        />
      </div>

      {/* Filters Bar */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by client name, instrument, or order ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Side:
              </span>
              {["ALL", "BUY", "SELL"].map((s) => (
                <button
                  key={s}
                  onClick={() => setSideFilter(s)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    sideFilter === s
                      ? "bg-brand-navy text-white dark:bg-brand-bronze"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}

              <span className="ml-2 text-xs text-muted-foreground font-semibold">Status:</span>
              {["ALL", "FILLED", "PENDING_APPROVAL", "PROCESSING", "REJECTED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    statusFilter === st
                      ? "bg-brand-navy text-white dark:bg-brand-bronze"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-bold">Execution Blotter ({filteredOrders.length})</CardTitle>
            <CardDescription className="text-xs">
              Real-time audit log of all equities and fixed income orders placed on Constrade+.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportOrdersReport(filteredOrders, "Execution Blotter Filtered")}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Export Filtered ({filteredOrders.length})
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 uppercase tracking-wider text-muted-foreground font-bold text-[10px]">
                <tr>
                  <th className="p-3 border-b border-border/80">Order Ref</th>
                  <th className="p-3 border-b border-border/80">Client Investor</th>
                  <th className="p-3 border-b border-border/80">Instrument</th>
                  <th className="p-3 border-b border-border/80">Side</th>
                  <th className="p-3 border-b border-border/80">Type</th>
                  <th className="p-3 border-b border-border/80 text-right">Quantity</th>
                  <th className="p-3 border-b border-border/80 text-right">Price</th>
                  <th className="p-3 border-b border-border/80 text-right">Gross Notional</th>
                  <th className="p-3 border-b border-border/80 text-right">Fee (1.15%)</th>
                  <th className="p-3 border-b border-border/80">Status</th>
                  <th className="p-3 border-b border-border/80">Placed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-muted-foreground">
                      No orders found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((o) => {
                    const price = Number(o.filledPrice ?? o.price ?? 0);
                    const qty = Number(o.quantity ?? 0);
                    const gross = price * qty;
                    const fee = gross * 0.0115;
                    const isBuy = o.side.toLowerCase() === "buy";
                    const isFilled = o.status.toLowerCase() === "filled";
                    const isPending = o.status.toLowerCase().includes("pending");

                    return (
                      <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-mono font-bold text-foreground">
                          {o.id.slice(0, 8)}
                        </td>
                        <td className="p-3 font-medium text-foreground">
                          {o.client}
                        </td>
                        <td className="p-3 font-semibold text-foreground">
                          {o.instrument}
                        </td>
                        <td className="p-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              isBuy
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-red-500/10 text-red-600 dark:text-red-400"
                            }`}
                          >
                            {o.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">
                          {o.order_type.toUpperCase()}
                        </td>
                        <td className="p-3 text-right font-mono font-medium">
                          {qty.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono">
                          GHS {price.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold">
                          {formatGHS(gross)}
                        </td>
                        <td className="p-3 text-right font-mono text-muted-foreground">
                          {formatGHS(fee)}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isFilled
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : isPending
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isFilled && <CheckCircle2 className="h-3 w-3" />}
                            {isPending && <Clock className="h-3 w-3" />}
                            {o.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground font-mono text-[11px]">
                          {new Date(o.created_at).toISOString().slice(0, 16).replace("T", " ")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
        {totalPages > 1 && (
          <div className="p-4 border-t border-border/50">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage((p) => Math.max(1, p - 1));
                    }}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink
                      href="#"
                      isActive={currentPage === p}
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(p);
                      }}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                    }}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </Card>

      <PrintableStatementModal
        open={printOpen}
        onOpenChange={setPrintOpen}
        metrics={{
          aum: metrics.totalVolume * 1.5,
          turnover: metrics.totalVolume,
          revenue: metrics.estFees,
          cashReserves: 2_000_000,
          totalClients: 4,
          newClients30d: 3,
          totalOrders: orders.length,
          pendingApprovals: orders.filter((o) => o.status.toLowerCase().includes("pending")).length,
          filledOrders: metrics.totalFilled,
        }}
        orders={filteredOrders}
        periodLabel="Current Filtered Scope"
        reportType="orders"
      />
    </div>
  );
}
