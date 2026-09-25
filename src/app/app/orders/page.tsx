"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Ban,
  CheckCircle2,
  Circle,
  Clock3,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { tradingApi } from "@/lib/api";
import type { Order } from "@/lib/api.types";
import {
  formatDate,
  formatDateTime,
  formatGHS,
  shortId,
  statusClass,
  statusLabel,
} from "@/lib/format";
import { cn } from "@/lib/utils";

/* ── lifecycle tracker ─────────────────────────────────────────────────── */

function LifecycleTracker({ order }: { order: Order }) {
  const terminal = order.status === "rejected" || order.status === "cancelled";
  const done = order.status === "filled";

  const stages = [
    {
      label: "Order Received",
      hint: "Submitted to our trading desk",
      at: order.created_at,
      reached: true,
    },
    {
      label: "Payment Confirmed",
      hint: "Funds verified — order queued for execution",
      at: order.paymentConfirmedAt ?? null,
      reached: order.status === "processing" || done,
    },
    {
      label: "Executed",
      hint:
        order.asset_class === "equity"
          ? "Matched on the Ghana Stock Exchange"
          : "Placed on the fixed-income market",
      at: done ? order.updatedAt ?? order.settlementDate : null,
      reached: done,
    },
    {
      label: "Settled",
      hint: "Holdings and cash positions updated",
      at: done ? order.settlementDate : null,
      reached: done,
    },
  ];

  return (
    <div className="space-y-0">
      {stages.map((s, i) => (
        <div key={s.label} className="flex gap-3">
          <div className="flex w-5 flex-col items-center">
            {terminal && i === stages.length - 1 ? (
              <XCircle className="h-5 w-5 text-danger" />
            ) : s.reached ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : i === stages.findIndex((x) => !x.reached) && !terminal ? (
              <Clock3 className="h-5 w-5 animate-pulse text-brand-bronze" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground/40" />
            )}
            {i < stages.length - 1 && (
              <div
                className={cn(
                  "w-px flex-1 min-h-6",
                  stages[i + 1].reached ? "bg-success/50" : "bg-border",
                )}
              />
            )}
          </div>
          <div className="pb-5">
            <p
              className={cn(
                "text-sm font-semibold leading-5",
                s.reached ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {terminal && i === stages.length - 1
                ? order.status === "rejected"
                  ? "Rejected"
                  : "Cancelled"
                : s.label}
            </p>
            <p className="text-xs text-muted-foreground">
              {terminal && i === stages.length - 1
                ? "This order did not complete — contact support for details."
                : s.hint}
            </p>
            {s.at && s.reached && (
              <p className="mt-0.5 text-[11px] font-medium text-muted-foreground/80">
                {formatDateTime(s.at)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── page ───────────────────────────────────────────────────────────────── */

const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const itemsPerPage = 10;

  const load = useCallback(() => {
    void tradingApi.myOrders().then((data) => {
      setOrders(data);
      setSelected((prev) =>
        prev ? (data.find((o) => o.id === prev.id) ?? prev) : prev,
      );
    });
  }, []);

  useEffect(() => {
    load();
    // Orders move through the back-office pipeline — poll quietly so the
    // client sees status changes without manually refreshing.
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const totalPages = Math.ceil((orders?.length ?? 0) / itemsPerPage);
  const visible = orders?.slice((page - 1) * itemsPerPage, page * itemsPerPage) ?? [];
  const inFlight =
    orders?.filter((o) => o.status === "pending_approval" || o.status === "processing") ?? [];

  const cancel = async (id: string) => {
    setCancelling(true);
    try {
      await tradingApi.cancelOrder(id);
      toast.success("Order cancelled");
      load();
    } catch (err) {
      toast.error("Could not cancel", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setCancelling(false);
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

      {inFlight.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-brand-bronze/25 bg-brand-bronze/5 px-4 py-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-bronze" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">
              {inFlight.length} order{inFlight.length === 1 ? "" : "s"} in progress.
            </span>{" "}
            Orders are executed by our licensed trading desk on the GSE / GFIM
            during market hours — typical completion is 1–3 business days.
            You will be notified at every stage. Tap an order to track it.
          </p>
        </div>
      )}

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
                {visible.map((o) => (
                  <tr
                    key={o.id}
                    className="cursor-pointer border-b border-border/60 hover:bg-muted/40"
                    onClick={() => setSelected(o)}
                  >
                    <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">
                      #{shortId(o.id)}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold">{o.name}</p>
                      <p className="text-xs text-muted-foreground">{o.instrument}</p>
                    </td>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            void cancel(o.id);
                          }}
                        >
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border p-4 text-sm">
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── order detail drawer ── */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-md"
        >
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selected.name}
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold ${statusClass(selected.status)}`}
                  >
                    {statusLabel(selected.status)}
                  </span>
                </SheetTitle>
                <SheetDescription>
                  {selected.instrument} · Order #{shortId(selected.id)} ·{" "}
                  {selected.asset_class === "equity" ? "Equity" : "Fixed Income"}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* lifecycle */}
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Order Progress
                  </p>
                  <LifecycleTracker order={selected} />
                </div>

                {/* expectation note while in flight */}
                {(selected.status === "pending_approval" ||
                  selected.status === "processing") && (
                  <div className="rounded-lg border border-brand-bronze/25 bg-brand-bronze/5 px-4 py-3">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        What happens next?
                      </span>{" "}
                      Our trading desk executes orders manually on the Ghana
                      Stock Exchange and fixed-income market during market
                      hours. Typical completion is{" "}
                      <span className="font-semibold text-foreground">
                        1–3 business days
                      </span>
                      . You will receive an in-app notification and email the
                      moment this order executes, and your portfolio will
                      update automatically.
                    </p>
                  </div>
                )}

                {/* order details */}
                <div className="rounded-lg border border-border">
                  <dl className="divide-y divide-border text-sm">
                    {[
                      ["Order Reference", `#${shortId(selected.id)}`],
                      [
                        selected.asset_class === "equity" ? "Quantity" : "Face Value",
                        selected.asset_class === "equity"
                          ? `${selected.quantity.toLocaleString()} shares`
                          : formatGHS(selected.quantity),
                      ],
                      ["Order Type", selected.order_type === "limit" ? "Limit" : "Market"],
                      ["Requested Price", formatGHS(selected.price)],
                      selected.totalAmount != null
                        ? ["Estimated Total", formatGHS(selected.totalAmount)]
                        : null,
                      selected.filled_price != null
                        ? ["Executed Price", formatGHS(selected.filled_price)]
                        : null,
                      (selected.filledQty ?? selected.filledFaceValue) != null
                        ? [
                            "Executed Quantity",
                            selected.asset_class === "equity"
                              ? `${(selected.filledQty ?? 0).toLocaleString()} shares`
                              : formatGHS(selected.filledFaceValue),
                          ]
                        : null,
                      selected.fees != null && selected.status === "filled"
                        ? ["Fees & Levies", formatGHS(selected.fees)]
                        : null,
                      selected.settlementDate
                        ? ["Settlement Date", formatDate(selected.settlementDate)]
                        : null,
                      selected.executionNote
                        ? ["Execution Note", selected.executionNote]
                        : null,
                      ["Placed", formatDateTime(selected.created_at)],
                    ]
                      .filter((r): r is [string, string] => r !== null)
                      .map(([label, value]) => (
                        <div
                          key={label}
                          className="flex items-start justify-between gap-4 px-4 py-2.5"
                        >
                          <dt className="text-xs text-muted-foreground">{label}</dt>
                          <dd className="text-right text-xs font-medium">
                          {value}
                          </dd>
                        </div>
                      ))}
                  </dl>
                </div>

                {selected.status === "pending_approval" && (
                  <Button
                    variant="outline"
                    className="w-full border-danger/30 text-danger hover:bg-danger/10 hover:text-danger"
                    disabled={cancelling}
                    onClick={() => void cancel(selected.id)}
                  >
                    <Ban className="h-4 w-4" />
                    {cancelling ? "Cancelling…" : "Cancel Order"}
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default OrdersPage;
