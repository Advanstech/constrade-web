"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { niaApi } from "@/lib/api";
import type { NiaStatus, NiaVerificationStatusValue } from "@/lib/api.types";
import { prepareNiaSelfie } from "@/lib/kyc-image-processing";

interface NiaVerificationPanelProps {
  /** Ghana Card number from the identity step; empty disables verification. */
  pinNumber: string;
  source?: "WEB" | "PORTAL";
  onVerified?: () => void;
  className?: string;
}

const STATUS_COPY: Record<NiaVerificationStatusValue, string> = {
  UNVERIFIED: "Not verified yet",
  VERIFIED: "Verified",
  FAILED: "Face did not match",
  INVALID_DATA: "Could not read the details",
  WATCHLIST: "Watch list — visit NIA",
  ERROR: "NIA unavailable",
};

function statusTone(status: NiaVerificationStatusValue) {
  if (status === "VERIFIED") {
    return "border-emerald-300 bg-emerald-50 text-emerald-700";
  }
  if (status === "WATCHLIST") {
    return "border-rose-300 bg-rose-50 text-rose-700";
  }
  if (status === "FAILED" || status === "INVALID_DATA") {
    return "border-amber-300 bg-amber-50 text-amber-800";
  }
  return "border-border bg-background text-muted-foreground";
}

/**
 * Ghana Card face check with NIA. The selfie is downscaled to a 640x480 crop
 * in the browser — NIA times out on full-resolution phone photos — and only
 * the comparison result is kept by the API.
 */
export function NiaVerificationPanel({
  pinNumber,
  source = "WEB",
  onVerified,
  className,
}: NiaVerificationPanelProps) {
  const [status, setStatus] = useState<NiaStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStatus = useCallback(async () => {
    try {
      const next = await niaApi.status();
      setStatus(next);
    } catch {
      // Status is advisory; a verified investor can still retry below.
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const currentStatus: NiaVerificationStatusValue = status?.status ?? "UNVERIFIED";
  const verified = currentStatus === "VERIFIED";
  const blocked = status?.applies === false || currentStatus === "WATCHLIST";
  const cardReady = pinNumber.replace(/[^0-9]/g, "").length >= 10;

  const handleFile = async (file: File) => {
    setError(null);
    setWarnings([]);
    if (!cardReady) {
      setError("Enter your Ghana Card number before verifying.");
      return;
    }
    setBusy(true);
    try {
      const { dataUrl } = await prepareNiaSelfie(file);
      const result = await niaApi.verify({
        pinNumber,
        image: dataUrl,
        source,
      });
      setWarnings(result.warnings ?? []);
      if (result.status !== "VERIFIED") {
        setError(result.message);
      }
      await loadStatus();
      if (result.status === "VERIFIED") onVerified?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Verification failed. Please try again.",
      );
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (status?.applies === false) return null;

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-border bg-muted/30 p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
              verified
                ? "border-emerald-300 bg-emerald-50 text-emerald-600"
                : "border-border bg-background text-brand-bronze",
            )}
          >
            {verified ? (
              <ShieldCheck className="h-5 w-5" />
            ) : currentStatus === "WATCHLIST" ? (
              <ShieldAlert className="h-5 w-5" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">
              Ghana Card face verification (NIA)
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Your live selfie is compared with the photo NIA holds for your
              Ghana Card. Required before you can trade.
            </p>
          </div>
        </div>
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
            statusTone(currentStatus),
          )}
        >
          {STATUS_COPY[currentStatus]}
        </span>
      </div>

      {verified && (
        <p className="flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Verified{status?.verifiedAt ? ` on ${status.verifiedAt.slice(0, 10)}` : ""}.
        </p>
      )}

      {!verified && !blocked && (
        <p className="text-xs text-muted-foreground">
          Use a front camera, face the light, and keep your whole face in frame.
          The image is resized to 640×480 before it leaves this device.
        </p>
      )}

      {currentStatus === "WATCHLIST" && (
        <p className="flex items-start gap-2 text-sm text-rose-700">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          This card is flagged by NIA. The cardholder must resolve the
          registration issue at an NIA office before verification can pass.
        </p>
      )}

      {error && (
        <p className="flex items-start gap-2 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {warnings.map((warning) => (
        <p
          key={warning}
          className="flex items-start gap-2 text-xs text-amber-700"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {warning}
        </p>
      ))}

      {!verified && !blocked && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            capture="user"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy || !cardReady}
            onClick={() => fileInputRef.current?.click()}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking with NIA…
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                {currentStatus === "UNVERIFIED"
                  ? "Take selfie & verify"
                  : "Retake selfie"}
              </>
            )}
          </Button>
          {!cardReady && (
            <span className="text-xs text-muted-foreground">
              Enter and save your Ghana Card number in the identity section
              first.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
