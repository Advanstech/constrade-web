"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, CheckCircle } from "lucide-react";
import type { Transaction } from "@/lib/api.types";
import { formatGHS, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type AdminTx = Transaction & { clientName?: string, status?: string };

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
  const handlePrint = () => {
    window.print();
  };

  if (!transaction) return null;
  
  const isDeposit = transaction.type === "deposit";
  const isWithdraw = transaction.type === "withdraw";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto p-0 print:border-none print:shadow-none sm:rounded-xl">
        <DialogHeader className="no-print sticky top-0 z-20 flex flex-row items-center justify-between border-b border-border/80 bg-background/95 px-6 py-4 backdrop-blur">
          <div>
            <DialogTitle className="text-base font-semibold">Official Receipt</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Branded receipt for client sharing and PDF archival.
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="bg-brand-bronze text-white hover:bg-brand-bronze/90 gap-1.5 shadow-sm">
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Paper Canvas */}
        <div className="print-only:p-0 bg-card p-6 sm:p-10 text-foreground" id="printable-receipt-container">
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
                      CONSTANT CAPITAL
                    </h1>
                    <p className="text-xs font-medium text-brand-bronze">
                      Official Payment Receipt
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground pt-1">
                  Heritage Tower, 6th Floor, Ambassadorial Enclave, Ridge, Accra
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block rounded border border-border/80 bg-muted/40 px-2.5 py-1 text-[11px] font-mono font-semibold">
                  REC-{transaction.id.slice(0,8).toUpperCase()}
                </span>
                <p className="mt-1 text-[11px] text-muted-foreground">Date: {formatDateTime(transaction.created_at)}</p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-center py-6 bg-muted/20 rounded-xl border border-border/60">
                <div className="text-center">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Amount {isDeposit ? 'Received' : isWithdraw ? 'Transferred' : 'Processed'}</p>
                    <h2 className="text-4xl font-display font-bold text-foreground">
                        {formatGHS(Math.abs(transaction.amount))}
                    </h2>
                    <div className="mt-3 flex items-center justify-center gap-2">
                        <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider",
                            transaction.status === "completed" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                            transaction.status === "pending" || transaction.status === "processing" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                            "bg-red-500/10 text-red-600 dark:text-red-400"
                        )}>
                            {transaction.status === "completed" && <CheckCircle className="h-3 w-3" />}
                            {transaction.status}
                        </span>
                    </div>
                </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="mt-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Transaction Details
            </h3>
            <table className="w-full text-left text-sm border border-border/80 rounded-lg overflow-hidden">
                <tbody className="divide-y divide-border/60">
                    <tr>
                        <td className="p-3 bg-muted/30 font-medium w-1/3">Client Name</td>
                        <td className="p-3 font-semibold">{transaction.clientName || "—"}</td>
                    </tr>
                    <tr>
                        <td className="p-3 bg-muted/30 font-medium">Client ID</td>
                        <td className="p-3 font-mono text-xs">{transaction.user_id}</td>
                    </tr>
                    <tr>
                        <td className="p-3 bg-muted/30 font-medium">Transaction Type</td>
                        <td className="p-3 capitalize">{transaction.type.replace("_", " ")}</td>
                    </tr>
                    <tr>
                        <td className="p-3 bg-muted/30 font-medium">Reference</td>
                        <td className="p-3">{transaction.reference || "N/A"}</td>
                    </tr>
                    <tr>
                        <td className="p-3 bg-muted/30 font-medium">Payment Details</td>
                        <td className="p-3">{transaction.detail || "—"}</td>
                    </tr>
                    <tr>
                        <td className="p-3 bg-muted/30 font-medium">Transaction ID</td>
                        <td className="p-3 font-mono text-xs">{transaction.id}</td>
                    </tr>
                </tbody>
            </table>
          </div>

          {/* Footer Disclaimer */}
          <div className="mt-12 border-t border-border/80 pt-6 print-break-inside-avoid">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <strong>NOTICE:</strong> This receipt is electronically generated and serves as official confirmation of the transaction processed through Constant Capital (Ghana) Limited. If you have any questions regarding this transaction, please contact our support desk immediately.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-12 pt-4">
              <div className="border-t border-dashed border-border/90 pt-2">
                <p className="text-[10px] text-muted-foreground">Authorized Signature / Digital Stamp</p>
                <div className="h-6" />
                <p className="text-[10px] font-mono text-muted-foreground">Verified: CCGH-SYS</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
