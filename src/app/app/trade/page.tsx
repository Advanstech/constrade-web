"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
;
import { toast } from "sonner";
import { ArrowLeftRight, Check, Info, Loader2, Search, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { accountApi, marketsApi, tradingApi } from "@/lib/api";
import { useAuth } from "@/auth/AuthProvider";
import type { Order, Quote } from "@/lib/api.types";
import { changeBgClass, formatGHS, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

const Trade = () => {
  const { profile } = useAuth();
  const kycApproved = profile?.kyc_status === "approved";
  const params = useSearchParams();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selected, setSelected] = useState<Quote | null>(null);
  const [cash, setCash] = useState(0);
  const [query, setQuery] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [quantity, setQuantity] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState<Order | null>(null);

  useEffect(() => {
    let alive = true;
    void Promise.all([marketsApi.instruments(), accountApi.portfolio()])
      .then(([all, p]) => {
        if (!alive) return;
        setQuotes(all);
        setCash(p.cash);
        const fromUrl = params.get("ticker");
        const initial =
          all.find((q) => q.ticker === fromUrl?.toUpperCase()) ?? all[0] ?? null;
        setSelected(initial);
        if (initial) setLimitPrice(String(initial.price));
      })
      .catch(() => toast.error("Could not load market data"));
    return () => {
      alive = false;
    };
  }, [params]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return quotes.filter(
      (x) => !q || x.ticker.toLowerCase().includes(q) || x.name.toLowerCase().includes(q),
    );
  }, [quotes, query]);

  const qty = Number(quantity);
  const limit = Number(limitPrice);
  const refPrice = selected?.price ?? 0;
  const effectivePrice = orderType === "limit" ? (limit > 0 ? limit : refPrice) : refPrice;
  const estimate = qty > 0 ? qty * effectivePrice : 0;
  const sufficient = side === "buy" ? estimate <= cash : true;

  const submit = async () => {
    if (!selected) return;
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    setSubmitting(true);
    try {
      const { order, message } = await tradingApi.placeOrder({
        instrument: selected.ticker,
        side,
        orderType,
        quantity: qty,
        limitPrice: orderType === "limit" ? limit : undefined,
      });
      setPlaced(order);
      toast.success(message ?? "Order submitted");
    } catch (err) {
      toast.error("Order failed", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Trade"
        subtitle="Place a buy or sell order on the Ghana Stock Exchange."
        actions={
          <span className="hidden items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm sm:flex">
            <span className="text-xs text-muted-foreground">Available cash</span>
            <span className="font-bold text-success">{formatGHS(cash)}</span>
          </span>
        }
      />

      {!kycApproved ? (
        <Card className="mx-auto mt-4 max-w-xl border-brand-bronze/30 shadow-card">
          <CardContent className="p-8 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-bronze/15">
              <ShieldCheck className="h-7 w-7 text-brand-bronze" />
            </span>
            <h2 className="mt-4 font-display text-xl font-extrabold text-card-foreground">
              Complete your account opening &amp; KYC to trade
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              SEC-Ghana regulations require your identity and financial profile to be verified
              before you can place orders on the Ghana Stock Exchange.
            </p>
            <div className="mx-auto mt-6 flex max-w-xs flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild variant="premium" size="lg">
                <Link href="/register/onboarding">
                  Continue application <ArrowLeftRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/app/profile">View KYC status</Link>
              </Button>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              You can still browse the markets while your application is pending.
            </p>
          </CardContent>
        </Card>
      ) : (
      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        {/* Instrument picker */}
        <Card>
          <CardContent className="p-0">
            <div className="border-b border-border p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search instruments…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-[24rem] overflow-y-auto">
              {quotes.length === 0
                ? Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="mx-4 my-2 h-12" />
                  ))
                : list.map((q) => (
                    <button
                      key={q.ticker}
                      onClick={() => {
                        setSelected(q);
                        setLimitPrice(String(q.price));
                      }}
                      className={cn(
                        "flex w-full items-center justify-between border-b border-border/50 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                        selected?.ticker === q.ticker && "bg-brand-bronze-soft/60",
                      )}
                    >
                      <div>
                        <p className="text-sm font-semibold">{q.ticker}</p>
                        <p className="text-xs text-muted-foreground">{q.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {q.assetClass === "fixed_income" && q.yieldToMaturity
                            ? `${q.yieldToMaturity.toFixed(2)}%`
                            : formatGHS(q.price)}
                        </p>
                        <p className={`text-xs font-semibold ${changeBgClass(q.changePct)}`}>
                          {formatPercent(q.changePct)}
                        </p>
                      </div>
                    </button>
                  ))}
            </div>
          </CardContent>
        </Card>

        {/* Order ticket */}
        <Card className="self-start">
          <CardContent className="p-5 sm:p-6">
            {placed ? (
              <div className="py-6 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
                  <Check className="h-7 w-7 text-success" />
                </span>
                <h2 className="mt-4 font-display text-xl font-bold">Order submitted</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Your {side} order for {placed.quantity} × {placed.instrument} is pending
                  approval and will be reviewed by our trading desk.
                </p>
                <div className="mx-auto mt-5 max-w-xs rounded-lg border border-border bg-muted/40 p-4 text-left text-sm">
                  <Row label="Order ref" value={placed.id.slice(0, 8).toUpperCase()} />
                  <Row label="Instrument" value={placed.instrument} />
                  <Row label="Type" value={`${placed.side.toUpperCase()} · ${placed.order_type.toUpperCase()}`} />
                  <Row label="Quantity" value={String(placed.quantity)} />
                  <Row label="Price" value={formatGHS(placed.price)} />
                </div>
                <Button
                  variant="outline"
                  className="mt-6"
                  onClick={() => {
                    setPlaced(null);
                    setQuantity("");
                  }}
                >
                  Place another order
                </Button>
              </div>
            ) : selected ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-lg font-bold">{selected.ticker}</h2>
                    <p className="text-sm text-muted-foreground">{selected.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl font-extrabold">
                      {formatGHS(selected.price)}
                    </p>
                    <p className={`text-xs font-semibold ${changeBgClass(selected.changePct)}`}>
                      {formatPercent(selected.changePct)}
                    </p>
                  </div>
                </div>

                <Tabs
                  value={side}
                  onValueChange={(v) => setSide(v as "buy" | "sell")}
                  className="mt-5"
                >
                  <TabsList className="grid w-full grid-cols-2 bg-muted">
                    <TabsTrigger
                      value="buy"
                      className="data-[state=active]:bg-success data-[state=active]:text-success-foreground"
                    >
                      Buy
                    </TabsTrigger>
                    <TabsTrigger
                      value="sell"
                      className="data-[state=active]:bg-danger data-[state=active]:text-danger-foreground"
                    >
                      Sell
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <Tabs value={orderType} onValueChange={(v) => setOrderType(v as "market" | "limit")} className="mt-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="market">Market</TabsTrigger>
                    <TabsTrigger value="limit">Limit</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>
                      Quantity{" "}
                      {selected.assetClass === "fixed_income" ? "(nominal value)" : "(shares)"}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step={selected.assetClass === "fixed_income" ? "1000" : "1"}
                      placeholder="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                  {orderType === "limit" && (
                    <div className="space-y-2">
                      <Label>Limit price (GHS)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={limitPrice}
                        onChange={(e) => setLimitPrice(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="mt-5 space-y-2 rounded-xl border border-border bg-muted/40 p-4 text-sm">
                  <Row label="Reference price" value={formatGHS(refPrice)} />
                  <Row label="Estimated cost" value={formatGHS(estimate)} strong />
                  <Row label="Available cash" value={formatGHS(cash)} />
                </div>

                {side === "buy" && !sufficient && (
                  <p className="mt-3 flex items-center gap-2 text-xs text-danger">
                    <Info className="h-3.5 w-3.5" /> Insufficient cash for this order.
                  </p>
                )}

                <Button
                  size="lg"
                  className={cn(
                    "mt-5 w-full",
                    side === "buy" ? "bg-success text-success-foreground hover:bg-success/90" : "bg-danger text-danger-foreground hover:bg-danger/90",
                  )}
                  disabled={submitting}
                  onClick={submit}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />}
                  {submitting
                    ? "Submitting…"
                    : `${side === "buy" ? "Buy" : "Sell"} ${selected.ticker}`}
                </Button>

                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  Orders are submitted to the Constant Capital trading desk for approval during
                  GSE trading hours (Mon–Fri, 09:00–15:00 GMT).
                </p>
              </>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Select an instrument to trade.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      )}
    </div>
  );
};

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", strong ? "font-bold text-foreground" : "text-foreground")}>
        {value}
      </span>
    </div>
  );
}

export default Trade;
