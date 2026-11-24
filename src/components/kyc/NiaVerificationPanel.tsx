"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Lightbulb,
  Loader2,
  LifeBuoy,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { niaApi } from "@/lib/api";
import type { NiaStatus, NiaVerificationStatusValue } from "@/lib/api.types";
import { NiaCameraCapture } from "./NiaCameraCapture";

interface NiaVerificationPanelProps {
  /** Ghana Card number from the identity step; empty disables verification. */
  pinNumber: string;
  /** Identity document chosen above — decides whether a selfie is needed. */
  documentType?: string;
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

/**
 * What the investor should do about each machine-readable failure the API
 * records. Without this the panel only said "try again", which is useless for
 * the causes that need a different action.
 */
const FAILURE_GUIDANCE: Record<string, string> = {
  CARD_INVALID:
    "Check the Ghana Card number in the identity section — it looks like GHA-123456789-0.",
  CARD_MISSING:
    "Add your Ghana Card number in the identity section first, then come back to the selfie.",
  CARD_MISMATCH:
    "That number does not match the Ghana Card on your KYC file. Correct it in the identity section, then retake the selfie.",
  IMAGE_INVALID:
    "The photo could not be read. Retake it in good light, without filters.",
  IMAGE_TOO_LARGE:
    "The photo was too large to send. Retake it so it can be cropped to a 35×45 mm passport frame.",
  NOT_CONFIGURED:
    "Face verification is not switched on for this environment yet. Contact support and we will complete your check manually.",
  GATEWAY_TIMEOUT:
    "NIA did not answer in time. This is usually temporary — wait a moment and try again.",
  GATEWAY_UNREACHABLE:
    "NIA could not be reached. Retake the selfie, and contact support if it keeps failing.",
  GATEWAY_HTTP_ERROR:
    "NIA returned an error. Try again shortly — if it repeats, contact support.",
};

const SUPPORT_EMAIL = "support@constantcap.com.gh";

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

function formatAttemptTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Ghana Card face check with NIA.
 *
 * The selfie is taken on a live passport-frame canvas (see NiaCameraCapture) and
 * only the comparison result is kept by the API. Failures are explained by
 * cause,
 * every attempt is listed so support can pick up the conversation, and there is
 * a direct support route instead of a dead "try again" button.
 */
export function NiaVerificationPanel({
  pinNumber,
  documentType,
  source = "WEB",
  onVerified,
  className,
}: NiaVerificationPanelProps) {
  const [status, setStatus] = useState<NiaStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failureCode, setFailureCode] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

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

  const currentStatus: NiaVerificationStatusValue =
    status?.status ?? "UNVERIFIED";
  const verified = currentStatus === "VERIFIED";
  const passportFile = /passport/i.test(documentType ?? "");
  // Only the document chosen on this form takes the selfie away. When the API
  // disagrees it is because the saved KYC file still says passport — the note
  // below says so, but the selfie stays available instead of vanishing.
  const notApplicable = passportFile;
  const savedFileDisagrees = !passportFile && status?.applies === false;
  const blocked = notApplicable || currentStatus === "WATCHLIST";
  const cardReady = pinNumber.replace(/[^0-9]/g, "").length >= 10;
  const attempts = status?.recentAttempts ?? [];

