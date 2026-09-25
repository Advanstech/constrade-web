"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  IdCard,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
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
import type { AdminUser } from "@/lib/api.types";
import { formatGHS } from "@/lib/format";
import { exportClientsReport } from "@/lib/exportUtils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { PrintableStatementModal } from "@/components/reports/PrintableStatementModal";

export default function ClientsReportPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [kycFilter, setKycFilter] = useState<string>("ALL");
  const [printOpen, setPrintOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const load = () => {
    setLoading(true);
    setError(false);
    adminApi
      .users()
      .then(setUsers)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => {
      const matchSearch =
        !search ||
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.csd_account && u.csd_account.toLowerCase().includes(search.toLowerCase()));

      const matchKyc =
        kycFilter === "ALL" || u.kyc_status.toLowerCase() === kycFilter.toLowerCase();

      return matchSearch && matchKyc;
    });
  }, [users, search, kycFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, kycFilter]);

  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredUsers.length / pageSize);

  const metrics = useMemo(() => {
    if (!users) return { totalCash: 0, approvedCount: 0, pendingCount: 0, verifiedCsd: 0 };
    const totalCash = users.reduce((s, u) => s + (Number(u.cash) || 0), 0);
    const approvedCount = users.filter((u) => u.kyc_status.toUpperCase() === "APPROVED").length;
    const pendingCount = users.filter((u) => u.kyc_status.toUpperCase() === "PENDING").length;
    const verifiedCsd = users.filter((u) => Boolean(u.csd_account)).length;

    return { totalCash, approvedCount, pendingCount, verifiedCsd };
  }, [users]);

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <LoadError message="Could not load client registry report." onRetry={load} />
      </div>
    );
  }

  if (loading || !users) {
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
        <span className="font-semibold text-foreground">Client Portfolio & KYC Compliance</span>
      </div>

      <PageHeader
        title="Investor Registry & KYC Compliance Report"
        subtitle="Audited register of verified investors, Central Securities Depository (CSD) trading accounts, and cash balances."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportClientsReport(filteredUsers, "Registry Filtered")}
              className="gap-1.5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-brand-bronze" /> Formatted CSV ({filteredUsers.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void adminApi.exportUsers()}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> Core Registry CSV
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
          label="Total Registered Clients"
          value={String(users.length)}
          hint={`${metrics.approvedCount} fully verified`}
          icon={<Users className="h-4 w-4 text-brand-bronze" />}
        />
        <StatCard
          label="Verified CSD Accounts"
          value={String(metrics.verifiedCsd)}
          hint={`${Math.round((metrics.verifiedCsd / (users.length || 1)) * 100)}% market-ready`}
          icon={<IdCard className="h-4 w-4 text-emerald-500" />}
        />
        <StatCard
          label="Pending Compliance Reviews"
          value={String(metrics.pendingCount)}
          hint="KYC review queue"
          icon={<Clock className="h-4 w-4 text-amber-500" />}
        />
        <StatCard
          label="Total Liquid Client Cash"
          value={formatGHS(metrics.totalCash, { compact: true })}
          hint="Segregated escrow pool"
          icon={<Wallet className="h-4 w-4 text-brand-bronze" />}
        />
      </div>

      {/* Filters Bar */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search investor by name, email, or CSD account..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> KYC Tier:
              </span>
              {["ALL", "APPROVED", "PENDING", "REJECTED"].map((k) => (
                <button
                  key={k}
                  onClick={() => setKycFilter(k)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    kycFilter === k
                      ? "bg-brand-navy text-white dark:bg-brand-bronze"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients Registry Table */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-bold">Investor Register ({filteredUsers.length})</CardTitle>
            <CardDescription className="text-xs">
              Complete investor portfolio, depository identification, and compliance verification status.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 uppercase tracking-wider text-muted-foreground font-bold text-[10px]">
                <tr>
                  <th className="p-3 border-b border-border/80">Investor Name</th>
                  <th className="p-3 border-b border-border/80">Email</th>
                  <th className="p-3 border-b border-border/80">Role</th>
                  <th className="p-3 border-b border-border/80">CSD Account #</th>
                  <th className="p-3 border-b border-border/80">KYC Status</th>
                  <th className="p-3 border-b border-border/80 text-right">Cash Reserves</th>
                  <th className="p-3 border-b border-border/80 text-right">Lifetime Orders</th>
                  <th className="p-3 border-b border-border/80">Joined Date</th>
                  <th className="p-3 border-b border-border/80 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      No investors found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u) => {
                    const isApproved = u.kyc_status.toUpperCase() === "APPROVED";
                    const isPending = u.kyc_status.toUpperCase() === "PENDING";
                    const hasCsd = Boolean(u.csd_account);

                    const uid = u.user_id || u.email;
                    return (
                      <tr key={uid} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-semibold text-foreground">
                          {u.full_name}
                        </td>
                        <td className="p-3 text-muted-foreground font-mono text-[11px]">
                          {u.email}
                        </td>
                        <td className="p-3 font-mono text-muted-foreground uppercase text-[10px]">
                          {u.role}
                        </td>
                        <td className="p-3">
                          {hasCsd ? (
                            <span className="font-mono font-semibold text-foreground">
                              {u.csd_account}
                            </span>
                          ) : (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
                              NOT ASSIGNED
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isApproved
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : isPending
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-red-500/10 text-red-600 dark:text-red-400"
                            }`}
                          >
                            {isApproved && <ShieldCheck className="h-3 w-3" />}
                            {isPending && <Clock className="h-3 w-3" />}
                            {u.kyc_status}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-semibold">
                          {formatGHS(Number(u.cash || 0))}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {u.orderCount}
                        </td>
                        <td className="p-3 text-muted-foreground font-mono text-[11px]">
                          {new Date(u.created_at).toISOString().slice(0, 10)}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[10px] gap-1"
                              onClick={() => void adminApi.exportUserKyc(u.user_id)}
                              title="Export KYC Profile PDF"
                            >
                              <FileCheck className="h-3 w-3 text-brand-bronze" /> KYC
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[10px] gap-1"
                              onClick={() => void adminApi.exportUserCsdForm(u.user_id)}
                              title="Export CSD Form PDF"
                            >
                              <FileText className="h-3 w-3 text-brand-navy dark:text-blue-400" /> CSD
                            </Button>
                          </div>
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
          aum: metrics.totalCash * 2.5,
          turnover: metrics.totalCash * 1.5,
          revenue: metrics.totalCash * 0.0115,
          cashReserves: metrics.totalCash,
          totalClients: users.length,
          newClients30d: 3,
          totalOrders: users.reduce((s, u) => s + (Number(u.orderCount) || 0), 0),
          pendingApprovals: metrics.pendingCount,
          filledOrders: 10,
        }}
        users={filteredUsers}
        periodLabel="Investor Registry Statement"
        reportType="clients"
      />
    </div>
  );
}
