"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Loader2, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/market/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { accountApi } from "@/lib/api";
import type { Portfolio, Transaction } from "@/lib/api.types";
import { formatDateTime, formatGHS } from "@/lib/format";

const FUNDING_METHODS = ["Mobile Money", "Bank Transfer", "Cheque"];

const Funding = () => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [tab, setTab] = useState("deposit");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Mobile Money");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    void Promise.all([accountApi.portfolio(), accountApi.fundingHistory()]).then(
      ([p, t]) => {
        setPortfolio(p);
        setHistory(t);
      },
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSubmitting(true);
    try {
      if (tab === "deposit") {
        const res = await accountApi.deposit(value, method);
        toast.success(res.message);
      } else {
        const res = await accountApi.withdraw(value, method);
        toast.success(res.message);
      }
      setAmount("");
      load();
    } catch (err) {
      toast.error(tab === "deposit" ? "Deposit failed" : "Withdrawal failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Funding"
        subtitle="Deposit cash or withdraw from your Constant Capital account."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Available cash" value={portfolio ? formatGHS(portfolio.cash) : "—"} icon={<Wallet className="h-4 w-4 text-brand-bronze" />} />
        <StatCard label="Total value" value={portfolio ? formatGHS(portfolio.totalValue) : "—"} />
        <StatCard
          label="Deposits & withdrawals"
          value={String(history.length)}
        />
        <StatCard
          label="Last activity"
          value={history[0] ? formatDateTime(history[0].created_at) : "—"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">New transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="deposit">Deposit</TabsTrigger>
                <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label>Amount (GHS)</Label>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUNDING_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="lg"
                variant="premium"
                className="w-full"
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : tab === "deposit" ? (
                  <ArrowDownToLine className="h-4 w-4" />
                ) : (
                  <ArrowUpFromLine className="h-4 w-4" />
                )}
                {tab === "deposit" ? "Deposit funds" : "Withdraw funds"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Funding history</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {history.length === 0 ? (
              <p className="px-6 pb-8 text-center text-sm text-muted-foreground">
                No funding transactions yet.
              </p>
            ) : (
              <div className="max-h-[26rem] divide-y divide-border/60 overflow-y-auto">
                {history.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-6 py-3.5">
                    <div>
                      <p className="text-sm font-semibold capitalize">{t.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.reference} · {t.detail ?? "—"} · {formatDateTime(t.created_at)}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-bold ${
                        t.type === "withdraw" ? "text-danger" : "text-success"
                      }`}
                    >
                      {t.type === "withdraw" ? "−" : "+"}
                      {formatGHS(Math.abs(t.amount))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Funding;
