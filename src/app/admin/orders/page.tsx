"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/lib/api";
import { UploadResultModal } from "@/components/orders/UploadResultModal";
import type { AdminOrder } from "@/lib/api.types";

/* ─── helpers ─────────────────────────────────────────────────────────── */

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; dot: string }
> = {
  pending_approval: {
    label: "Pending",
    color: "#F78218",
    bg: "rgba(247,130,24,0.12)",
    dot: "#F78218",
  },
  processing: {
    label: "Processing",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.12)",
    dot: "#60a5fa",
  },
  filled: {
    label: "Executed",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
    dot: "#22c55e",
  },
  rejected: {
    label: "Rejected",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    dot: "#ef4444",
  },
  cancelled: {
    label: "Cancelled",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.08)",
    dot: "#94a3b8",
  },
  approved: {
    label: "Approved",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
    dot: "#22c55e",
  },
};

const TABS = [
  { key: "all", label: "All Orders" },
  { key: "pending_approval", label: "Pending" },
  { key: "processing", label: "Processing" },
  { key: "filled", label: "Executed" },
  { key: "rejected", label: "Rejected / Cancelled" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function fmt(n: number | null | undefined, currency = true) {
  if (n == null) return "—";
  if (currency)
    return n.toLocaleString("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    });
  return n.toLocaleString("en-GH");
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function exportToCsv(orders: AdminOrder[]) {
  const headers = [
    "Order ID",
    "Client ID",
    "Instrument",
    "Asset Class",
    "Side",
    "Quantity",
    "Price (GHS)",
    "Status",
    "Filled Price",
    "Settlement Date",
    "Execution Note",
    "Date Placed",
  ];
  const rows = orders.map((o) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oAny = o as any;
    return [
      o.id,
      o.user_id,
      o.name,
      o.asset_class,
      o.side.toUpperCase(),
      o.quantity,
      o.price,
      o.status,
      oAny.filledPrice ?? oAny.filled_price ?? "",
      oAny.settlementDate ?? "",
      oAny.executionNote ?? "",
      new Date(o.created_at).toISOString(),
    ];
  });
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `orders_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── component ───────────────────────────────────────────────────────── */

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [uploadTarget, setUploadTarget] = useState<AdminOrder | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await adminApi.orders();
      setOrders(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const showSuccess = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleConfirmPayment = async (id: string) => {
    setProcessingId(id);
    setActionError(null);
    try {
      const res = await adminApi.confirmOrderPayment(id);
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? ({ ...o, ...res.order } as AdminOrder) : o))
      );
      showSuccess(`Payment confirmed — order dispatched to trading desk.`);
    } catch (e: unknown) {
      setActionError((e as Error)?.message ?? "Failed to confirm payment.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm("Are you sure you want to reject this order?")) return;
    setProcessingId(id);
    setActionError(null);
    try {
      await adminApi.rejectOrder(id);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id ? ({ ...o, status: "rejected" } as AdminOrder) : o
        )
      );
      showSuccess("Order rejected.");
    } catch (e: unknown) {
      setActionError((e as Error)?.message ?? "Failed to reject order.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleUploadResult = async (
    id: string,
    data: Parameters<typeof adminApi.uploadOrderResult>[1]
  ) => {
    const res = await adminApi.uploadOrderResult(id, data);
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? ({ ...o, ...res.order } as AdminOrder) : o))
    );
    showSuccess("Execution result uploaded — portfolio updated.");
  };

  /* filtering */
  const filtered = orders.filter((o) => {
    const tabMatch =
      activeTab === "all"
        ? true
        : activeTab === "rejected"
        ? o.status === "rejected" || o.status === "cancelled"
        : o.status === activeTab;
    const searchMatch =
      !search ||
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.instrument.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.user_id.toLowerCase().includes(search.toLowerCase());
    return tabMatch && searchMatch;
  });

  /* tab counts */
  const counts: Record<string, number> = {
    all: orders.length,
    pending_approval: orders.filter((o) => o.status === "pending_approval").length,
    processing: orders.filter((o) => o.status === "processing").length,
    filled: orders.filter((o) => o.status === "filled").length,
    rejected: orders.filter(
      (o) => o.status === "rejected" || o.status === "cancelled"
    ).length,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080a1a", color: "#fff", padding: "32px 24px" }}>
      {/* page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800, color: "#fff" }}>
            Order Management
          </h1>
          <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.45)", fontSize: "14px" }}>
            Hybrid back-office workflow · Confirm payment → Upload result → Portfolio updated
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            id="refresh-orders"
            onClick={() => void loadOrders()}
            disabled={loading}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              padding: "10px 16px",
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            {loading ? "⟳ Refreshing…" : "⟳ Refresh"}
          </button>
          <button
            id="export-orders-csv"
            onClick={() => exportToCsv(filtered)}
            disabled={filtered.length === 0}
            style={{
              background: "linear-gradient(135deg, #F78218, #e56b0f)",
              border: "none",
              borderRadius: "10px",
              padding: "10px 18px",
              color: "#fff",
              cursor: filtered.length === 0 ? "not-allowed" : "pointer",
              fontSize: "13px",
              fontWeight: 700,
              opacity: filtered.length === 0 ? 0.5 : 1,
            }}
          >
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* workflow banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(15,16,47,0.8), rgba(26,31,78,0.8))",
          border: "1px solid rgba(247,130,24,0.2)",
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
          ORDER FLOW:
        </span>
        {[
          { icon: "📥", label: "Client Places Order", color: "#F78218" },
          { icon: "→", label: "", color: "rgba(255,255,255,0.2)" },
          { icon: "✅", label: "Confirm Payment", color: "#60a5fa" },
          { icon: "→", label: "", color: "rgba(255,255,255,0.2)" },
          { icon: "🏦", label: "Execute at GSE/CSD", color: "#a78bfa" },
          { icon: "→", label: "", color: "rgba(255,255,255,0.2)" },
          { icon: "📊", label: "Upload Result", color: "#22c55e" },
          { icon: "→", label: "", color: "rgba(255,255,255,0.2)" },
          { icon: "💼", label: "Portfolio Updated", color: "#22c55e" },
        ].map((step, i) => (
          <span
            key={i}
            style={{
              color: step.color,
              fontSize: "13px",
              fontWeight: step.icon === "→" ? 400 : 600,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {step.icon} {step.label}
          </span>
        ))}
      </div>

      {/* toast notifications */}
      {actionSuccess && (
        <div
          style={{
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "16px",
            color: "#22c55e",
            fontSize: "14px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          ✅ {actionSuccess}
        </div>
      )}
      {actionError && (
        <div
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "16px",
            color: "#ef4444",
            fontSize: "14px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>⚠️ {actionError}</span>
          <button
            onClick={() => setActionError(null)}
            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "18px" }}
          >
            ×
          </button>
        </div>
      )}

      {/* search + tabs */}
      <div style={{ marginBottom: "16px" }}>
        <input
          id="orders-search"
          type="text"
          placeholder="Search by client ID, instrument, or order ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "10px",
            padding: "12px 16px",
            color: "#fff",
            fontSize: "14px",
            outline: "none",
            boxSizing: "border-box",
            marginBottom: "16px",
          }}
        />
        <div style={{ display: "flex", gap: "4px", overflowX: "auto" }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                id={`tab-${tab.key}`}
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: active
                    ? "rgba(247,130,24,0.15)"
                    : "rgba(255,255,255,0.03)",
                  border: active
                    ? "1px solid rgba(247,130,24,0.4)"
                    : "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  color: active ? "#F78218" : "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: active ? 700 : 500,
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s",
                }}
              >
                {tab.label}
                {counts[tab.key] > 0 && (
                  <span
                    style={{
                      background: active
                        ? "#F78218"
                        : "rgba(255,255,255,0.1)",
                      color: active ? "#fff" : "rgba(255,255,255,0.5)",
                      borderRadius: "100px",
                      padding: "1px 7px",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    {counts[tab.key]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* table */}
      {loading && (
        <div style={{ textAlign: "center", padding: "80px 0", color: "rgba(255,255,255,0.4)" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px", animation: "pulse 1.5s infinite" }}>⟳</div>
          Loading orders…
        </div>
      )}

      {error && !loading && (
        <div
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "12px",
            padding: "40px",
            textAlign: "center",
            color: "#ef4444",
          }}
        >
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>⚠️</div>
          Failed to load orders.{" "}
          <button
            onClick={() => void loadOrders()}
            style={{ color: "#F78218", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {filtered.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "80px 0",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>📋</div>
              <div style={{ fontSize: "16px" }}>No orders found</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filtered.map((order) => {
                const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending_approval;
                const isProcessing = processingId === order.id;
                const fi = order.asset_class === "fixed_income";
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const o = order as any;

                return (
                  <div
                    key={order.id}
                    id={`order-${order.id.slice(0, 8)}`}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: "14px",
                      padding: "20px 22px",
                      transition: "border-color 0.2s",
                    }}
                  >
                    {/* top row */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "14px",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                          <span
                            style={{
                              background: fi ? "rgba(167,139,250,0.15)" : "rgba(59,130,246,0.15)",
                              color: fi ? "#a78bfa" : "#60a5fa",
                              borderRadius: "6px",
                              padding: "2px 8px",
                              fontSize: "11px",
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                            }}
                          >
                            {fi ? "FIXED INCOME" : "EQUITY"}
                          </span>
                          <span
                            style={{
                              background: order.side === "buy" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                              color: order.side === "buy" ? "#22c55e" : "#ef4444",
                              borderRadius: "6px",
                              padding: "2px 8px",
                              fontSize: "11px",
                              fontWeight: 700,
                            }}
                          >
                            {order.side.toUpperCase()}
                          </span>
                        </div>
                        <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#fff" }}>
                          {order.name}
                        </h3>
                        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "2px", fontFamily: "monospace" }}>
                          {order.id.slice(0, 24)}… · Client: {order.user_id.slice(0, 12)}…
                        </div>
                      </div>

                      {/* status badge */}
                      <div
                        style={{
                          background: statusCfg.bg,
                          border: `1px solid ${statusCfg.color}30`,
                          borderRadius: "100px",
                          padding: "6px 14px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            background: statusCfg.dot,
                            display: "inline-block",
                          }}
                        />
                        <span style={{ color: statusCfg.color, fontSize: "13px", fontWeight: 700 }}>
                          {statusCfg.label}
                        </span>
                      </div>
                    </div>

                    {/* order details grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                        gap: "12px",
                        marginBottom: "16px",
                      }}
                    >
                      {[
                        {
                          label: fi ? "Face Value" : "Quantity",
                          value: fi ? fmt(order.quantity) : order.quantity.toLocaleString(),
                        },
                        { label: "Limit Price", value: order.price ? fmt(order.price) : "Market" },
                        {
                          label: "Filled Price",
                          value: o.filledPrice ? fmt(o.filledPrice) : order.filled_price ? fmt(order.filled_price) : "—",
                        },
                        { label: "Settlement Date", value: fmtDate(o.settlementDate) },
                        { label: "Placed At", value: fmtDate(order.created_at) },
                        ...(o.paymentConfirmedAt
                          ? [{ label: "Payment Confirmed", value: fmtDate(o.paymentConfirmedAt) }]
                          : []),
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <div
                            style={{
                              fontSize: "10px",
                              color: "rgba(255,255,255,0.35)",
                              textTransform: "uppercase",
                              letterSpacing: "0.1em",
                              marginBottom: "3px",
                            }}
                          >
                            {label}
                          </div>
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "#fff" }}>
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* execution note if filled */}
                    {o.executionNote && (
                      <div
                        style={{
                          background: "rgba(34,197,94,0.06)",
                          border: "1px solid rgba(34,197,94,0.15)",
                          borderRadius: "8px",
                          padding: "8px 12px",
                          marginBottom: "14px",
                          fontSize: "12px",
                          color: "rgba(255,255,255,0.6)",
                        }}
                      >
                        📋 {o.executionNote}
                      </div>
                    )}

                    {/* action buttons */}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {order.status === "pending_approval" && (
                        <>
                          <button
                            id={`confirm-payment-${order.id.slice(0, 8)}`}
                            onClick={() => void handleConfirmPayment(order.id)}
                            disabled={isProcessing}
                            style={{
                              background: isProcessing
                                ? "rgba(96,165,250,0.2)"
                                : "linear-gradient(135deg, #3b82f6, #2563eb)",
                              border: "none",
                              borderRadius: "8px",
                              padding: "9px 16px",
                              color: "#fff",
                              cursor: isProcessing ? "not-allowed" : "pointer",
                              fontSize: "13px",
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              transition: "opacity 0.2s",
                            }}
                          >
                            {isProcessing ? (
                              <span style={{ width: "12px", height: "12px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                            ) : (
                              "✅"
                            )}
                            Confirm Payment
                          </button>
                          <button
                            id={`reject-${order.id.slice(0, 8)}`}
                            onClick={() => void handleReject(order.id)}
                            disabled={isProcessing}
                            style={{
                              background: "rgba(239,68,68,0.1)",
                              border: "1px solid rgba(239,68,68,0.2)",
                              borderRadius: "8px",
                              padding: "9px 16px",
                              color: "#ef4444",
                              cursor: isProcessing ? "not-allowed" : "pointer",
                              fontSize: "13px",
                              fontWeight: 600,
                            }}
                          >
                            ✕ Reject
                          </button>
                        </>
                      )}

                      {order.status === "processing" && (
                        <>
                          <div
                            style={{
                              background: "rgba(96,165,250,0.08)",
                              border: "1px solid rgba(96,165,250,0.2)",
                              borderRadius: "8px",
                              padding: "9px 16px",
                              color: "#60a5fa",
                              fontSize: "13px",
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            🏦 Dispatched to Trading Desk
                          </div>
                          <button
                            id={`upload-result-${order.id.slice(0, 8)}`}
                            onClick={() => setUploadTarget(order)}
                            style={{
                              background: "linear-gradient(135deg, #F78218, #e56b0f)",
                              border: "none",
                              borderRadius: "8px",
                              padding: "9px 16px",
                              color: "#fff",
                              cursor: "pointer",
                              fontSize: "13px",
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            📊 Upload Result
                          </button>
                          <button
                            id={`reject-processing-${order.id.slice(0, 8)}`}
                            onClick={() => void handleReject(order.id)}
                            disabled={isProcessing}
                            style={{
                              background: "rgba(239,68,68,0.08)",
                              border: "1px solid rgba(239,68,68,0.15)",
                              borderRadius: "8px",
                              padding: "9px 14px",
                              color: "#ef4444",
                              cursor: isProcessing ? "not-allowed" : "pointer",
                              fontSize: "13px",
                              fontWeight: 600,
                            }}
                          >
                            ✕ Reject
                          </button>
                        </>
                      )}

                      {order.status === "filled" && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "13px",
                            color: "#22c55e",
                            fontWeight: 600,
                          }}
                        >
                          ✅ Executed{" "}
                          {o.settlementDate && (
                            <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>
                              · Settled {fmtDate(o.settlementDate)}
                            </span>
                          )}
                        </div>
                      )}

                      {(order.status === "rejected" || order.status === "cancelled") && (
                        <div
                          style={{
                            fontSize: "13px",
                            color: "rgba(255,255,255,0.35)",
                          }}
                        >
                          {order.status === "rejected" ? "❌ Rejected" : "✕ Cancelled"} ·{" "}
                          {fmtDate(order.created_at)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Upload Result Modal */}
      {uploadTarget && (
        <UploadResultModal
          order={uploadTarget}
          onClose={() => setUploadTarget(null)}
          onSubmit={(data) => handleUploadResult(uploadTarget.id, data)}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        input:focus { border-color: rgba(247,130,24,0.4) !important; }
      `}</style>
    </div>
  );
}
