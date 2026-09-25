"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { adminApi } from "@/lib/api";
import type { Transaction } from "@/lib/api.types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  RefreshCw,
  Download,
  Loader2,
  AlertCircle,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  Eye,
  Printer,
  CheckCircle,
  FileText,
} from "lucide-react";
import { formatDateTime, formatGHS } from "@/lib/format";
import { PrintableTransactionReceipt } from "@/components/transactions/PrintableTransactionReceipt";

/* ─── helpers ─────────────────────────────────────────────────────────── */

const TABS = [
  { key: "all", label: "All Transactions" },
  { key: "deposit", label: "Deposits" },
  { key: "withdraw", label: "Withdrawals" },
  { key: "fee", label: "Fees" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const PAGE_SIZES = [10, 25, 50];

type AdminTx = Transaction & { clientName?: string, status?: string };

function exportToCsv(transactions: AdminTx[]) {
  const headers = [
    "Transaction ID",
    "Client",
    "Client ID",
    "Type",
    "Amount (GHS)",
    "Status",
    "Reference",
    "Detail",
    "Date",
  ];
  const rows = transactions.map((t) => {
    return [
      t.id,
      t.clientName || "",
      t.user_id,
      t.type,
      t.amount,
      t.status,
      t.reference || "",
      t.detail || "",
      new Date(t.created_at).toISOString(),
    ];
  });
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transactions_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── component ───────────────────────────────────────────────────────── */

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<AdminTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [selectedTx, setSelectedTx] = useState<AdminTx | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await adminApi.transactions();
      setTransactions(data || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  // Reset to first page whenever filters change.
  useEffect(() => {
    setPage(1);
  }, [activeTab, search, pageSize, dateFrom, dateTo]);

  /* filtering */
  const filtered = useMemo(
    () =>
      transactions.filter((t) => {
        const tabMatch = activeTab === "all" ? true : t.type === activeTab;
        
        let dateMatch = true;
        if (dateFrom || dateTo) {
          const txDate = new Date(t.created_at);
          txDate.setHours(0, 0, 0, 0);
          
          if (dateFrom) {
            const fromDate = new Date(dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            if (txDate < fromDate) dateMatch = false;
          }
          if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(0, 0, 0, 0);
            if (txDate > toDate) dateMatch = false;
          }
        }

        const q = search.toLowerCase();
        const searchMatch =
          !q ||
          (t.clientName || "").toLowerCase().includes(q) ||
          t.type.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.user_id.toLowerCase().includes(q) ||
          (t.reference || "").toLowerCase().includes(q) ||
          (t.detail || "").toLowerCase().includes(q) ||
          (t.status || "").toLowerCase().includes(q) ||
          t.amount.toString().includes(q);
          
        return tabMatch && dateMatch && searchMatch;
      }),
    [transactions, activeTab, search, dateFrom, dateTo],
  );

  /* pagination */
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(pageStart, pageStart + pageSize);
  const from = filtered.length === 0 ? 0 : pageStart + 1;
  const to = Math.min(pageStart + pageSize, filtered.length);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 pt-6">
        {/* page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View all user deposits, withdrawals, and fee transactions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadTransactions()}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button
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
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full sm:w-[130px] rounded-md border border-input bg-transparent py-2 px-3 text-sm shadow-sm transition-colors focus:border-brand-bronze focus:outline-none focus:ring-1 focus:ring-brand-bronze text-foreground [color-scheme:light] dark:[color-scheme:dark]"
                  title="Start Date"
                />
                <span className="text-muted-foreground text-sm">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full sm:w-[130px] rounded-md border border-input bg-transparent py-2 px-3 text-sm shadow-sm transition-colors focus:border-brand-bronze focus:outline-none focus:ring-1 focus:ring-brand-bronze text-foreground [color-scheme:light] dark:[color-scheme:dark]"
                  title="End Date"
                />
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent py-2 pl-9 pr-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:border-brand-bronze focus:outline-none focus:ring-1 focus:ring-brand-bronze"
                />
              </div>
            </div>
          </div>

          {/* Table Area */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex h-40 flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-sm">Loading transactions…</span>
              </div>
            ) : error ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-8 w-8" />
                <p className="text-sm font-medium">Failed to load transactions.</p>
              </div>
            ) : pageItems.length === 0 ? (
              <div className="flex h-60 flex-col items-center justify-center gap-3 text-muted-foreground">
                <Inbox className="h-10 w-10 opacity-20" />
                <p className="text-sm font-medium">No transactions found</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur supports-[backdrop-filter]:bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount (GHS)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((t) => {
                    const isDeposit = t.type === "deposit";
                    const isWithdraw = t.type === "withdraw";

                    return (
                      <TableRow 
                        key={t.id} 
                        className="group cursor-pointer hover:bg-muted/30"
                        onClick={() => setSelectedTx(t)}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {t.id.slice(0, 8)}…
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{t.clientName || "Unknown"}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{t.user_id.slice(0, 8)}...</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                              isDeposit ? "bg-green-500/10" : isWithdraw ? "bg-red-500/10" : "bg-blue-500/10"
                            )}>
                              {isDeposit
                                ? <ArrowDownToLine className="h-3 w-3 text-green-500" />
                                : isWithdraw 
                                ? <ArrowUpFromLine className="h-3 w-3 text-red-500" />
                                : <Banknote className="h-3 w-3 text-blue-500" />}
                            </div>
                            <span className="capitalize font-medium text-sm">{t.type.replace("_", " ")}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {t.reference || t.detail || "—"}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-medium tabular-nums",
                          isDeposit ? "text-green-500" : isWithdraw ? "text-red-500" : ""
                        )}>
                          {isDeposit ? "+" : isWithdraw ? "-" : ""}{formatGHS(Math.abs(t.amount))}
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            t.status === "completed" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                            t.status === "pending" || t.status === "processing" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                            "bg-red-500/10 text-red-600 dark:text-red-400"
                          )}>
                            {t.status}
                          </span>
                        </TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                          {formatDateTime(t.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground group-hover:text-foreground"
                            onClick={() => setSelectedTx(t)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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

      {/* Transaction Details Sheet */}
      <Sheet open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl border-border/60 shadow-2xl bg-card overflow-y-auto p-0">
          <SheetHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/80 px-6 py-4 flex flex-row items-center justify-between">
            <div>
              <SheetTitle>Transaction Details</SheetTitle>
              <SheetDescription className="font-mono text-[11px] mt-0.5">REF: {selectedTx?.id}</SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 text-brand-bronze hover:text-brand-bronze hover:bg-brand-orange/10 border-brand-orange/30"
                onClick={() => setIsPrintModalOpen(true)}
              >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Print Receipt</span>
              </Button>
            </div>
          </SheetHeader>
          
          {selectedTx && (
            <div className="p-6 sm:p-10 space-y-10">
              {/* Hero Banner */}
              <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-2xl border border-border/60 shadow-sm">
                <div className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm mb-4",
                  selectedTx.type === "deposit" ? "bg-emerald-500/10 text-emerald-500" : selectedTx.type === "withdraw" ? "bg-rose-500/10 text-rose-500" : "bg-blue-500/10 text-blue-500"
                )}>
                  {selectedTx.type === "deposit" ? (
                    <ArrowDownToLine className="h-8 w-8" />
                  ) : selectedTx.type === "withdraw" ? (
                    <ArrowUpFromLine className="h-8 w-8" />
                  ) : (
                    <Banknote className="h-8 w-8" />
                  )}
                </div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Amount {selectedTx.type === "deposit" ? "Received" : selectedTx.type === "withdraw" ? "Transferred" : "Processed"}
                </p>
                <h2 className="text-5xl font-display font-bold tracking-tight text-foreground">
                  {formatGHS(Math.abs(selectedTx.amount))}
                </h2>
                <div className="mt-4">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-sm",
                    selectedTx.status === "completed" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
                    selectedTx.status === "pending" || selectedTx.status === "processing" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                    "bg-red-500/15 text-red-600 dark:text-red-400"
                  )}>
                    {selectedTx.status === "completed" && <CheckCircle className="h-3.5 w-3.5" />}
                    {selectedTx.status}
                  </span>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="space-y-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Comprehensive Details
                </h3>
                <Card className="overflow-hidden border-border/60 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/60">
                    <div className="p-5 space-y-4 bg-muted/10">
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Client Name</p>
                        <p className="text-sm font-medium">{selectedTx.clientName || "Unknown Client"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Client ID</p>
                        <p className="text-xs font-mono bg-background px-2 py-1 rounded border border-border/50 inline-block shadow-sm text-muted-foreground">{selectedTx.user_id}</p>
                      </div>
                    </div>
                    <div className="p-5 space-y-4 bg-background">
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Date & Time</p>
                        <p className="text-sm font-medium">{formatDateTime(selectedTx.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Transaction Type</p>
                        <p className="text-sm font-medium capitalize">{selectedTx.type.replace("_", " ")}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-border/60 p-5 bg-background">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Payment Reference / Detail</p>
                    <p className="text-sm">{selectedTx.detail || selectedTx.reference || "No additional reference provided."}</p>
                  </div>
                </Card>
              </div>

              {/* Footer Actions */}
              <div className="pt-6 pb-8 flex items-center justify-between border-t border-border/60">
                <Button variant="ghost" onClick={() => setSelectedTx(null)}>Close Drawer</Button>
                <Button 
                  onClick={() => setIsPrintModalOpen(true)}
                  className="bg-brand-navy hover:bg-brand-navy-light text-white shadow-md gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Generate Receipt
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <PrintableTransactionReceipt 
        open={isPrintModalOpen} 
        onOpenChange={setIsPrintModalOpen} 
        transaction={selectedTx} 
      />
    </div>
  );
}
