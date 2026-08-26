"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, RefreshCw, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadError } from "@/components/layout/LoadError";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminApi } from "@/lib/api";
import type { AdminOrder } from "@/lib/api.types";
import {
  formatDateTime,
  formatGHS,
  shortId,
  statusClass,
  statusLabel,
} from "@/lib/format";

const AdminOrders = () => {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    void adminApi.orders().then(setOrders).catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    if (filter === "all") return orders ?? [];
    return (orders ?? []).filter((o) => o.status === filter);
  }, [orders, filter]);

  const act = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    try {
      if (action === "approve") {
        const res = await adminApi.approveOrder(id);
        toast.success(res.message);
      } else {
        const res = await adminApi.rejectOrder(id);
        toast.success(res.message);
      }
      load();
    } catch (err) {
      toast.error(action === "approve" ? "Approval failed" : "Rejection failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusyId(null);
    }
  };

  const counts = useMemo(() => {
    const all = orders ?? [];
    return {
      all: all.length,
      pending_approval: all.filter((o) => o.status === "pending_approval").length,
      filled: all.filter((o) => o.status === "filled").length,
      rejected: all.filter((o) => o.status === "rejected" || o.status === "cancelled").length,
    };
  }, [orders]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Order approvals"
        subtitle="Review and fill client orders during GSE trading hours."
        actions={
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="pending_approval">Pending ({counts.pending_approval})</TabsTrigger>
          <TabsTrigger value="filled">Filled ({counts.filled})</TabsTrigger>
          <TabsTrigger value="rejected">Closed ({counts.rejected})</TabsTrigger>
        </TabsList>
      </Tabs>

      {error && <LoadError message="We couldn't load the orders. Please try again." onRetry={load} />}

      <Card className="overflow-hidden">
        {!orders ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No orders in this view.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3">Order</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Instrument</th>
                  <th className="px-4 py-3">Side</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell">Price</th>
                  <th className="hidden px-4 py-3 text-right lg:table-cell">Placed</th>
                  <th className="px-4 py-3 text-right">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((o) => (
                  <tr key={o.id} className="border-b border-border/60 hover:bg-muted/40">
                    <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">
                      #{shortId(o.id)}
                    </td>
                    <td className="px-4 py-3.5 font-medium">{o.client}</td>
                    <td className="px-4 py-3.5 font-semibold">{o.instrument}</td>
                    <td className="px-4 py-3.5">
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
                      {formatGHS(o.price)}
                    </td>
                    <td className="hidden px-4 py-3.5 text-right text-muted-foreground lg:table-cell">
                      {formatDateTime(o.created_at)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${statusClass(o.status)}`}>
                        {statusLabel(o.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        {o.status === "pending_approval" && (
                          <>
                            <Button
                              size="sm"
                              variant="success"
                              disabled={busyId === o.id}
                              onClick={() => void act(o.id, "approve")}
                            >
                              <Check className="h-3.5 w-3.5" /> Fill
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={busyId === o.id}
                              onClick={() => void act(o.id, "reject")}
                            >
                              <X className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </>
                        )}
                        {o.status === "filled" && (
                          <span className="text-xs text-muted-foreground">
                            filled @ {formatGHS(o.filled_price ?? o.price)}
                          </span>
                        )}
                      </div>
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

export default AdminOrders;
