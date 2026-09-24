"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { adminApi } from "@/lib/api";
import { UploadResultModal } from "@/components/orders/UploadResultModal";
import type { AdminOrder } from "@/lib/api.types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Inbox,
  Banknote,
  Upload,
  ChevronLeft,
  ChevronRight,
  Clock,
  Briefcase,
  TrendingUp,
  Search,
  Eye,
  CheckCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

/* ─── helpers ─────────────────────────────────────────────────────────── */

const STATUS_CONFIG: Record<
  string,
  { label: string; text: string; bg: string; dot: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending_approval: {
    label: "Pending",
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    dot: "bg-amber-500",
    icon: Clock,
  },
  processing: {
    label: "Processing",
    text: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    dot: "bg-blue-500",
    icon: Banknote,
  },
  filled: {
    label: "Executed",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
    dot: "bg-red-500",
    icon: XCircle,
  },
  cancelled: {
    label: "Cancelled",
    text: "text-slate-500 dark:text-slate-400",
    bg: "bg-slate-500/10",
    dot: "bg-slate-400",
    icon: XCircle,
  },
  approved: {
    label: "Approved",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    dot: "bg-emerald-500",
    icon: CheckCircle,
  },
};

const TABS = [
  { key: "all", label: "All Orders" },
  { key: "pending_approval", label: "Pending" },
  { key: "processing", label: "Processing" },
  { key: "filled", label: "Executed" },
  { key: "rejected", label: "Rejected / Cancelled" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const PAGE_SIZES = [10, 25, 50];

function fmt(n: number | null | undefined, currency = true) {
  if (n == null) return "—";
  if (currency)
    return n.toLocaleString("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    });
  return n.toLocaleString("en-GH");
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function exportToCsv(orders: AdminOrder[]) {
  const headers = [
    "Order ID",
    "Client ID",
    "Instrument",
    "Asset Class",
    "Side",
    "Quantity",
    "Price (GHS)",
    "Status",
    "Filled Price",
    "Settlement Date",
    "Execution Note",
    "Date Placed",
  ];
  const rows = orders.map((o) => {
    return [
      o.id,
      o.user_id,
      o.name,
      o.asset_class,
      o.side.toUpperCase(),
      o.quantity,
      o.price,
      o.status,
      o.filledPrice ?? o.filled_price ?? "",
      o.settlementDate ?? "",
      o.executionNote ?? "",
      new Date(o.created_at).toISOString(),
    ];
  });
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `orders_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── component ───────────────────────────────────────────────────────── */

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [uploadTarget, setUploadTarget] = useState<AdminOrder | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await adminApi.orders();
      setOrders(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  // Reset to first page whenever filters change.
  useEffect(() => {
    setPage(1);
  }, [activeTab, search, pageSize]);

  const showSuccess = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleConfirmPayment = async (id: string, closeDrawer = false) => {
    const order = orders.find((item) => item.id === id);
    if (!order) return;
    setProcessingId(id);
    setActionError(null);
    try {
      const res = await adminApi.confirmOrderPayment(id, order.asset_class);
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? ({ ...o, ...res.order } as AdminOrder) : o)),
      );
      if (selectedOrder?.id === id && !closeDrawer) {
        setSelectedOrder((prev) => prev ? ({ ...prev, ...res.order } as AdminOrder) : prev);
      }
      if (closeDrawer) setSelectedOrder(null);
      showSuccess("Payment confirmed — order dispatched to trading desk.");
    } catch (e: unknown) {
      setActionError((e as Error)?.message ?? "Failed to confirm payment.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string, closeDrawer = false) => {
    const order = orders.find((item) => item.id === id);
    if (!order || !window.confirm("Are you sure you want to reject this order?")) return;
    setProcessingId(id);
    setActionError(null);
    try {
      await adminApi.rejectOrder(id, order.asset_class);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id ? ({ ...o, status: "rejected" } as AdminOrder) : o
        ),
      );
      if (selectedOrder?.id === id && !closeDrawer) {
        setSelectedOrder((prev) => prev ? ({ ...prev, status: "rejected" } as AdminOrder) : prev);
      }
      if (closeDrawer) setSelectedOrder(null);
      showSuccess("Order rejected.");
    } catch (e: unknown) {
      setActionError((e as Error)?.message ?? "Failed to reject order.");
    } finally {
      setProcessingId(null);
    }
  };

  const openUploadResult = (order: AdminOrder) => {
    setSelectedOrder(null);
    window.setTimeout(() => setUploadTarget(order), 0);
  };

  const handleUploadResult = async (
    id: string,
    data: Parameters<typeof adminApi.uploadOrderResult>[2],
  ) => {
    const order = orders.find((item) => item.id === id);
    if (!order) throw new Error("Order not found");
    const res = await adminApi.uploadOrderResult(id, order.asset_class, data);
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? ({ ...o, ...res.order } as AdminOrder) : o)),
    );
    if (selectedOrder?.id === id) {
      setSelectedOrder((prev) => prev ? ({ ...prev, ...res.order } as AdminOrder) : prev);
    }
    showSuccess("Execution result uploaded — portfolio updated.");
  };

  /* filtering */
  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        const tabMatch =
          activeTab === "all"
            ? true
            : activeTab === "rejected"
            ? o.status === "rejected" || o.status === "cancelled"
            : o.status === activeTab;
        const q = search.toLowerCase();
        const searchMatch =
          !q ||
          o.name.toLowerCase().includes(q) ||
          o.instrument.toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q) ||
          o.user_id.toLowerCase().includes(q);
        return tabMatch && searchMatch;
      }),
    [orders, activeTab, search],
  );

  /* tab counts */
  const counts: Record<string, number> = useMemo(() => ({
    all: orders.length,
    pending_approval: orders.filter((o) => o.status === "pending_approval").length,
    processing: orders.filter((o) => o.status === "processing").length,
    filled: orders.filter((o) => o.status === "filled").length,
    rejected: orders.filter(
      (o) => o.status === "rejected" || o.status === "cancelled",
    ).length,
  }), [orders]);

  /* pagination */
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(pageStart, pageStart + pageSize);
  const from = filtered.length === 0 ? 0 : pageStart + 1;
  const to = Math.min(pageStart + pageSize, filtered.length);

  /* KPI Charts Data */
  const chartData = useMemo(() => {
    const last14Days = Array.from({ length: 14 }).map((_, i) => {
      const d = subDays(new Date(), 13 - i);
      return {
        date: d,
        label: format(d, "MMM dd"),
        orders: 0,
      };
    });

    let totalValue = 0;
    let pendingValue = 0;

    orders.forEach((o) => {
      // Calculate value
      const val = o.quantity * (o.price || 1);
      totalValue += val;
      if (o.status === "pending_approval") pendingValue += val;

      // Group by day for bar chart
      const oDate = new Date(o.created_at);
      const dayIndex = last14Days.findIndex((d) => 
        oDate >= startOfDay(d.date) && oDate <= endOfDay(d.date)
      );

      if (dayIndex >= 0) {
        last14Days[dayIndex].orders += 1;
      }
    });

    const statusData = [
      { name: "Pending", value: counts.pending_approval, color: "#F59E0B" },
      { name: "Processing", value: counts.processing, color: "#3B82F6" },
      { name: "Executed", value: counts.filled, color: "#10B981" },
      { name: "Rejected", value: counts.rejected, color: "#EF4444" },
    ].filter((d) => d.value > 0);

    return { barData: last14Days, statusData, totalValue, pendingValue };
  }, [orders, counts]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 pt-6">
        {/* page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Order Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Hybrid back-office workflow · Confirm payment → Upload result → Portfolio updated
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              id="refresh-orders"
              variant="outline"
              size="sm"
              onClick={() => void loadOrders()}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              id="export-orders-csv"
              size="sm"
              onClick={() => exportToCsv(filtered)}
              disabled={filtered.length === 0}
              className="gap-2 bg-brand-bronze text-white hover:bg-brand-bronze/90 !text-white"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium tracking-tight text-muted-foreground">Total Orders</p>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{counts.all}</div>
              <p className="text-xs text-muted-foreground mt-1 tracking-tight">
                {counts.filled} executed successfully
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium tracking-tight text-muted-foreground">Awaiting Payment</p>
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold">{counts.pending_approval}</div>
              <p className="text-xs text-muted-foreground mt-1 tracking-tight">
                {fmt(chartData.pendingValue)} value
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">14-Day Order Flow</p>
                  <p className="text-xs text-muted-foreground">Orders received per day</p>
                </div>
                <TrendingUp className="h-4 w-4 text-brand-bronze" />
              </div>
              <div className="h-[76px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.barData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <XAxis dataKey="label" hide />
                    <RechartsTooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--popover))",
                        color: "hsl(var(--popover-foreground))",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      }}
                      formatter={(value) => [`${value} order${Number(value) === 1 ? "" : "s"}`, "Volume"]}
                    />
                    <Bar dataKey="orders" fill="hsl(var(--brand-bronze))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="mb-2">
                <p className="text-sm font-medium text-foreground">Order Status Mix</p>
                <p className="text-xs text-muted-foreground">Current workflow distribution</p>
              </div>
              <div className="flex h-[80px] items-center gap-3">
                <div className="h-[76px] w-[76px] shrink-0">
                  {chartData.statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData.statusData} innerRadius={21} outerRadius={36} paddingAngle={2} dataKey="value" stroke="none">
                          {chartData.statusData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No data</div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  {chartData.statusData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="truncate">{entry.name}</span>
                      </span>
                      <span className="font-semibold text-foreground">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* toast notifications */}
        {actionSuccess && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {actionSuccess}
          </div>
        )}
        {actionError && (
          <div className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {actionError}
            </span>
            <button
              onClick={() => setActionError(null)}
              className="text-lg leading-none opacity-70 hover:opacity-100"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {/* List Card (Search, Tabs, Table) */}
        <Card className="flex flex-1 flex-col overflow-hidden">
          {/* Toolbar (Sticky) */}
          <div className="sticky top-0 z-10 flex flex-col gap-4 border-b bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {TABS.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-brand-bronze/10 text-brand-bronze"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {tab.label}
                    {counts[tab.key] > 0 && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          active
                            ? "bg-brand-bronze text-white"
                            : "bg-muted-foreground/20 text-muted-foreground",
                        )}
                      >
                        {counts[tab.key]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-input bg-transparent py-2 pl-9 pr-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:border-brand-bronze focus:outline-none focus:ring-1 focus:ring-brand-bronze"
              />
            </div>
          </div>

          {/* Table Area */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex h-40 flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-sm">Loading orders…</span>
              </div>
            ) : error ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-8 w-8" />
                <p className="text-sm font-medium">Failed to load orders.</p>
              </div>
            ) : pageItems.length === 0 ? (
              <div className="flex h-60 flex-col items-center justify-center gap-3 text-muted-foreground">
                <Inbox className="h-10 w-10 opacity-20" />
                <p className="text-sm font-medium">No orders found</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur supports-[backdrop-filter]:bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[120px]">Order ID</TableHead>
                    <TableHead>Instrument</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty / FV</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Placed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((order) => {
                    const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending_approval;
                    const fi = order.asset_class === "fixed_income";
                    const isProcessing = processingId === order.id;
                    const isBuy = order.side.toLowerCase() === "buy";

                    return (
                      <TableRow 
                        key={order.id} 
                        className="group cursor-pointer hover:bg-muted/30"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {order.id.slice(0, 8)}…
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{order.name}</div>
                          <div className="text-xs text-muted-foreground">{fi ? "Fixed Income" : "Equity"}</div>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            isBuy ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
                          )}>
                            {order.side}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {fi ? fmt(order.quantity) : order.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {order.price ? fmt(order.price) : "MKT"}
                        </TableCell>
                        <TableCell>
                          <div className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", statusCfg.bg, statusCfg.text)}>
                            <statusCfg.icon className="h-3 w-3" />
                            {statusCfg.label}
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                          {format(new Date(order.created_at), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {order.status === "pending_approval" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400"
                                onClick={() => void handleConfirmPayment(order.id)}
                                disabled={isProcessing}
                              >
                                {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                Pay
                              </Button>
                            )}
                            {order.status === "processing" && (
                              <Button
                                size="sm"
                                className="h-8 gap-1 bg-brand-bronze hover:bg-brand-bronze/90 !text-white"
                                onClick={() => openUploadResult(order)}
                              >
                                <Upload className="h-3.5 w-3.5" />
                                Result
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground group-hover:text-foreground"
                              onClick={() => setSelectedOrder(order)}
                              aria-label={`View ${order.name} order details`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between border-t p-4">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{from}</span> to <span className="font-medium text-foreground">{to}</span> of <span className="font-medium text-foreground">{filtered.length}</span> results
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-sm text-muted-foreground focus:border-brand-bronze focus:outline-none focus:ring-1 focus:ring-brand-bronze"
                >
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s} per page</option>)}
                </select>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Upload Result Modal */}
      {uploadTarget && (
        <UploadResultModal
          order={uploadTarget}
          onClose={() => setUploadTarget(null)}
          onSubmit={(data) => handleUploadResult(uploadTarget.id, data)}
        />
      )}

      {/* Detail Drawer */}
      <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <SheetContent className="w-full sm:w-[540px] sm:max-w-none border-l-border bg-card p-0 flex flex-col gap-0 shadow-2xl">
          {selectedOrder && (() => {
            const fi = selectedOrder.asset_class === "fixed_income";
            const isBuy = selectedOrder.side.toLowerCase() === "buy";
            const statusCfg = STATUS_CONFIG[selectedOrder.status] ?? STATUS_CONFIG.pending_approval;
            const isProcessing = processingId === selectedOrder.id;

            return (
              <>
                <div className="flex items-center justify-between border-b p-6 pb-4">
                  <div>
                    <SheetTitle className="text-xl">{selectedOrder.name}</SheetTitle>
                    <SheetDescription className="mt-1 flex items-center gap-2">
                      <span className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        isBuy ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
                      )}>
                        {selectedOrder.side}
                      </span>
                      <span>•</span>
                      <span>{fi ? "Fixed Income" : "Equity"}</span>
                    </SheetDescription>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* Status Timeline */}
                  <div>
                    <h4 className="text-sm font-semibold mb-4">Order Lifecycle</h4>
                    <div className="relative border-l-2 border-muted ml-3 space-y-6">
                      <div className="relative pl-6">
                        <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-background bg-emerald-500" />
                        <p className="text-sm font-medium text-foreground">Order Placed</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(selectedOrder.created_at)}</p>
                      </div>

                      <div className="relative pl-6">
                        <div className={cn(
                          "absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-background",
                          selectedOrder.paymentConfirmedAt || selectedOrder.status === "filled" ? "bg-emerald-500" : (selectedOrder.status === "pending_approval" ? "bg-amber-500" : (selectedOrder.status === "rejected" || selectedOrder.status === "cancelled" ? "bg-slate-300 dark:bg-slate-700" : "bg-blue-500"))
                        )} />
                        <p className={cn("text-sm font-medium", !selectedOrder.paymentConfirmedAt && selectedOrder.status === "pending_approval" && "text-amber-600 dark:text-amber-500")}>
                          Payment Confirmation
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {selectedOrder.paymentConfirmedAt ? fmtDate(selectedOrder.paymentConfirmedAt) : (selectedOrder.status === "pending_approval" ? "Awaiting payment" : "Skipped/NA")}
                        </p>
                      </div>

                      <div className="relative pl-6">
                        <div className={cn(
                          "absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-background",
                          selectedOrder.status === "filled" ? "bg-emerald-500" : (selectedOrder.status === "rejected" || selectedOrder.status === "cancelled" ? "bg-red-500" : "bg-muted border-muted-foreground/30")
                        )} />
                        <p className={cn("text-sm font-medium", selectedOrder.status === "filled" && "text-emerald-600 dark:text-emerald-500", (selectedOrder.status === "rejected" || selectedOrder.status === "cancelled") && "text-red-600 dark:text-red-500")}>
                          {selectedOrder.status === "rejected" ? "Order Rejected" : selectedOrder.status === "cancelled" ? "Order Cancelled" : "Order Executed"}
                        </p>
                        {selectedOrder.settlementDate && (
                          <p className="text-xs text-muted-foreground mt-0.5">Settlement: {fmtDate(selectedOrder.settlementDate)}</p>
                        )}
                        {selectedOrder.executionNote && (
                          <p className="text-xs text-muted-foreground mt-1.5 rounded bg-muted p-2">{selectedOrder.executionNote}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Order Details</h4>
                    <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Order ID</p>
                        <p className="text-sm font-mono">{selectedOrder.id.slice(0, 12)}…</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Client ID</p>
                        <p className="text-sm font-mono">{selectedOrder.user_id.slice(0, 12)}…</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{fi ? "Face Value" : "Quantity"}</p>
                        <p className="text-sm font-medium">{fi ? fmt(selectedOrder.quantity) : selectedOrder.quantity.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Limit Price</p>
                        <p className="text-sm font-medium">{selectedOrder.price ? fmt(selectedOrder.price) : "Market"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Filled Price</p>
                        <p className="text-sm font-medium">{selectedOrder.filledPrice || selectedOrder.filled_price ? fmt(selectedOrder.filledPrice || selectedOrder.filled_price) : "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Current Status</p>
                        <div className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", statusCfg.bg, statusCfg.text)}>
                          {statusCfg.label}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="border-t p-6 bg-muted/10">
                  <div className="flex flex-col gap-2">
                    {selectedOrder.status === "pending_approval" && (
                      <>
                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700 !text-white"
                          onClick={() => void handleConfirmPayment(selectedOrder.id, true)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                          Confirm Payment Received
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
                          onClick={() => void handleReject(selectedOrder.id, true)}
                          disabled={isProcessing}
                        >
                          Reject Order
                        </Button>
                      </>
                    )}
                    
                    {selectedOrder.status === "processing" && (
                      <>
                        <Button
                          className="w-full bg-brand-bronze hover:bg-brand-bronze/90 !text-white"
                          onClick={() => openUploadResult(selectedOrder)}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Execution Result
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
                          onClick={() => void handleReject(selectedOrder.id, true)}
                          disabled={isProcessing}
                        >
                          Reject Order
                        </Button>
                      </>
                    )}

                    {(selectedOrder.status === "filled" || selectedOrder.status === "rejected" || selectedOrder.status === "cancelled") && (
                      <div className="text-center text-sm text-muted-foreground">
                        This order has reached its final state and cannot be modified.
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
