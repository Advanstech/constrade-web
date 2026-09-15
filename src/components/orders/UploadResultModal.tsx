"use client";

import { useEffect, useState } from "react";
import type { AdminOrder } from "@/lib/api.types";
import { adminApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, FileText, ImageIcon, Loader2, ScanLine, UploadCloud, X } from "lucide-react";

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
    isFixedIncome ? String(order.quantity) : String(order.quantity),
  );
  const [settlementDate, setSettlementDate] = useState(today);
  const [executionNote, setExecutionNote] = useState(
    isFixedIncome ? "Executed via Bank of Ghana primary market" : "Executed on Ghana Stock Exchange",
  );
  const [traderNotes, setTraderNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanConfidence, setScanConfidence] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showNoteSuggestions, setShowNoteSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [loading, onClose]);

  const selectFile = (selected: File | null) => {
    if (!selected) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(selected.type)) {
      setError("Upload a PDF, JPG, PNG, or WEBP file.");
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError("The file must be 10 MB or smaller.");
      return;
    }
    setFile(selected);
    setScanConfidence(null);
    setError("");
  };

  const scanDocument = async () => {
    if (!file) return;
    setScanning(true);
    setError("");
    try {
      const result = await adminApi.scanOrderResult(file);
      if (result.filledPrice != null) setFilledPrice(String(result.filledPrice));
      const extractedQuantity = isFixedIncome
        ? result.filledFaceValue ?? result.filledQty
        : result.filledQty ?? result.filledFaceValue;
      if (extractedQuantity != null) setFilledQtyOrFV(String(extractedQuantity));
      if (result.settlementDate) setSettlementDate(result.settlementDate);
      if (result.executionNote) setExecutionNote(result.executionNote);
      setScanConfidence(result.confidence);
      if (result.requiresReview) {
        setError("Some fields could not be extracted. Review and complete the highlighted form before confirming.");
      }
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "The document could not be scanned.");
    } finally {
      setScanning(false);
    }
  };

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

  const totalSettlement =
    filledPrice && filledQtyOrFV
      ? (parseFloat(filledPrice) * parseFloat(filledQtyOrFV)).toLocaleString("en-GH", {
          style: "currency",
          currency: "GHS",
          minimumFractionDigits: 2,
        })
      : "—";

  const inputClass =
    "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-accent/50 focus:ring-2 focus:ring-accent/20";
  const labelClass =
    "mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground";
  const noteSuggestions = isFixedIncome
    ? [
        "Executed at the confirmed BoG allocation rate; settlement instructions verified.",
        "Partial allocation received; filled face value updated to match the contract note.",
        "Contract note reviewed and matched against the client order before settlement.",
      ]
    : [
        "Executed on the Ghana Stock Exchange within the client’s approved price instructions.",
        "Partial fill received; remaining quantity was not executed.",
        "Broker contract note reviewed and trade details matched before portfolio posting.",
      ];

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-accent/20 bg-gradient-navy/5 px-6 py-5">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-lg">📋</span>
              <h2 className="text-lg font-bold text-foreground">
                Upload Execution Result
              </h2>
            </div>
            <p className="text-[13px] text-muted-foreground">
              {order.name} · {order.side.toUpperCase()} ·{" "}
              {isFixedIncome
                ? `GHS ${order.quantity.toLocaleString()} FV`
                : `${order.quantity} units`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close execution result dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 overflow-y-auto p-6"
        >
          {/* Order ref info */}
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-accent/15 bg-accent/5 px-4 py-3 text-xs">
            <div>
              <div className="mb-0.5 text-muted-foreground/70">Order ID</div>
              <div className="font-mono text-[11px] text-foreground">
                {order.id.slice(0, 16)}…
              </div>
            </div>
            <div>
              <div className="mb-0.5 text-muted-foreground/70">Asset Class</div>
              <div className="font-semibold text-accent">
                {isFixedIncome ? "Fixed Income" : "Equity"}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Scan contract note</p>
                <p className="text-xs text-muted-foreground">Upload a broker PDF or clear image to extract the execution details.</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-bronze/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-bronze">
                <ScanLine className="h-3 w-3" /> OCR assisted
              </span>
            </div>

            <label
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-6 text-center transition-colors",
                dragging
                  ? "border-brand-bronze bg-brand-bronze/10"
                  : "border-border bg-muted/20 hover:border-brand-bronze/60 hover:bg-brand-bronze/5",
              )}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                selectFile(event.dataTransfer.files[0] ?? null);
              }}
            >
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
              />
              {file ? (
                <>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-bronze/10 text-brand-bronze">
                    {file.type === "application/pdf" ? <FileText className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
                  </div>
                  <p className="max-w-full truncate text-sm font-semibold text-foreground">{file.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB · Click to replace</p>
                </>
              ) : (
                <>
                  <UploadCloud className="mb-2 h-7 w-7 text-brand-bronze" />
                  <p className="text-sm font-semibold text-foreground">Drop a result document here</p>
                  <p className="mt-1 text-xs text-muted-foreground">PDF, JPG, PNG or WEBP · Maximum 10 MB</p>
                </>
              )}
            </label>

            <Button
              type="button"
              variant="outline"
              disabled={!file || scanning}
              onClick={() => void scanDocument()}
              className="w-full border-brand-bronze/40 text-brand-bronze hover:bg-brand-bronze/10 hover:text-brand-bronze"
            >
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
              {scanning ? "Reading and extracting fields…" : "Scan and fill execution details"}
            </Button>

            {scanConfidence != null && (
              <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs">
                <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> Extraction complete
                </span>
                <span className="text-muted-foreground">{scanConfidence}% fields detected · Review before confirming</span>
              </div>
            )}
          </div>

          <div className="space-y-5 border-t border-border pt-5">
            <div>
              <h3 className="text-base font-bold text-foreground">Review execution details</h3>
              <p className="mt-1 text-xs text-muted-foreground">Verify all extracted values against the uploaded contract note before posting the trade.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Filled Price */}
            <div>
              <label className={labelClass}>Execution Price (GHS) *</label>
              <input
                id="upload-result-price"
                type="number"
                step="0.0001"
                min="0"
                value={filledPrice}
                onChange={(e) => setFilledPrice(e.target.value)}
                placeholder={isFixedIncome ? "e.g. 0.9803" : "e.g. 1.25"}
                required
                className={inputClass}
              />
            </div>

            {/* Filled Qty / Face Value */}
            <div>
              <label className={labelClass}>
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
                className={inputClass}
              />
            </div>
          </div>

          {/* Settlement Date */}
          <div>
            <label className={labelClass}>Settlement Date *</label>
            <input
              id="upload-result-settlement-date"
              type="date"
              value={settlementDate}
              onChange={(e) => setSettlementDate(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          {/* Execution Note */}
          <div>
            <label className={labelClass}>Execution Note</label>
            <input
              id="upload-result-execution-note"
              type="text"
              value={executionNote}
              onChange={(e) => setExecutionNote(e.target.value)}
              placeholder="e.g. Executed on GSE via manual trade ticket"
              className={inputClass}
            />
          </div>

          {/* Trader Notes */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <label htmlFor="upload-result-trader-notes" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Trader Notes
                </label>
                <p className="mt-1 text-[11px] text-muted-foreground/75">Internal only — this will not be shown to the client.</p>
              </div>
              {traderNotes && (
                <button
                  type="button"
                  onClick={() => setTraderNotes("")}
                  className="shrink-0 text-xs font-medium text-destructive hover:underline"
                >
                  Clear note
                </button>
              )}
            </div>
            <textarea
              id="upload-result-trader-notes"
              rows={3}
              value={traderNotes}
              onFocus={() => setShowNoteSuggestions(true)}
              onClick={() => setShowNoteSuggestions(true)}
              onChange={(e) => setTraderNotes(e.target.value)}
              placeholder="Click here for suggested internal notes, or type your own…"
              className={cn(inputClass, "min-h-24 resize-y font-inherit")}
            />
            {showNoteSuggestions && (
              <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Suggested notes</p>
                  <button
                    type="button"
                    onClick={() => setShowNoteSuggestions(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Hide
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {noteSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setTraderNotes(suggestion);
                        setShowNoteSuggestions(false);
                      }}
                      className="rounded-md border border-border bg-card px-3 py-2 text-left text-xs leading-relaxed text-muted-foreground transition-colors hover:border-brand-bronze/50 hover:bg-brand-bronze/5 hover:text-foreground"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          </div>

          {/* Settlement amount preview */}
          {filledPrice && filledQtyOrFV && (
            <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <span className="text-[13px] text-muted-foreground">
                Est. Settlement Amount
              </span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {totalSettlement}
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="sticky bottom-0 -mx-6 -mb-6 mt-1 flex gap-3 border-t border-border bg-card px-6 py-4 shadow-[0_-8px_20px_hsl(var(--background)/0.7)]">
            <Button
              type="button"
              onClick={onClose}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <button
              type="submit"
              id="upload-result-submit"
              disabled={loading}
              className={cn(
                "flex flex-[2] items-center justify-center gap-2 rounded-lg bg-gradient-brand px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60",
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm Execution
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
