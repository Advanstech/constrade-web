"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Printer,
  CheckCircle,
  ShieldCheck,
  Clock,
  XCircle,
  Copy,
  Check,
} from "lucide-react";
import type { Transaction } from "@/lib/api.types";
import { formatGHS, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type AdminTx = Transaction & { clientName?: string; status?: string };

interface PrintableTransactionReceiptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: AdminTx | null;
}

export function PrintableTransactionReceipt({
  open,
  onOpenChange,
  transaction,
}: PrintableTransactionReceiptProps) {
  const [copiedId, setCopiedId] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  if (!transaction) return null;

  const isDeposit = transaction.type === "deposit";
  const isWithdraw = transaction.type === "withdraw";
  const statusLower = (transaction.status || "completed").toLowerCase();
  const isCompleted = statusLower === "completed";
  const isPending = statusLower === "pending" || statusLower === "processing";

  const receiptNo = `REC-${transaction.id.slice(0, 8).toUpperCase()}`;
  const verificationCode = `CCGH-${transaction.id.slice(0, 4).toUpperCase()}-${transaction.user_id.slice(0, 4).toUpperCase()}`;

  const handleCopyReceiptNo = () => {
    navigator.clipboard?.writeText(receiptNo);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto p-0 print:max-h-none print:overflow-visible print:border-none print:shadow-none sm:rounded-2xl">
        <DialogHeader className="no-print sticky top-0 z-20 flex flex-row items-center justify-between border-b border-border/80 bg-background/95 px-6 py-4 backdrop-blur">
          <div>
            <DialogTitle className="text-base font-semibold">
              Official Receipt
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Branded institutional receipt for client sharing and PDF archival.
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2 pr-6">
            <Button
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 bg-brand-bronze text-white shadow-sm hover:bg-brand-bronze/90"
            >
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Paper Canvas — always styled like crisp institutional document paper */}
        <div
          className="relative overflow-hidden bg-white text-slate-900 print:p-0"
          id="printable-receipt-container"
        >
          {/* Top Brand Accent Strip */}
          <div className="flex h-2 w-full">
            <div className="h-full w-2/3 bg-[#0F102F]" />
            <div className="h-full w-1/3 bg-[#F7821E]" />
          </div>

          {/* Subtle Diagonal Watermark */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.028] select-none"
          >
            <span className=" -rotate-12 font-display text-6xl font-black tracking-[0.2em] text-[#0F102F] uppercase">
              CONSTANT CAPITAL
            </span>
          </div>

          <div className="relative z-10 p-6 sm:p-10">
            {/* Institutional Letterhead */}
            <div className="flex flex-col gap-5 border-b-2 border-[#0F102F]/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center gap-3.5">
                  <img
                    src="/branding/brand_logo_light.png"
                    alt="Constant Capital — Broker Dealer"
                    className="h-12 w-auto object-contain"
                  />
                </div>
                <div className="space-y-0.5 pt-0.5 text-[11px] leading-relaxed text-slate-500">
                  <p className="font-semibold text-slate-700">
                    Constant Capital (Ghana) Limited
                  </p>
                  <p>
                    Heritage Tower, 6th Floor, Ambassadorial Enclave, Ridge,
                    Accra
                  </p>
                  <p>
                    Tel: +233 (0) 302 660 000 · info@constantcap.com.gh ·
                    SEC/GSE Licensed
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-start sm:items-end">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[#0F102F] px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-white uppercase">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#F7821E]" />
                  Official Payment Receipt
                </span>
                <button
                  type="button"
                  onClick={handleCopyReceiptNo}
                  title="Copy Receipt Number"
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs font-bold text-slate-800 transition-colors hover:border-[#F7821E]/40 hover:bg-orange-50/50"
                >
                  {receiptNo}
                  {copiedId ? (
                    <Check className="no-print h-3 w-3 text-emerald-600" />
                  ) : (
                    <Copy className="no-print h-3 w-3 text-slate-400" />
                  )}
                </button>
                <p className="mt-1.5 text-[11px] font-medium text-slate-500">
                  Issued: {formatDateTime(transaction.created_at)}
                </p>
              </div>
            </div>

            {/* Hero Settlement Box */}
            <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white shadow-sm">
              <div className="flex flex-col items-center justify-center px-6 py-6 text-center">
                <p className="text-[11px] font-bold tracking-[0.16em] text-slate-500 uppercase">
                  Amount{" "}
                  {isDeposit
                    ? "Received"
                    : isWithdraw
                      ? "Transferred"
                      : "Processed"}
                </p>
                <h2 className="mt-1.5 font-display text-4xl font-extrabold tracking-tight text-[#0F102F]">
                  {formatGHS(Math.abs(transaction.amount))}
                </h2>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-wider uppercase",
                      isCompleted
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : isPending
                          ? "border border-amber-200 bg-amber-50 text-amber-700"
                          : "border border-red-200 bg-red-50 text-red-700",
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    ) : isPending ? (
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-600" />
                    )}
                    {transaction.status || "COMPLETED"}
                  </span>
                </div>
              </div>

              {/* 3-Column Sub-Strip */}
              <div className="grid grid-cols-3 divide-x divide-slate-200/80 border-t border-slate-200/80 bg-slate-50/70 px-4 py-3 text-center text-xs">
                <div>
                  <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                    Currency
                  </p>
                  <p className="mt-0.5 font-semibold text-slate-800">
                    Ghana Cedi (GHS)
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                    Transaction Type
                  </p>
                  <p className="mt-0.5 font-semibold text-slate-800 capitalize">
                    {transaction.type.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                    Verification Code
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] font-semibold text-slate-800">
                    {verificationCode}
                  </p>
                </div>
              </div>
            </div>

            {/* Structured Particulars Table */}
            <div className="mt-7">
              <div className="mb-2.5 flex items-center justify-between">
                <h3 className="text-[11px] font-bold tracking-[0.14em] text-slate-500 uppercase">
                  Transaction &amp; Client Particulars
                </h3>
                <span className="text-[10px] font-medium text-slate-400">
                  Custody &amp; Brokerage Ledger
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-slate-200/80">
                    <tr>
                      <td className="w-2/5 bg-slate-50/80 px-4 py-3 text-xs font-semibold text-slate-500">
                        Client Full Name
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {transaction.clientName || "—"}
                      </td>
                    </tr>
                    <tr>
                      <td className="bg-slate-50/80 px-4 py-3 text-xs font-semibold text-slate-500">
                        Client Account ID
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {transaction.user_id}
                      </td>
                    </tr>
                    <tr>
                      <td className="bg-slate-50/80 px-4 py-3 text-xs font-semibold text-slate-500">
                        Transaction Category
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 capitalize">
                        {isDeposit
                          ? "Client Wallet Deposit"
                          : isWithdraw
                            ? "Client Wallet Withdrawal"
                            : transaction.type.replace("_", " ")}
                      </td>
                    </tr>
                    <tr>
                      <td className="bg-slate-50/80 px-4 py-3 text-xs font-semibold text-slate-500">
                        Payment Reference
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-medium text-slate-800">
                        {transaction.reference || "N/A"}
                      </td>
                    </tr>
                    <tr>
                      <td className="bg-slate-50/80 px-4 py-3 text-xs font-semibold text-slate-500">
                        Narration / Channel Details
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {transaction.detail || "—"}
                      </td>
                    </tr>
                    <tr>
                      <td className="bg-slate-50/80 px-4 py-3 text-xs font-semibold text-slate-500">
                        Ledger Transaction ID
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {transaction.id}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Institutional Stamp & Regulatory Disclaimer Footer */}
            <div className="print-break-inside-avoid mt-8 border-t border-slate-200 pt-6">
              <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                <div className="max-w-md space-y-2">
                  <p className="text-[10.5px] leading-relaxed text-slate-500">
                    <strong className="font-semibold text-slate-700">
                      OFFICIAL NOTICE:
                    </strong>{" "}
                    This receipt is electronically generated by the Constant
                    Trade institutional ledger and serves as official
                    confirmation of the transaction processed through{" "}
                    <span className="font-medium text-slate-700">
                      Constant Capital (Ghana) Limited
                    </span>
                    , a Broker-Dealer licensed by the Securities &amp; Exchange
                    Commission (SEC) of Ghana and a Dealing Member of the Ghana
                    Stock Exchange (GSE).
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Need assistance? Contact Brokerage Operations at{" "}
                    <span className="font-medium text-slate-600">
                      support@constantcap.com.gh
                    </span>
                  </p>
                </div>

                {/* Official Digital Verification Stamp */}
                <div className="shrink-0">
                  <div className="inline-flex flex-col items-center rounded-xl border-2 border-dashed border-[#0F102F]/25 bg-slate-50/70 px-4 py-2.5 text-center">
                    <div className="flex items-center gap-1.5">
                      <img
                        src="/branding/app_icon.png"
                        alt="CC"
                        className="h-4 w-4 rounded-sm object-contain"
                      />
                      <span className="font-display text-[10px] font-extrabold tracking-[0.14em] text-[#0F102F] uppercase">
                        Constant Capital
                      </span>
                    </div>
                    <span className="mt-0.5 text-[9px] font-bold tracking-[0.18em] text-[#F7821E] uppercase">
                      Digitally Verified
                    </span>
                    <span className="mt-1 font-mono text-[9.5px] text-slate-500">
                      {verificationCode}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
