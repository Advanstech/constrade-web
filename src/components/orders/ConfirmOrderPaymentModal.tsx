"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, Upload, Check, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { adminApi } from "@/lib/api";
import type { AdminOrder, AdminUserDetail } from "@/lib/api.types";
import { cn } from "@/lib/utils";

export function ConfirmOrderPaymentModal({
  order,
  onClose,
  onConfirm,
}: {
  order: AdminOrder;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(true);
  const [userDetails, setUserDetails] = useState<AdminUserDetail | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmingOrder, setConfirmingOrder] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await adminApi.userDetail(order.user_id);
      setUserDetails(data);
    } catch (e) {
      toast.error("Failed to load client wallet details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  const fmt = (val: number) => `GHS ${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const handleClearDeposit = async (depositId: string) => {
    setProcessingId(depositId);
    try {
      await adminApi.confirmDeposit(depositId);
      toast.success("Deposit cleared successfully.");
      await loadData();
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err.message || "Failed to clear deposit.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmOrder = async () => {
    setConfirmingOrder(true);
    try {
      await onConfirm();
    } catch (e) {
      // Error handled by parent
    } finally {
      setConfirmingOrder(false);
    }
  };

  const isBuy = order.side.toLowerCase() === "buy";
  const requiredAmount = isBuy ? (order.totalAmount ?? order.quantity * (order.price ?? 0)) + order.fees : 0;
  const walletBalance = userDetails?.wallet?.balance ?? 0;
  const hasSufficientFunds = isBuy ? walletBalance >= requiredAmount : true; // sell orders just need holdings verification
  
  // Filter for recent deposits
  const recentDeposits = userDetails?.wallet?.transactions?.filter(t => t.type === 'DEPOSIT') || [];

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Confirm {isBuy ? "Order Payment" : "Sell Holdings"}</DialogTitle>
          <DialogDescription>
            {isBuy 
              ? "Verify the client's wallet balance before debiting for this order." 
              : "Verify the client's holdings before dispatching to the trading desk."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <h4 className="text-sm font-semibold mb-3">Order Requirement</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Security</p>
                  <p className="text-sm font-medium">{order.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Action</p>
                  <p className={cn(
                    "text-sm font-bold uppercase",
                    isBuy ? "text-emerald-600" : "text-red-600"
                  )}>{order.side}</p>
                </div>
                {isBuy && (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">Consideration</p>
                      <p className="text-sm font-medium">{fmt(order.totalAmount ?? order.quantity * (order.price ?? 0))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Required (incl. fees)</p>
                      <p className="text-sm font-bold">{fmt(requiredAmount)}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Wallet Status */}
            {isBuy && (
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Client Wallet Balance</p>
                  <p className="text-2xl font-bold">{fmt(walletBalance)}</p>
                </div>
                <div className="text-right">
                  {hasSufficientFunds ? (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Sufficient Funds
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-sm font-medium text-red-600 dark:text-red-400">
                      <AlertCircle className="h-4 w-4" />
                      Insufficient Funds
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recent Deposits */}
            {isBuy && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">Recent Wallet Deposits</h4>
                  <Button variant="ghost" size="sm" onClick={loadData} className="h-8 px-2 text-muted-foreground">
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Refresh
                  </Button>
                </div>
                {recentDeposits.length === 0 ? (
                  <p className="text-sm text-muted-foreground border rounded-lg p-4 text-center bg-muted/10">
                    No recent deposits found for this client.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentDeposits.slice(0, 4).map((deposit) => (
                      <div key={deposit.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full",
                            deposit.status === "COMPLETED" ? "bg-emerald-100 text-emerald-600" : 
                            deposit.status === "PENDING" ? "bg-amber-100 text-amber-600" : "bg-muted"
                          )}>
                            {deposit.channel === "BANK_TRANSFER" ? <FileText className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{fmt(deposit.amount)}</p>
                            <p className="text-xs text-muted-foreground">
                              {deposit.channel === "BANK_TRANSFER" ? "Manual Bank Transfer" : "ExpressPay"}
                              {" • "}
                              {format(new Date(deposit.createdAt), "MMM d, HH:mm")}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            deposit.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-600" :
                            deposit.status === "PENDING" ? "bg-amber-500/10 text-amber-600" : "bg-muted"
                          )}>
                            {deposit.status}
                          </span>
                          {deposit.status === "PENDING" && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                              onClick={() => handleClearDeposit(deposit.id)}
                              disabled={processingId === deposit.id}
                            >
                              {processingId === deposit.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : "Clear"}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {!hasSufficientFunds && (
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    If the client paid manually, wait for their Bank Transfer request to appear above and clear it, or instruct the client to deposit via the app.
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={confirmingOrder}>
                Cancel
              </Button>
              <Button
                className={cn(isBuy ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-brand-bronze hover:bg-brand-bronze/90 text-white")}
                disabled={!hasSufficientFunds || confirmingOrder}
                onClick={handleConfirmOrder}
              >
                {confirmingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isBuy ? "Debit Wallet & Place Order" : "Verify Holdings & Place Order"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
