"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Ban, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { tradingApi } from "@/lib/api";
import type { Order } from "@/lib/api.types";
import {
  formatDateTime,
  formatGHS,
  shortId,
  statusClass,
  statusLabel,
} from "@/lib/format";

const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[] | null>(null);

  const load = useCallback(() => {
    void tradingApi.myOrders().then(setOrders);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cancel = async (id: string) => {
    try {
      await tradingApi.cancelOrder(id);
      toast.success("Order cancelled");
      load();
    } catch (err) {
      toast.error("Could not cancel", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Orders"
        subtitle="Track and manage your trade orders."
        actions={
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {!orders ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            You haven't placed any orders yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3">Order</th>
                  <th className="px-4 py-3 text-right">Instrument</th>
                  <th className="px-4 py-3 text-right">Side</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell">Price</th>
                  <th className="hidden px-4 py-3 text-right lg:table-cell">Placed</th>
                  <th className="px-4 py-3 text-right">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-border/60 hover:bg-muted/40">
                    <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">
                      #{shortId(o.id)}
                    </td>
                    <td className="px-4 py-3.5 font-semibold">{o.instrument}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          o.side === "buy" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                        }`}
                      >
                        {o.side}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">{o.quantity}</td>
                    <td className="hidden px-4 py-3.5 text-right sm:table-cell">
                      {formatGHS(o.filled_price ?? o.price)}
                    </td>
                    <td className="hidden px-4 py-3.5 text-right text-muted-foreground lg:table-cell">
                      {formatDateTime(o.created_at)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${statusClass(o.status)}`}>
                        {statusLabel(o.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {o.status === "pending_approval" && (
                        <Button variant="ghost" size="sm" onClick={() => void cancel(o.id)}>
                          <Ban className="h-3.5 w-3.5 text-danger" /> Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default OrdersPage;
