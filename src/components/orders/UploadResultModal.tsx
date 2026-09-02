"use client";

import { useState } from "react";
import type { AdminOrder } from "@/lib/api.types";

interface UploadResultModalProps {
  order: AdminOrder;
  onClose: () => void;
  onSubmit: (data: {
    filledPrice: number;
    filledQty?: number;
    filledFaceValue?: number;
    settlementDate: string;
    executionNote: string;
    traderNotes: string;
  }) => Promise<void>;
}

export function UploadResultModal({ order, onClose, onSubmit }: UploadResultModalProps) {
  const isFixedIncome = order.asset_class === "fixed_income";
  const today = new Date().toISOString().split("T")[0];

  const [filledPrice, setFilledPrice] = useState("");
  const [filledQtyOrFV, setFilledQtyOrFV] = useState(
    isFixedIncome ? String(order.quantity) : String(order.quantity)
  );
  const [settlementDate, setSettlementDate] = useState(today);
  const [executionNote, setExecutionNote] = useState(
    isFixedIncome ? "Executed via Bank of Ghana primary market" : "Executed on Ghana Stock Exchange"
  );
  const [traderNotes, setTraderNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const price = parseFloat(filledPrice);
    const qty = parseFloat(filledQtyOrFV);

    if (!price || price <= 0) {
      setError("Please enter a valid execution price.");
      return;
    }
    if (!qty || qty <= 0) {
      setError(`Please enter a valid ${isFixedIncome ? "face value" : "quantity"}.`);
      return;
    }
    if (!settlementDate) {
      setError("Please enter a settlement date.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        filledPrice: price,
        ...(isFixedIncome ? { filledFaceValue: qty } : { filledQty: qty }),
        settlementDate,
        executionNote,
        traderNotes,
      });
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Failed to upload result. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const totalSettlement = filledPrice && filledQtyOrFV
    ? (parseFloat(filledPrice) * parseFloat(filledQtyOrFV)).toLocaleString("en-GH", {
        style: "currency",
        currency: "GHS",
        minimumFractionDigits: 2,
      })
    : "—";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#0f1020",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "540px",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #0F102F 0%, #1a1f4e 100%)",
            borderBottom: "1px solid rgba(247,130,24,0.3)",
            padding: "20px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px",
              }}
            >
              <span style={{ fontSize: "18px" }}>📋</span>
              <h2 style={{ margin: 0, color: "#fff", fontSize: "18px", fontWeight: 700 }}>
                Upload Execution Result
              </h2>
            </div>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
              {order.name} · {order.side.toUpperCase()} ·{" "}
              {isFixedIncome ? `GHS ${order.quantity.toLocaleString()} FV` : `${order.quantity} units`}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              color: "rgba(255,255,255,0.6)",
              borderRadius: "8px",
              width: "32px",
              height: "32px",
              cursor: "pointer",
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Order ref info */}
          <div
            style={{
              background: "rgba(247,130,24,0.07)",
              border: "1px solid rgba(247,130,24,0.15)",
              borderRadius: "10px",
              padding: "12px 16px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              fontSize: "12px",
            }}
          >
            <div>
              <div style={{ color: "rgba(255,255,255,0.4)", marginBottom: "2px" }}>Order ID</div>
              <div style={{ color: "#fff", fontFamily: "monospace", fontSize: "11px" }}>
                {order.id.slice(0, 16)}…
              </div>
            </div>
            <div>
              <div style={{ color: "rgba(255,255,255,0.4)", marginBottom: "2px" }}>Asset Class</div>
              <div style={{ color: "#F78218", fontWeight: 600 }}>
                {isFixedIncome ? "Fixed Income" : "Equity"}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {/* Filled Price */}
            <div>
              <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: "12px", marginBottom: "6px", fontWeight: 600 }}>
                Execution Price (GHS) *
              </label>
              <input
                id="upload-result-price"
                type="number"
                step="0.0001"
                min="0"
                value={filledPrice}
                onChange={(e) => setFilledPrice(e.target.value)}
                placeholder={isFixedIncome ? "e.g. 0.9803" : "e.g. 1.25"}
                required
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  color: "#fff",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Filled Qty / Face Value */}
            <div>
              <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: "12px", marginBottom: "6px", fontWeight: 600 }}>
                {isFixedIncome ? "Face Value Filled (GHS) *" : "Quantity Filled (units) *"}
              </label>
              <input
                id="upload-result-qty"
                type="number"
                step={isFixedIncome ? "0.01" : "1"}
                min="0"
                value={filledQtyOrFV}
                onChange={(e) => setFilledQtyOrFV(e.target.value)}
                required
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  color: "#fff",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Settlement Date */}
          <div>
            <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: "12px", marginBottom: "6px", fontWeight: 600 }}>
              Settlement Date *
            </label>
            <input
              id="upload-result-settlement-date"
              type="date"
              value={settlementDate}
              onChange={(e) => setSettlementDate(e.target.value)}
              required
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "8px",
                padding: "10px 12px",
                color: "#fff",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
                colorScheme: "dark",
              }}
            />
          </div>

          {/* Execution Note */}
          <div>
            <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: "12px", marginBottom: "6px", fontWeight: 600 }}>
              Execution Note
            </label>
            <input
              id="upload-result-execution-note"
              type="text"
              value={executionNote}
              onChange={(e) => setExecutionNote(e.target.value)}
              placeholder="e.g. Executed on GSE via manual trade ticket"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "8px",
                padding: "10px 12px",
                color: "#fff",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Trader Notes */}
          <div>
            <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: "12px", marginBottom: "6px", fontWeight: 600 }}>
              Trader Notes (Internal)
            </label>
            <textarea
              id="upload-result-trader-notes"
              rows={2}
              value={traderNotes}
              onChange={(e) => setTraderNotes(e.target.value)}
              placeholder="Internal back-office notes (not shown to client)"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "8px",
                padding: "10px 12px",
                color: "#fff",
                fontSize: "14px",
                outline: "none",
                resize: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Settlement amount preview */}
          {filledPrice && filledQtyOrFV && (
            <div
              style={{
                background: "rgba(34, 197, 94, 0.08)",
                border: "1px solid rgba(34, 197, 94, 0.2)",
                borderRadius: "10px",
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px" }}>
                Est. Settlement Amount
              </span>
              <span style={{ color: "#22c55e", fontWeight: 700, fontSize: "16px" }}>
                {totalSettlement}
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "8px",
                padding: "10px 14px",
                color: "#ef4444",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                padding: "12px",
                color: "rgba(255,255,255,0.7)",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="upload-result-submit"
              disabled={loading}
              style={{
                flex: 2,
                background: loading
                  ? "rgba(247,130,24,0.4)"
                  : "linear-gradient(135deg, #F78218, #e56b0f)",
                border: "none",
                borderRadius: "10px",
                padding: "12px",
                color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "opacity 0.2s",
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      animation: "spin 0.8s linear infinite",
                      display: "inline-block",
                    }}
                  />
                  Uploading…
                </>
              ) : (
                "✅ Confirm Execution"
              )}
            </button>
          </div>
        </form>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          input:focus, textarea:focus { border-color: rgba(247,130,24,0.5) !important; }
        `}</style>
      </div>
    </div>
  );
}
