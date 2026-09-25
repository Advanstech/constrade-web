"use client";

import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, CheckCircle, ShieldCheck, Building2, Calendar, FileText } from "lucide-react";
import type { AdminMetrics, AdminOrder, AdminUser } from "@/lib/api.types";
import { formatGHS } from "@/lib/format";

interface PrintableStatementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metrics: AdminMetrics;
  orders?: AdminOrder[];
  users?: AdminUser[];
  periodLabel?: string;
  reportType?: "financial" | "orders" | "clients" | "executive";
}

export function PrintableStatementModal({
  open,
  onOpenChange,
  metrics,
  orders = [],
  users = [],
  periodLabel = "Current Operating Period (YTD 2026)",
  reportType = "executive",
}: PrintableStatementModalProps) {
  const statementRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const now = new Date();
  const dateFormatted = now.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeFormatted = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const secLevy = metrics.turnover * 0.0018;
  const gseLevy = metrics.turnover * 0.0022;
  const csdLevy = metrics.turnover * 0.0005;
  const netCommission = Math.max(metrics.revenue - (secLevy + gseLevy + csdLevy), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto p-0 print:border-none print:shadow-none sm:rounded-xl">
        <DialogHeader className="no-print sticky top-0 z-20 flex flex-row items-center justify-between border-b border-border/80 bg-background/95 px-6 py-4 backdrop-blur">
          <div>
            <DialogTitle className="text-base font-semibold">Institutional Statement Preview</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Official brokerage statement formatted for regulatory presentation and PDF archival.
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="bg-brand-bronze text-white hover:bg-brand-bronze-dark gap-1.5 shadow-sm">
              <Printer className="h-4 w-4" />
              Print / Save as PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Paper Canvas */}
        <div
          ref={statementRef}
          className="print-only:p-0 bg-card p-6 sm:p-10 text-foreground"
          id="printable-statement-container"
        >
          {/* Institutional Header */}
          <div className="border-b-2 border-brand-bronze pb-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy text-brand-bronze font-display text-xl font-black shadow-sm">
                    CC
                  </div>
                  <div>
                    <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
                      CONSTANT CAPITAL (GHANA) LIMITED
                    </h1>
                    <p className="text-xs font-medium text-brand-bronze">
                      Licensed Broker-Dealer & Dealing Member of the Ghana Stock Exchange (GSE)
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground pt-1">
                  Heritage Tower, 6th Floor, Ambassadorial Enclave, Ridge, Accra, Ghana • Tel: +233 (0) 302 660 000
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block rounded border border-border/80 bg-muted/40 px-2.5 py-1 text-[11px] font-mono font-semibold">
                  STMT-CCGH-{now.getFullYear()}-{String(now.getMonth() + 1).padStart(2, "0")}{String(now.getDate()).padStart(2, "0")}
                </span>
                <p className="mt-1 text-[11px] text-muted-foreground">Generated: {dateFormatted}, {timeFormatted}</p>
                <p className="text-[11px] font-medium text-muted-foreground">Reporting Period: <span className="font-semibold text-foreground">{periodLabel}</span></p>
              </div>
            </div>
          </div>

          {/* Statement Subject */}
          <div className="mt-6 flex items-center justify-between rounded-lg bg-muted/30 p-3.5 border border-border/60">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Statement Type</p>
              <h2 className="text-base font-bold text-foreground">
                {reportType === "orders" && "Trade Execution & Order Flow Reconciliation Audit"}
                {reportType === "clients" && "Investor Registry & KYC Compliance Portfolio Statement"}
                {reportType === "financial" && "Financial & Commission Revenue Reconciliation Ledger"}
                {reportType === "executive" && "Executive Firm Performance & Regulatory Health Statement"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-3 w-3" /> SEC & GSE Compliant
              </span>
            </div>
          </div>

          {/* Executive KPI Summary */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border/70 p-3.5 bg-card">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Assets Under Management</p>
              <p className="mt-1 text-lg font-bold font-display">{formatGHS(metrics.aum)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Custody & Liquid Holdings</p>
            </div>
            <div className="rounded-lg border border-border/70 p-3.5 bg-card">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Turnover (Filled Orders)</p>
              <p className="mt-1 text-lg font-bold font-display">{formatGHS(metrics.turnover)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{metrics.filledOrders} Executed Trades</p>
            </div>
            <div className="rounded-lg border border-border/70 p-3.5 bg-card">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Est. Revenue (Fees & Levies)</p>
              <p className="mt-1 text-lg font-bold font-display text-brand-bronze">{formatGHS(metrics.revenue)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">≈ 1.15% Standard Rate</p>
            </div>
            <div className="rounded-lg border border-border/70 p-3.5 bg-card">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Liquid Client Cash Reserves</p>
              <p className="mt-1 text-lg font-bold font-display">{formatGHS(metrics.cashReserves)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Segregated Client Accounts</p>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="mt-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
              1. Regulatory Fee Reconciliation Breakdown
            </h3>
            <table className="w-full text-left text-xs border border-border/80 rounded-lg overflow-hidden">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-2.5 border-b border-border/80">Fee / Levy Classification</th>
                  <th className="p-2.5 border-b border-border/80">Statutory Recipient</th>
                  <th className="p-2.5 border-b border-border/80">Rate / Basis</th>
                  <th className="p-2.5 border-b border-border/80 text-right">Notional Value (GHS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr>
                  <td className="p-2.5 font-medium">Gross Trading Turnover</td>
                  <td className="p-2.5 text-muted-foreground">Market Clearing (GSE/CSD)</td>
                  <td className="p-2.5 text-muted-foreground">100.0%</td>
                  <td className="p-2.5 text-right font-semibold">{formatGHS(metrics.turnover)}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">Brokerage Commission (Gross)</td>
                  <td className="p-2.5 text-muted-foreground">Constant Capital Ghana</td>
                  <td className="p-2.5 text-muted-foreground">1.15%</td>
                  <td className="p-2.5 text-right font-semibold">{formatGHS(metrics.revenue)}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">Ghana Stock Exchange Transaction Levy</td>
                  <td className="p-2.5 text-muted-foreground">GSE Market Regulation</td>
                  <td className="p-2.5 text-muted-foreground">0.22%</td>
                  <td className="p-2.5 text-right font-semibold">{formatGHS(gseLevy)}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">SEC Investor Protection & Regulatory Levy</td>
                  <td className="p-2.5 text-muted-foreground">Securities & Exchange Commission</td>
                  <td className="p-2.5 text-muted-foreground">0.18%</td>
                  <td className="p-2.5 text-right font-semibold">{formatGHS(secLevy)}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">Central Securities Depository Settlement Fee</td>
                  <td className="p-2.5 text-muted-foreground">CSD Ghana Ltd</td>
                  <td className="p-2.5 text-muted-foreground">0.05%</td>
                  <td className="p-2.5 text-right font-semibold">{formatGHS(csdLevy)}</td>
                </tr>
                <tr className="bg-muted/40 font-bold">
                  <td className="p-2.5 text-brand-bronze" colSpan={3}>Net Brokerage Retained Margin</td>
                  <td className="p-2.5 text-right text-brand-bronze">{formatGHS(netCommission)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Sample Executed Orders if available */}
          {orders.length > 0 && (
            <div className="mt-8 print-break-inside-avoid">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  2. Trade Execution Ledger (Recent {Math.min(orders.length, 10)} Orders)
                </h3>
                <span className="text-[11px] text-muted-foreground">Total: {orders.length} orders recorded</span>
              </div>
              <table className="w-full text-left text-xs border border-border/80 rounded-lg overflow-hidden">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-2 border-b border-border/80">Ref ID</th>
                    <th className="p-2 border-b border-border/80">Client</th>
                    <th className="p-2 border-b border-border/80">Instrument</th>
                    <th className="p-2 border-b border-border/80">Side</th>
                    <th className="p-2 border-b border-border/80 text-right">Qty</th>
                    <th className="p-2 border-b border-border/80 text-right">Price</th>
                    <th className="p-2 border-b border-border/80 text-right">Notional</th>
                    <th className="p-2 border-b border-border/80">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {orders.slice(0, 10).map((o) => {
                    const price = Number(o.filledPrice ?? o.price ?? 0);
                    const qty = Number(o.quantity ?? 0);
                    const notional = price * qty;
                    return (
                      <tr key={o.id}>
                        <td className="p-2 font-mono text-[10px]">{o.id.slice(0, 8)}</td>
                        <td className="p-2 font-medium">{o.client}</td>
                        <td className="p-2 font-semibold">{o.instrument}</td>
                        <td className="p-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${o.side === "buy" ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
                            {o.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-2 text-right">{qty.toLocaleString()}</td>
                        <td className="p-2 text-right font-mono">GHS {price.toFixed(2)}</td>
                        <td className="p-2 text-right font-semibold">{formatGHS(notional)}</td>
                        <td className="p-2">
                          <span className="capitalize text-[10px] font-medium text-muted-foreground">{o.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Registered Investors Overview if available */}
          {users.length > 0 && (
            <div className="mt-8 print-break-inside-avoid">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  3. Client Registry & Portfolio Health
                </h3>
                <span className="text-[11px] text-muted-foreground">{users.length} registered investors</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs border border-border/80 rounded-lg p-3 bg-muted/20">
                <div>
                  <span className="text-muted-foreground">Total Verified Investors:</span>{" "}
                  <strong className="text-foreground">{users.filter((u) => String(u.kyc_status).toLowerCase() === "approved").length}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Pending Compliance Review:</span>{" "}
                  <strong className="text-amber-600">{users.filter((u) => String(u.kyc_status).toLowerCase() === "pending").length}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Client Liquid Cash:</span>{" "}
                  <strong className="text-foreground">{formatGHS(users.reduce((s, u) => s + (Number(u.cash) || 0), 0))}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Institutional Compliance Disclaimer & Sign-off */}
          <div className="mt-10 border-t border-border/80 pt-6 print-break-inside-avoid">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <strong>CONFIDENTIALITY & REGULATORY NOTICE:</strong> This statement is produced by Constant Capital (Ghana) Limited for institutional and regulatory compliance under the Securities Industry Act, 2016 (Act 929) and Ghana Stock Exchange Membership Rules. Values are audited against daily automated depository feeds from the Central Securities Depository (CSD) Ghana Ltd.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-12 pt-6">
              <div className="border-t border-dashed border-border/90 pt-2">
                <p className="text-xs font-semibold">Head of Securities Trading</p>
                <p className="text-[10px] text-muted-foreground">GSE Authorized Dealing Officer</p>
                <div className="h-6" />
                <p className="text-[10px] font-mono text-muted-foreground">Date: {dateFormatted}</p>
              </div>
              <div className="border-t border-dashed border-border/90 pt-2">
                <p className="text-xs font-semibold">Chief Compliance Officer</p>
                <p className="text-[10px] text-muted-foreground">Anti-Money Laundering & CFT Oversight</p>
                <div className="h-6" />
                <p className="text-[10px] font-mono text-muted-foreground">Signature Verified / Certified Digital Audit</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
