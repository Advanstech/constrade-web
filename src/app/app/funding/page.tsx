"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeCheck,
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  Phone,
  RefreshCw,
  TrendingUp,
  Wallet,
  XCircle,
  Printer,
  Download,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { accountApi } from "@/lib/api";
import type { Portfolio, Transaction } from "@/lib/api.types";
import { formatDateTime, formatGHS } from "@/lib/format";
import { useAuth } from "@/auth/AuthProvider";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

type PaymentMethod = "MOMO" | "CARD" | "BANK";
type PaymentState = "idle" | "initiating" | "awaiting" | "verifying" | "success" | "failed";

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000, 10000];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Payment Method config                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

const METHODS = [
  {
    id: "MOMO" as PaymentMethod,
    label: "Mobile Money",
    desc: "MTN, Vodafone, AirtelTigo",
    icon: Phone,
    color: "from-yellow-500/20 to-amber-500/10",
    border: "border-yellow-500/30",
    badge: "Instant",
    badgeColor: "bg-green-500/15 text-green-400",
  },
  {
    id: "CARD" as PaymentMethod,
    label: "Card",
    desc: "Visa / Mastercard",
    icon: CreditCard,
    color: "from-blue-500/20 to-indigo-500/10",
    border: "border-blue-500/30",
    badge: "Instant",
    badgeColor: "bg-green-500/15 text-green-400",
  },
  {
    id: "BANK" as PaymentMethod,
    label: "Bank Transfer",
    desc: "Constant Capital trust acct.",
    icon: Building2,
    color: "from-slate-500/20 to-slate-400/10",
    border: "border-slate-500/30",
    badge: "1–2 days",
    badgeColor: "bg-amber-500/15 text-amber-400",
  },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Main component                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */

const Funding = () => {
  const { profile } = useAuth();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [tab, setTab] = useState("deposit");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [payState, setPayState] = useState<PaymentState>("idle");
  /** Identifiers for the in-flight gateway payment (local txn id, or the
   *  gateway orderId/token carried back by the return redirect). */
  const [pendingRef, setPendingRef] = useState<{
    transactionId?: string;
    orderId?: string;
    token?: string;
  } | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ amount?: number; payRef?: string } | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([
        accountApi.portfolio(),
        accountApi.fundingHistory(),
      ]);
      setPortfolio(p);
      setHistory(t);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  /* Pre-fill phone from profile */
  useEffect(() => {
    if (profile?.phone && !phone) setPhone(profile.phone);
  }, [profile, phone]);

  /* ── Shared verify — used by the manual button, the auto-poll, and the
       return-redirect detector. The API confirms with the gateway
       authoritatively; redirect params are only lookup keys. ─────────────── */
  const runVerify = useCallback(
    async (
      ref: { transactionId?: string; orderId?: string; token?: string },
      opts?: { quiet?: boolean },
    ): Promise<boolean> => {
      if (!opts?.quiet) setPayState("verifying");
      try {
        const res = await accountApi.verifyPayment(ref);
        const status = (res.status ?? "").toUpperCase();
        if (status === "COMPLETED") {
          setReceipt({ amount: res.amount, payRef: res.payRef });
          setPayState("success");
          toast.success("Payment confirmed! Your wallet has been credited.", {
            icon: <CheckCircle2 className="h-4 w-4 text-green-400" />,
          });
          setAmount("");
          void load();
          return true;
        }
        if (["REJECTED", "FAILED", "CANCELLED"].includes(status)) {
          setPayState("failed");
          toast.error("Payment was not successful. Please try again.");
          return true;
        }
        setPayState("awaiting");
        if (!opts?.quiet) {
          toast.info(`Status: ${res.status}. The payment may still be processing.`);
        }
        return false;
      } catch (err) {
        setPayState("awaiting");
        if (!opts?.quiet) {
          toast.error("Verification failed", {
            description: err instanceof Error ? err.message : undefined,
          });
        }
        return false;
      }
    },
    [load],
  );

  /* ── Return redirect from the hosted checkout ────────────────────────────
     The gateway 302s back to /app/funding?orderId=…&token=…&status=… once the
     host is allowlisted. Detect it, strip the params, and verify. The `status`
     param is a UX hint only — fulfilment comes from the API verify call. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("orderId");
    const token = params.get("token");
    if (!orderId && !token) return;
    window.history.replaceState({}, "", window.location.pathname);
    const ref = { orderId: orderId ?? undefined, token: token ?? undefined };
    setPendingRef(ref);
    void runVerify(ref);
  }, [runVerify]);

  /* ── Auto-poll while awaiting — mimics the mobile flow: the checkout tab
       resolves on its own and this tab updates without a manual click. ── */
  useEffect(() => {
    if (payState !== "awaiting" || !pendingRef) return;
    pollCountRef.current = 0;
    pollRef.current = setInterval(() => {
      pollCountRef.current += 1;
      if (pollCountRef.current > 36) {
        if (pollRef.current) clearInterval(pollRef.current);
        return; // ~3 min elapsed — the manual Verify button stays available
      }
      void runVerify(pendingRef, { quiet: true });
    }, 5000);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [payState, pendingRef, runVerify]);

  /* ── Initiate gateway payment ──────────────────────────────────────────── */
  const initiateGatewayPayment = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 1) {
      toast.error("Enter a valid amount (min GHS 1)");
      return;
    }
    if (method === "MOMO" && !phone) {
      toast.error("Enter your MoMo number");
      return;
    }

    setPayState("initiating");
    // Open the tab synchronously within the click gesture — an await before
    // window.open lets popup blockers kill it. We point it at the checkout
    // once the API responds.
    const checkoutTab = window.open("about:blank", "_blank");
    try {
      const res = await accountApi.initiatePayment(value, phone || undefined, method as "MOMO" | "CARD");
      setPendingRef({ transactionId: res.transactionId });
      setCheckoutUrl(res.checkoutUrl);

      if (checkoutTab) {
        checkoutTab.location.href = res.checkoutUrl;
      }
      setPayState("awaiting");

      toast.info(
        checkoutTab
          ? "Checkout opened in a new tab. This page updates automatically when the payment completes."
          : "Popup blocked — use the Open checkout link below.",
        { duration: 8000 },
      );
    } catch (err) {
      checkoutTab?.close();
      setPayState("failed");
      toast.error("Could not start payment", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  /* ── Verify after user returns ─────────────────────────────────────────── */
  const verifyPayment = async () => {
    if (!pendingRef) return;
    await runVerify(pendingRef);
  };

  /* ── Bank transfer deposit (manual) ────────────────────────────────────── */
  const submitBankDeposit = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 1) {
      toast.error("Enter a valid amount");
      return;
    }
    setPayState("initiating");
    try {
      const res = await accountApi.deposit(value, "Bank Transfer");
      toast.success(res.message || "Deposit submitted. An admin will confirm it shortly.");
      setAmount("");
      setPayState("idle");
      void load();
    } catch (err) {
      setPayState("idle");
      toast.error("Deposit request failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  /* ── Withdraw ───────────────────────────────────────────────────────────── */
  const submitWithdraw = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 1) {
      toast.error("Enter a valid amount");
      return;
    }
    setPayState("initiating");
    try {
      const res = await accountApi.withdraw(value, "Bank Transfer");
      toast.success(res.message || "Withdrawal request submitted.");
      setAmount("");
      setPayState("idle");
      void load();
    } catch (err) {
      setPayState("idle");
      toast.error("Withdrawal failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const reset = () => {
    setPayState("idle");
    setPendingRef(null);
    setCheckoutUrl(null);
    setReceipt(null);
  };

  const isLoading = payState === "initiating" || payState === "verifying";
  const cash = portfolio?.cash ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Wallet"
        subtitle="Fund your account instantly with mobile money or card."
      />

      {/* ── Balance strip ───────────────────────────────────────────────── */}
      <div className="mb-8 overflow-x-auto rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/30 shadow-xl no-scrollbar">
        <div className="flex divide-x divide-border/40 sm:grid sm:grid-cols-3 sm:divide-y-0">
          {[
            {
              label: "Available Balance",
              value: portfolio ? formatGHS(cash) : "—",
              icon: Wallet,
              highlight: true,
            },
            {
              label: "Portfolio Value",
              value: portfolio ? formatGHS(portfolio.totalValue) : "—",
              icon: TrendingUp,
              highlight: false,
            },
            {
              label: "Transactions",
              value: String(history.length),
              icon: Banknote,
              highlight: false,
            },
          ].map(({ label, value, icon: Icon, highlight }) => (
            <div key={label} className="flex shrink-0 items-center gap-4 p-5 sm:p-6 min-w-[220px] sm:min-w-0">
              <div className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                highlight ? "bg-amber-500/15" : "bg-muted"
              )}>
                <Icon className={cn("h-5 w-5", highlight ? "text-amber-400" : "text-muted-foreground")} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className={cn(
                  "text-lg font-bold tabular-nums tracking-tight",
                  highlight && "text-amber-400"
                )}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* ── Transaction form ──────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Action tabs */}
          <Tabs value={tab} onValueChange={(v) => { setTab(v); reset(); }}>
            <TabsList className="h-11 w-full rounded-xl bg-muted p-1">
              <TabsTrigger value="deposit" className="flex-1 gap-2 rounded-lg text-sm font-semibold">
                <ArrowDownToLine className="h-4 w-4" /> Deposit
              </TabsTrigger>
              <TabsTrigger value="withdraw" className="flex-1 gap-2 rounded-lg text-sm font-semibold">
                <ArrowUpFromLine className="h-4 w-4" /> Withdraw
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {tab === "deposit" && (
            <>
              {/* Payment method selector */}
              <div className="grid gap-3 sm:grid-cols-3">
                {METHODS.map((m) => {
                  const Icon = m.icon;
                  const active = method === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => { setMethod(m.id); reset(); }}
                      className={cn(
                        "relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 hover:scale-[1.02]",
                        active
                          ? `bg-gradient-to-br ${m.color} ${m.border} ring-1 ring-current`
                          : "border-border/60 bg-card hover:border-border"
                      )}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg",
                          active ? "bg-white/10" : "bg-muted"
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", m.badgeColor)}>
                          {m.badge}
                        </span>
                      </div>
                      <p className="text-sm font-bold">{m.label}</p>
                      <p className="text-xs text-muted-foreground">{m.desc}</p>
                      {active && (
                        <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-amber-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Success / Failed state overlay */}
              {(payState === "success" || payState === "failed") && (
                <div className={cn(
                  "flex flex-col items-center gap-4 rounded-2xl border p-8 text-center",
                  payState === "success"
                    ? "border-green-500/30 bg-green-500/10"
                    : "border-red-500/30 bg-red-500/10"
                )}>
                  {payState === "success" ? (
                    <>
                      <CheckCircle2 className="h-14 w-14 text-green-400" />
                      <p className="text-xl font-bold text-green-400">Payment Confirmed!</p>
                      <p className="text-sm text-muted-foreground">
                        {receipt?.amount != null ? formatGHS(receipt.amount) : "Your deposit"} has been credited to your wallet.
                      </p>
                      {receipt?.payRef && (
                        <p className="font-mono text-xs text-muted-foreground/70">Ref: {receipt.payRef}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <XCircle className="h-14 w-14 text-red-400" />
                      <p className="text-xl font-bold text-red-400">Payment Failed</p>
                      <p className="text-sm text-muted-foreground">
                        The transaction was not completed. Please try again.
                      </p>
                    </>
                  )}
                  <Button variant="outline" onClick={reset} className="mt-2 gap-2">
                    <RefreshCw className="h-4 w-4" /> New transaction
                  </Button>
                </div>
              )}

              {/* Form */}
              {payState !== "success" && payState !== "failed" && (
                <div className="space-y-5 rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all duration-300 min-h-[300px]">
                  {!method ? (
                    <div className="flex h-full min-h-[300px] flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in-95 duration-500">
                      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-muted border border-border/50 shadow-sm">
                        <Wallet className="h-10 w-10 text-muted-foreground/50" />
                      </div>
                      <p className="text-lg font-bold text-foreground">Select a payment method</p>
                      <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
                        Please select Mobile Money, Card, or Bank Transfer above to continue with your deposit.
                      </p>
                    </div>
                  ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-5">
                      {/* Quick amount pills */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Quick select
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_AMOUNTS.map((a) => (
                        <button
                          key={a}
                          onClick={() => setAmount(String(a))}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors",
                            amount === String(a)
                              ? "border-amber-500 bg-amber-500/15 text-amber-400"
                              : "border-border bg-muted text-muted-foreground hover:border-border/80 hover:text-foreground"
                          )}
                        >
                          {formatGHS(a)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount input */}
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-sm font-semibold">Amount (GHS)</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                        GH₵
                      </span>
                      <Input
                        id="amount"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="pl-12 text-lg font-bold tabular-nums"
                        disabled={payState === "awaiting" || isLoading}
                      />
                    </div>
                  </div>

                  {/* Phone (MoMo only) */}
                  {method === "MOMO" && (
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-semibold">MoMo Number</Label>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="0244 123 456"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="pl-10"
                          disabled={payState === "awaiting" || isLoading}
                        />
                      </div>
                    </div>
                  )}

                  {/* Awaiting state — auto-polling + manual verify */}
                  {payState === "awaiting" && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                      <p className="font-semibold text-amber-400">
                        ⚡ Checkout opened — waiting for payment…
                      </p>
                      <p className="mt-1 text-amber-300/80">
                        Complete your payment in the checkout tab. This page checks automatically — or click <strong>Verify payment</strong> once you&apos;re done.
                        {checkoutUrl && (
                          <>
                            {" "}
                            If the checkout didn&apos;t open,{" "}
                            <a
                              href={checkoutUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold underline underline-offset-2"
                            >
                              open it manually
                            </a>
                            .
                          </>
                        )}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={verifyPayment}
                          disabled={isLoading}
                          className="gap-2 bg-amber-500 text-black hover:bg-amber-400"
                        >
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                          Verify payment
                        </Button>
                        <Button size="sm" variant="outline" onClick={reset}>Cancel</Button>
                        <span className="ml-auto flex items-center gap-1.5 text-xs text-amber-300/70">
                          <Loader2 className="h-3 w-3 animate-spin" /> auto-checking
                        </span>
                      </div>
                    </div>
                  )}

                  {/* CTA button */}
                  {payState === "idle" && (
                    <Button
                      size="lg"
                      className="w-full gap-2 bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-black hover:from-amber-400 hover:to-amber-500"
                      onClick={method === "BANK" ? submitBankDeposit : initiateGatewayPayment}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : method === "BANK" ? (
                        <ArrowDownToLine className="h-5 w-5" />
                      ) : (
                        <ExternalLink className="h-5 w-5" />
                      )}
                      {method === "BANK"
                        ? "Submit bank deposit request"
                        : `Pay ${amount ? formatGHS(Number(amount)) : "now"} via ${METHODS.find(m => m.id === method)?.label}`}
                    </Button>
                  )}

                  {method === "BANK" && (
                    <div className="rounded-xl border border-border/60 bg-muted/50 p-4 text-xs text-muted-foreground">
                      <p className="font-semibold text-foreground">Bank transfer details</p>
                      <p className="mt-1">Transfer to the Constant Capital GCB trust account and submit your deposit slip to your relationship manager for confirmation.</p>
                    </div>
                  )}

                  <p className="text-center text-xs text-muted-foreground mt-2">
                    Secured by Advansis Pay · ExpressPay · GHS only
                  </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {tab === "withdraw" && (
            <div className="space-y-5 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/50 p-4">
                <Wallet className="h-5 w-5 text-amber-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Available to withdraw</p>
                  <p className="text-lg font-bold tabular-nums text-amber-400">{formatGHS(cash)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="w-amount" className="text-sm font-semibold">Amount (GHS)</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">GH₵</span>
                  <Input
                    id="w-amount"
                    type="number"
                    min="1"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-12 text-lg font-bold tabular-nums"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                size="lg"
                variant="outline"
                className="w-full gap-2 border-red-500/30 font-bold text-red-400 hover:bg-red-500/10"
                onClick={submitWithdraw}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUpFromLine className="h-5 w-5" />}
                Request withdrawal
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Withdrawals are processed within 1–2 business days to your linked bank account.
              </p>
            </div>
          )}
        </div>

        {/* ── Transaction history ─────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="border-b border-border/60 px-5 py-4">
            <p className="font-bold">Transaction history</p>
          </div>
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Banknote className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
            </div>
          ) : (
            <div className="max-h-[520px] divide-y divide-border/50 overflow-y-auto">
              {history.map((t) => {
                const isDeposit = t.type === "deposit";
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTx(t)}
                    className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40 focus:bg-muted/40 outline-none"
                  >
                    <div className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      isDeposit ? "bg-green-500/10" : "bg-red-500/10"
                    )}>
                      {isDeposit
                        ? <ArrowDownToLine className="h-4 w-4 text-green-400" />
                        : <ArrowUpFromLine className="h-4 w-4 text-red-400" />}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-semibold capitalize">{t.type}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {t.detail ?? t.reference ?? "—"} · {formatDateTime(t.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "shrink-0 text-sm font-bold tabular-nums",
                        isDeposit ? "text-green-400" : "text-red-400"
                      )}>
                        {isDeposit ? "+" : "−"}{formatGHS(Math.abs(t.amount))}
                      </p>
                      <p className={cn(
                        "text-[10px] font-bold uppercase tracking-wider mt-0.5",
                        t.status === "completed" ? "text-green-500" :
                        t.status === "pending" || t.status === "processing" ? "text-amber-500" :
                        "text-red-500"
                      )}>{t.status}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Details Drawer */}
      <Sheet open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <SheetContent side="right" className="w-full border-border/60 bg-card sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Transaction Details</SheetTitle>
            <SheetDescription>Full overview of this {selectedTx?.type}</SheetDescription>
          </SheetHeader>

          {selectedTx && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-center py-4">
                <div className="text-center space-y-2">
                  <div className={cn(
                    "mx-auto flex h-14 w-14 items-center justify-center rounded-full",
                    selectedTx.type === "deposit" ? "bg-green-500/10" : "bg-red-500/10"
                  )}>
                    {selectedTx.type === "deposit" ? (
                      <ArrowDownToLine className="h-7 w-7 text-green-500" />
                    ) : (
                      <ArrowUpFromLine className="h-7 w-7 text-red-500" />
                    )}
                  </div>
                  <h2 className="text-3xl font-bold tabular-nums tracking-tight">
                    {formatGHS(Math.abs(selectedTx.amount))}
                  </h2>
                  <div className={cn(
                    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider",
                    selectedTx.status === "completed" ? "bg-green-500/15 text-green-500" :
                    selectedTx.status === "pending" || selectedTx.status === "processing" ? "bg-amber-500/15 text-amber-500" :
                    "bg-red-500/15 text-red-500"
                  )}>
                    {selectedTx.status}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 divide-y divide-border/60">
                <div className="flex items-center justify-between p-3.5 text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-semibold capitalize">{selectedTx.type}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{formatDateTime(selectedTx.created_at)}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 text-sm">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-mono text-xs">{selectedTx.payRef || selectedTx.reference || selectedTx.id}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 text-sm">
                  <span className="text-muted-foreground">Method</span>
                  <span className="font-medium">
                    {selectedTx.channel === "MOMO" ? "Mobile Money" :
                     selectedTx.channel === "CARD" ? "Card" :
                     selectedTx.channel === "BANK_TRANSFER" ? "Bank Transfer" :
                     selectedTx.detail || "Gateway"}
                  </span>
                </div>
              </div>
              
              <div className="pt-2 flex gap-3 print:hidden">
                <Button className="w-full bg-brand-navy text-white hover:bg-brand-navy/90" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Receipt
                </Button>
                <Button className="w-full" variant="outline" onClick={() => setSelectedTx(null)}>
                  Close
                </Button>
              </div>

              {/* Printable Receipt (Hidden on screen, visible on print) */}
              <div className="hidden print:block fixed inset-0 z-[99999] bg-white text-black p-10 font-sans">
                <div className="mx-auto max-w-2xl border border-gray-200 rounded-2xl p-8 bg-white">
                  <div className="flex justify-between items-start mb-12">
                    <div>
                      <h1 className="text-3xl font-black tracking-tight text-gray-900">CONSTANT CAPITAL</h1>
                      <p className="text-sm text-gray-500 mt-1">Premium Brokerage Services</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-2xl font-semibold text-gray-800">TRANSACTION RECEIPT</h2>
                      <p className="text-sm font-mono text-gray-500 mt-1">{selectedTx.payRef || selectedTx.reference || selectedTx.id}</p>
                    </div>
                  </div>

                  <div className="mb-12">
                    <p className="text-sm text-gray-500 uppercase tracking-widest font-semibold mb-2">Transaction Details</p>
                    <div className="grid grid-cols-2 gap-y-4 text-base">
                      <div className="text-gray-600">Type</div>
                      <div className="font-semibold text-gray-900 capitalize">{selectedTx.type}</div>
                      
                      <div className="text-gray-600">Date</div>
                      <div className="font-semibold text-gray-900">{formatDateTime(selectedTx.created_at)}</div>
                      
                      <div className="text-gray-600">Method</div>
                      <div className="font-semibold text-gray-900">
                        {selectedTx.channel === "MOMO" ? "Mobile Money" :
                         selectedTx.channel === "CARD" ? "Card" :
                         selectedTx.channel === "BANK_TRANSFER" ? "Bank Transfer" :
                         selectedTx.detail || "Gateway"}
                      </div>
                      
                      <div className="text-gray-600">Status</div>
                      <div className="font-semibold text-gray-900 uppercase">{selectedTx.status}</div>
                    </div>
                  </div>

                  <div className="border-t border-b border-gray-200 py-6 mb-12 flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-700">Total Amount</span>
                    <span className="text-3xl font-bold text-gray-900">
                      {formatGHS(Math.abs(selectedTx.amount))}
                    </span>
                  </div>

                  <div className="text-center text-sm text-gray-500">
                    <p>Thank you for choosing Constant Capital.</p>
                    <p>For support, contact support@constantcap.com.gh</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Funding;
