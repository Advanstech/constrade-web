"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Landmark,
  Percent,
  RefreshCw,
  Search,
  Wallet,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadError } from "@/components/layout/LoadError";
import { StatCard } from "@/components/market/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/api";
import type { AdminBid } from "@/lib/api.types";
import { formatGHS } from "@/lib/format";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { exportAuctionBidsReport } from "@/lib/exportUtils";

export default function AuctionsReportPage() {
  const [bids, setBids] = useState<AdminBid[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const load = () => {
    setLoading(true);
    setError(false);
    adminApi
      .bids()
      .then(setBids)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filteredBids = useMemo(() => {
    if (!bids) return [];
    return bids.filter((b) => {
      const matchSearch =
        !search ||
        b.id.toLowerCase().includes(search.toLowerCase()) ||
        (b.auction?.instrumentName && b.auction.instrumentName.toLowerCase().includes(search.toLowerCase())) ||
        (b.auction?.isin && b.auction.isin.toLowerCase().includes(search.toLowerCase()));

      const matchStatus =
        statusFilter === "ALL" || b.status.toUpperCase() === statusFilter.toUpperCase();

      return matchSearch && matchStatus;
    });
  }, [bids, search, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const paginatedBids = filteredBids.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredBids.length / pageSize);

  const metrics = useMemo(() => {
    if (!bids) return { totalAmount: 0, totalAllotted: 0, avgRate: 0, acceptedCount: 0 };
    const totalAmount = bids.reduce((s, b) => s + Number(b.amount || 0), 0);
    const totalAllotted = bids.reduce((s, b) => s + Number(b.allottedAmount || 0), 0);
    const acceptedCount = bids.filter((b) => b.status.toUpperCase().includes("ACCEPTED") || b.status.toUpperCase().includes("CONFIRMED")).length;
    const avgRate = bids.length
      ? bids.reduce((s, b) => s + Number(b.rate || 0), 0) / bids.length
      : 0;

    return { totalAmount, totalAllotted, avgRate, acceptedCount };
  }, [bids]);

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <LoadError message="Could not load auction bids report." onRetry={load} />
      </div>
    );
  }

  if (loading || !bids) {
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
        <span className="font-semibold text-foreground">Primary Market & T-Bill Auction Bids</span>
      </div>

      <PageHeader
        title="GSE Primary Market & T-Bill Bid Book"
        subtitle="Government of Ghana Treasury Bill & Bond primary issuance auction bids, rate allotments, and settlements."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportAuctionBidsReport(filteredBids, "Primary Market Scope")}
              className="gap-1.5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-brand-bronze" /> Formatted CSV ({filteredBids.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void adminApi.exportBidsPdf()}
              className="gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" /> Official PDF Book
            </Button>
            <Button
              size="sm"
              onClick={() => void adminApi.exportIssuanceCalendarPdf()}
              className="bg-brand-bronze text-white hover:bg-brand-bronze-dark gap-1.5 shadow-sm"
            >
              <Calendar className="h-3.5 w-3.5" /> Issuance Calendar
            </Button>
          </div>
        }
      />

      {/* KPI Ribbon */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Tendered Bids"
          value={String(bids.length)}
          hint={`${metrics.acceptedCount} settled / accepted`}
          icon={<Landmark className="h-4 w-4 text-brand-bronze" />}
        />
        <StatCard
          label="Total Bid Face Value"
          value={formatGHS(metrics.totalAmount, { compact: true })}
          hint="Gross competitive tender notional"
          icon={<Wallet className="h-4 w-4 text-emerald-500" />}
        />
        <StatCard
          label="Allotted Value"
          value={formatGHS(metrics.totalAllotted, { compact: true })}
          hint="Bank of Ghana auction allotment"
          icon={<CheckCircle2 className="h-4 w-4 text-brand-bronze" />}
        />
        <StatCard
          label="Weighted Avg. Rate"
          value={`${metrics.avgRate.toFixed(2)}%`}
          hint="Annualized yield / discount"
          icon={<Percent className="h-4 w-4 text-brand-navy dark:text-blue-400" />}
        />
      </div>

      {/* Filters Bar */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bids by instrument, auction, or ISIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Status:
              </span>
              {["ALL", "PENDING", "ACCEPTED", "CONFIRMED", "REJECTED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    statusFilter === st
                      ? "bg-brand-navy text-white dark:bg-brand-bronze"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bids Table */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-bold">Primary Market Tender Book ({filteredBids.length})</CardTitle>
            <CardDescription className="text-xs">
              Official record of Bank of Ghana Treasury Bill & Bond auctions submitted on behalf of clients.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportAuctionBidsReport(filteredBids, "Primary Market Filtered")}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Export Filtered ({filteredBids.length})
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 uppercase tracking-wider text-muted-foreground font-bold text-[10px]">
                <tr>
                  <th className="p-3 border-b border-border/80">Bid ID</th>
                  <th className="p-3 border-b border-border/80">Security Type</th>
                  <th className="p-3 border-b border-border/80">Auction Instrument</th>
                  <th className="p-3 border-b border-border/80 text-right">Tender Amount</th>
                  <th className="p-3 border-b border-border/80 text-right">Bid Rate (%)</th>
                  <th className="p-3 border-b border-border/80">Status</th>
                  <th className="p-3 border-b border-border/80 text-right">Allotted Amount</th>
                  <th className="p-3 border-b border-border/80">Submission Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredBids.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No auction bids found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedBids.map((b) => {
                    const isAccepted = b.status.toUpperCase().includes("ACCEPTED") || b.status.toUpperCase().includes("CONFIRMED");
                    const isPending = b.status.toUpperCase() === "PENDING";

                    return (
                      <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-mono text-foreground font-semibold">
                          {b.id.slice(0, 8)}
                        </td>
                        <td className="p-3 font-medium text-foreground">
                          {b.auction?.securityType || "TREASURY_BILL"}
                        </td>
                        <td className="p-3 text-foreground font-semibold">
                          {b.auction?.instrumentName || "Government of Ghana Tender"}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold">
                          {formatGHS(Number(b.amount || 0))}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-brand-bronze">
                          {Number(b.rate || 0).toFixed(4)}%
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isAccepted
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : isPending
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-red-500/10 text-red-600 dark:text-red-400"
                            }`}
                          >
                            {isAccepted && <CheckCircle2 className="h-3 w-3" />}
                            {isPending && <Clock className="h-3 w-3" />}
                            {b.status}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-medium text-foreground">
                          {b.allottedAmount ? formatGHS(Number(b.allottedAmount)) : "—"}
                        </td>
                        <td className="p-3 text-muted-foreground font-mono text-[11px]">
                          {new Date(b.createdAt).toISOString().slice(0, 10)}
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
    </div>
  );
}