  const supportHref = useMemo(() => {
    const digits = pinNumber.replace(/[^0-9]/g, "");
    const cardHint = digits.length >= 4 ? `ending ${digits.slice(-4)}` : "on file";
    const body = [
      "I could not complete the Ghana Card face check in the app.",
      "",
      `Ghana Card: ${cardHint}`,
      `Last result: ${currentStatus}${failureCode ? ` (${failureCode})` : ""}`,
      `Attempts on record: ${attempts.length}`,
      "",
      "Please help me finish the verification.",
    ].join("\n");
    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      "NIA face verification — help needed",
    )}&body=${encodeURIComponent(body)}`;
  }, [attempts.length, currentStatus, failureCode, pinNumber]);

  const verify = async (image: string) => {
    setBusy(true);
    setError(null);
    setFailureCode(null);
    setWarnings([]);
    try {
      const result = await niaApi.verify({ pinNumber, image, source });
      setWarnings(result.warnings ?? []);
      setFailureCode(result.failureCode ?? null);
      if (result.status !== "VERIFIED") {
        setError(result.message);
      }
      await loadStatus();
      if (result.status === "VERIFIED") {
        setCameraOpen(false);
        onVerified?.();
      }
    } catch (err) {
      setFailureCode(null);
      setError(
        err instanceof Error
          ? err.message
          : "Verification failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (notApplicable) {
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-5",
          className,
        )}
      >
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
          <Camera className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">
              Selfie check — Ghana Card face verification (NIA)
            </p>
            <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Not required
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Your KYC file is built on an International Passport, so there is no
            Ghana Card for NIA to compare a selfie with. Choose Ghana Card in
            Section E above if you want to verify with your card instead.
          </p>
        </div>
      </div>
    );
  }

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
              Selfie check — Ghana Card face verification (NIA)
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
          The camera shows the exact 35×45 mm passport frame that is sent to NIA.
          Face the light and keep your whole face inside the oval.
        </p>
      )}

      {savedFileDisagrees && (
        <p className="flex items-start gap-2 text-xs text-amber-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {status?.message ?
            `${status.message} ` : "The saved KYC file is recorded against a passport, so this check is not part of your account yet. "}
          Save this step with Ghana Card selected to switch it on — you can still
          verify now.
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

      {failureCode && FAILURE_GUIDANCE[failureCode] && (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {FAILURE_GUIDANCE[failureCode]}
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
          <Button
            type="button"
            variant="outline"
            disabled={busy || !cardReady}
            onClick={() => setCameraOpen(true)}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking with NIA…
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                {!cardReady
                  ? "Add your Ghana Card number below"
                  : currentStatus === "UNVERIFIED"
                    ? "Take selfie & verify"
                    : "Retry with a new selfie"}
              </>
            )}
          </Button>
          <a
            href={supportHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-bronze hover:underline"
          >
            <LifeBuoy className="h-3.5 w-3.5" />
            Contact support
          </a>
          {attempts.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory((value) => !value)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {showHistory ? "Hide" : "Show"} {attempts.length} previous{" "}
              {attempts.length === 1 ? "attempt" : "attempts"}
            </button>
          )}
          {!cardReady && (
            <span className="text-xs text-muted-foreground">
              Add your Ghana Card number in Section E just below, then come back
              to the selfie.
            </span>
          )}
        </div>
      )}

      {showHistory && attempts.length > 0 && (
        <div className="space-y-2 rounded-lg border border-border bg-background/60 p-3">
          {attempts.map((attempt) => (
            <div key={attempt.id} className="flex items-start gap-2 text-xs">
              <span
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  attempt.status === "VERIFIED"
                    ? "border-emerald-300 text-emerald-600"
                    : "border-border text-muted-foreground",
                )}
              >
                {attempt.status === "VERIFIED" ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <AlertCircle className="h-3 w-3" />
                )}
              </span>
              <div>
                <p className="font-medium text-foreground">
                  {STATUS_COPY[attempt.status]}
                </p>
                <p className="text-muted-foreground">
                  {formatAttemptTime(attempt.createdAt)}
                  {attempt.failureCode ? ` · ${attempt.failureCode}` : ""}
                </p>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground">
            Support can see these attempts — quote the date and time.
          </p>
        </div>
      )}

      {cameraOpen && (
        <NiaCameraCapture
          busy={busy}
          error={error}
          onClose={() => setCameraOpen(false)}
          onCapture={(dataUrl) => void verify(dataUrl)}
        />
      )}
    </div>
  );
}
