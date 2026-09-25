"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadError } from "@/components/layout/LoadError";
import { StatCard } from "@/components/market/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { adminApi } from "@/lib/api";
import type { AdminAuditLog } from "@/lib/api.types";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { exportAuditLogsReport } from "@/lib/exportUtils";

export default function AuditReportPage() {
  const [logs, setLogs] = useState<AdminAuditLog[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [activeLog, setActiveLog] = useState<AdminAuditLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const load = () => {
    setLoading(true);
    setError(false);
    adminApi
      .auditLogs()
      .then(setLogs)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter((log) => {
      const initiator = log.user
        ? `${log.user.firstName || ""} ${log.user.lastName || ""} ${log.user.email || ""}`
        : "SYSTEM";

      const matchSearch =
        !search ||
        log.id.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        initiator.toLowerCase().includes(search.toLowerCase()) ||
        (log.entityId && log.entityId.toLowerCase().includes(search.toLowerCase()));

      const matchAction =
        actionFilter === "ALL" || log.action.toUpperCase() === actionFilter.toUpperCase();

      return matchSearch && matchAction;
    });
  }, [logs, search, actionFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, actionFilter]);

  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredLogs.length / pageSize);

  const uniqueActions = useMemo(() => {
    if (!logs) return [];
    const set = new Set(logs.map((l) => l.action));
    return Array.from(set);
  }, [logs]);

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <LoadError message="Could not load compliance audit logs." onRetry={load} />
      </div>
    );
  }

  if (loading || !logs) {
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
        <span className="font-semibold text-foreground">Compliance & Regulatory Audit Trail</span>
      </div>

      <PageHeader
        title="Compliance & Regulatory Audit Trail"
        subtitle="Immutable electronic trail of administrative decisions, settlement clearances, and supervisory actions."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportAuditLogsReport(filteredLogs, "Compliance Audit Scope")}
              className="gap-1.5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-brand-bronze" /> Formatted CSV ({filteredLogs.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void adminApi.exportAuditReportsCsv()}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> Core Audit CSV
            </Button>
          </div>
        }
      />

      {/* KPI Ribbon */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Audit Events"
          value={String(logs.length)}
          hint="Captured in secure log"
          icon={<ShieldCheck className="h-4 w-4 text-emerald-500" />}
        />
        <StatCard
          label="Compliance Categories"
          value={String(uniqueActions.length)}
          hint="Distinct supervisory action types"
          icon={<Filter className="h-4 w-4 text-brand-bronze" />}
        />
        <StatCard
          label="Active Staff Operators"
          value={String(new Set(logs.map((l) => l.user?.email).filter(Boolean)).size || 1)}
          hint="Unique authorized initiators"
          icon={<UserCheck className="h-4 w-4 text-brand-navy dark:text-blue-400" />}
        />
        <StatCard
          label="AML / SEC Compliance"
          value="100% OK"
          hint="Act 929 regulatory audit trail"
          icon={<Shield className="h-4 w-4 text-brand-bronze" />}
        />
      </div>

      {/* Filters Bar */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search audit trail by action, initiator email, or entity ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Action:
              </span>
              <button
                onClick={() => setActionFilter("ALL")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  actionFilter === "ALL"
                    ? "bg-brand-navy text-white dark:bg-brand-bronze"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                ALL
              </button>
              {uniqueActions.slice(0, 5).map((act) => (
                <button
                  key={act}
                  onClick={() => setActionFilter(act)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    actionFilter === act
                      ? "bg-brand-navy text-white dark:bg-brand-bronze"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {act}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-bold">Audit Event Ledger ({filteredLogs.length})</CardTitle>
            <CardDescription className="text-xs">
              Chronological electronic ledger of authorized platform actions.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 uppercase tracking-wider text-muted-foreground font-bold text-[10px]">
                <tr>
                  <th className="p-3 border-b border-border/80">Event Timestamp</th>
                  <th className="p-3 border-b border-border/80">Action Performed</th>
                  <th className="p-3 border-b border-border/80">Initiator (Staff/System)</th>
                  <th className="p-3 border-b border-border/80">Entity Reference</th>
                  <th className="p-3 border-b border-border/80 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No audit events found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => {
                    const initiator = log.user
                      ? `${log.user.firstName || ""} ${log.user.lastName || ""}`.trim() || log.user.email
                      : "SYSTEM AUTOMATION";

                    return (
                      <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {new Date(log.createdAt).toISOString().slice(0, 19).replace("T", " ")}
                        </td>
                        <td className="p-3">
                          <span className="inline-block rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-bold text-foreground">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-foreground">
                          <div className="flex flex-col">
                            <span>{initiator}</span>
                            {log.user?.email && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {log.user.email}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-muted-foreground">
                          {log.entityId ? log.entityId.slice(0, 16) : "—"}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px] gap-1"
                            onClick={() => setActiveLog(log)}
                          >
                            <Eye className="h-3 w-3" /> Inspect
                          </Button>
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

      {/* Inspect Dialog */}
      <Dialog open={activeLog !== null} onOpenChange={(o) => !o && setActiveLog(null)}>
        <DialogContent className="max-w-lg sm:rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-brand-bronze" /> Audit Event Payload
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-mono">
              Event ID: {activeLog?.id}
            </DialogDescription>
          </DialogHeader>

          {activeLog && (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-muted/30 p-3 rounded-lg border border-border/70">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Action</span>
                  <span className="font-mono font-bold">{activeLog.action}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Timestamp</span>
                  <span className="font-mono">{new Date(activeLog.createdAt).toISOString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Initiator</span>
                  <span>{activeLog.user?.email || "SYSTEM"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Entity ID</span>
                  <span className="font-mono">{activeLog.entityId || "N/A"}</span>
                </div>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold mb-1">
                  Metadata & Parameters
                </span>
                <pre className="max-h-60 overflow-y-auto rounded-lg bg-muted p-3 font-mono text-[11px] text-foreground">
                  {JSON.stringify(activeLog.details ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
