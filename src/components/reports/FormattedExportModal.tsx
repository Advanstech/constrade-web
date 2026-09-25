"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  CheckCircle2,
  Calendar,
  Loader2,
  Table as TableIcon,
  ShieldAlert,
} from "lucide-react";
import type { AdminDashboardData, AdminOrder, AdminUser, AdminAuditLog, AdminBid } from "@/lib/api.types";
import { adminApi } from "@/lib/api";
import {
  exportOrdersReport,
  exportClientsReport,
  exportFinancialLedgerReport,
  exportAuditLogsReport,
  exportAuctionBidsReport,
} from "@/lib/exportUtils";

interface FormattedExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardData: AdminDashboardData | null;
  orders: AdminOrder[] | null;
  users: AdminUser[] | null;
  onOpenPrintStatement?: (type: "financial" | "orders" | "clients" | "executive") => void;
}

type ReportKind = "orders" | "clients" | "financial" | "audit" | "bids" | "issuance";

export function FormattedExportModal({
  open,
  onOpenChange,
  dashboardData,
  orders,
  users,
  onOpenPrintStatement,
}: FormattedExportModalProps) {
  const [selectedReport, setSelectedReport] = useState<ReportKind>("orders");
  const [period, setPeriod] = useState<string>("All Time");
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: "formatted_csv" | "print_pdf" | "raw_backend") => {
    setExporting(true);
    try {
      if (format === "print_pdf") {
        onOpenChange(false);
        if (onOpenPrintStatement) {
          const stmtType = selectedReport === "orders" ? "orders" : selectedReport === "clients" ? "clients" : "executive";
          onOpenPrintStatement(stmtType);
        } else {
          window.print();
        }
        return;
      }

      if (selectedReport === "orders") {
        if (format === "formatted_csv") {
          const list = orders ?? (await adminApi.orders());
          exportOrdersReport(list, period);
          toast.success("Trade execution report exported (formatted CSV)");
        }
      } else if (selectedReport === "clients") {
        if (format === "raw_backend") {
          await adminApi.exportUsers();
          toast.success("Investor registry exported from core API");
        } else {
          const list = users ?? (await adminApi.users());
          exportClientsReport(list, period);
          toast.success("Client registry exported (formatted CSV)");
        }
      } else if (selectedReport === "financial") {
        if (dashboardData) {
          exportFinancialLedgerReport(
            dashboardData.metrics,
            dashboardData.chart.volumeByClass,
            period,
          );
          toast.success("Financial ledger exported (formatted CSV)");
        }
      } else if (selectedReport === "audit") {
        if (format === "raw_backend") {
          await adminApi.exportAuditReportsCsv();
          toast.success("Audit logs exported from core API");
        } else {
          const logs = await adminApi.auditLogs();
          exportAuditLogsReport(logs, period);
          toast.success("Compliance audit report exported (formatted CSV)");
        }
      } else if (selectedReport === "bids") {
        if (format === "raw_backend") {
          await adminApi.exportBidsCsv();
          toast.success("T-Bill bid book exported from core API");
        } else {
          const bids = await adminApi.bids();
          exportAuctionBidsReport(bids, period);
          toast.success("Auction bid book exported (formatted CSV)");
        }
      } else if (selectedReport === "issuance") {
        await adminApi.exportIssuanceCalendarPdf();
        toast.success("GSE Issuance calendar PDF downloaded");
      }
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Export generation failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const REPORT_OPTIONS: {
    id: ReportKind;
    title: string;
    description: string;
    icon: typeof FileSpreadsheet;
    count?: number;
    recommendedFormat: "CSV" | "PDF";
  }[] = [
    {
      id: "orders",
      title: "Trade Execution & Order Flow",
      description: "Detailed trade matching, side, limit prices, fees, and execution status.",
      icon: TableIcon,
      count: orders?.length,
      recommendedFormat: "CSV",
    },
    {
      id: "clients",
      title: "Client Portfolio & KYC Registry",
      description: "Investor CSD accounts, KYC tier verification, liquid balances, and wealth ranking.",
      icon: FileSpreadsheet,
      count: users?.length,
      recommendedFormat: "CSV",
    },
    {
      id: "financial",
      title: "Financial Ledger & Fee Reconciliation",
      description: "Firm turnover, 1.15% brokerage commission, GSE levies (0.22%), and SEC fees (0.18%).",
      icon: FileText,
      recommendedFormat: "CSV",
    },
    {
      id: "audit",
      title: "System Audit & Compliance Log",
      description: "Complete trace of staff actions, settlement verifications, and compliance edits.",
      icon: ShieldAlert,
      recommendedFormat: "CSV",
    },
    {
      id: "bids",
      title: "T-Bill Primary Market Bid Book",
      description: "Auction tenders, allotment rates, discount yields, and settlement state.",
      icon: FileSpreadsheet,
      recommendedFormat: "CSV",
    },
    {
      id: "issuance",
      title: "GSE Issuance Calendar",
      description: "Official Bank of Ghana & GSE issuance schedule with tenors and auction dates.",
      icon: Calendar,
      recommendedFormat: "PDF",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:rounded-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-bronze/10 text-brand-bronze">
              <Download className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Institutional Export Hub</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Generate formatted, regulatory-ready reports with metadata headers and totals.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Step 1: Select Report */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select Report Type
            </label>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {REPORT_OPTIONS.map((opt) => {
                const isSelected = selectedReport === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedReport(opt.id)}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                      isSelected
                        ? "border-brand-bronze bg-brand-bronze/5 ring-1 ring-brand-bronze"
                        : "border-border/70 hover:border-border hover:bg-muted/40"
                    }`}
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${isSelected ? "text-brand-bronze" : "text-muted-foreground"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-semibold ${isSelected ? "text-foreground" : "text-foreground/90"}`}>
                          {opt.title}
                        </p>
                        {opt.count !== undefined && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                            {opt.count}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Reporting Period */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Reporting Scope / Period
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {["All Time", "Last 30 Days", "Current Quarter (Q3)", "Year to Date (2026)"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    period === p
                      ? "bg-brand-navy text-white dark:bg-brand-bronze"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Format Highlights Box */}
          <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1.5">
            <div className="flex items-center gap-1.5 text-foreground font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5 text-brand-bronze" />
              <span>Formatted Export Guarantee</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Exported spreadsheets include UTF-8 BOM headers for Microsoft Excel & Google Sheets, SEC/GSE regulatory audit metadata, calculated financial totals rows, and formatted currency figures.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={exporting}>
            Cancel
          </Button>

          {selectedReport === "issuance" ? (
            <Button
              size="sm"
              onClick={() => void handleExport("raw_backend")}
              disabled={exporting}
              className="bg-brand-bronze text-white hover:bg-brand-bronze-dark gap-1.5"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download Official PDF
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleExport("print_pdf")}
                disabled={exporting}
                className="gap-1.5"
              >
                <Printer className="h-4 w-4" />
                Print / Save PDF
              </Button>

              <Button
                size="sm"
                onClick={() => void handleExport("formatted_csv")}
                disabled={exporting}
                className="bg-brand-bronze text-white hover:bg-brand-bronze-dark gap-1.5"
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                Download Formatted CSV
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
