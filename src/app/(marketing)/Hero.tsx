"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Globe2, Landmark, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { marketsApi } from "@/lib/api";
import type { MarketSummary } from "@/lib/api.types";
import { changeBgClass, formatPercent } from "@/lib/format";

const STATS = [
  { value: "15+", label: "African Markets" },
  { value: "₵2B+", label: "Assets Managed" },
  { value: "SEC", label: "Regulated" },
];

export function Hero() {
  const [summary, setSummary] = useState<MarketSummary | null>(null);

  useEffect(() => {
    let alive = true;
    void marketsApi
      .summary()
      .then((s) => alive && setSummary(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const rows = summary
    ? [
        { label: "GSE Composite Index", value: summary.gseComposite.toFixed(2), change: summary.gseChangePct },
        { label: "USD/GHS", value: summary.usdGhs.toFixed(4), change: summary.usdGhsChangePct },
        { label: "91-Day T-Bill", value: `${summary.tbill91.toFixed(2)}%`, change: summary.tbill91ChangePct },
        { label: "Ghana Eurobond 2029", value: `${summary.eurobond2029.toFixed(2)}%`, change: summary.eurobond2029ChangePct },
      ]
    : [];

  return (
    <section className="bg-gradient-navy relative overflow-hidden">
      {/* ambient glows */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-bronze/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-brand-bronze/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-32 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:pb-28">
        <div>
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
            <BadgeCheck className="h-3.5 w-3.5 text-brand-bronze" />
            SEC-Ghana Regulated · Licensed on the Ghana Stock Exchange
          </div>

          <h1 className="animate-fade-up delay-100 mt-6 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
            Ghana&apos;s Premier Investment &amp;{" "}
            <span className="text-gradient-brand">Capital Markets</span>{" "}
            <span className="text-brand-bronze">Partner</span>
          </h1>

          <p className="animate-fade-up delay-200 mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
            Trade Ghanaian equities, treasury bills and fixed income online. Constant Capital
            connects African opportunities with global capital through expert brokerage, deep
            market research and institutional-grade execution.
          </p>

          <div className="animate-fade-up delay-300 mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="xl" variant="premium">
              <Link href="/register">
                Open an Account <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outlineLight">
              <a href="#services">Explore Services</a>
            </Button>
          </div>

          <div className="animate-fade-up delay-400 mt-12 grid max-w-lg grid-cols-3 divide-x divide-white/10">
            {STATS.map((s) => (
              <div key={s.label} className="px-4 first:pl-0">
                <p className="font-display text-2xl font-extrabold text-white sm:text-3xl">
                  {s.value}
                </p>
                <p className="mt-1 text-xs text-white/60">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Market summary card */}
        <div className="animate-fade-up delay-200">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-bronze/20">
                  <TrendingUp className="h-4 w-4 text-brand-bronze" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">Market Summary</p>
                  <p className="text-[10px] uppercase tracking-wider text-white/50">
                    Ghana Stock Exchange
                  </p>
                </div>
              </div>
              <Globe2 className="h-4 w-4 text-white/40" />
            </div>

            <div className="mt-4 space-y-3">
              {rows.length === 0
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-9 animate-pulse rounded-lg bg-white/5"
                      style={{ animationDelay: `${i * 100}ms` }}
                    />
                  ))
                : rows.map((r) => (
                    <div
                      key={r.label}
                      className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3.5 py-2.5"
                    >
                      <span className="text-xs text-white/70">{r.label}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{r.value}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${changeBgClass(r.change)}`}>
                          {formatPercent(r.change)}
                        </span>
                      </span>
                    </div>
                  ))}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-center">
              {summary ? (
                <>
                  <div>
                    <p className="text-sm font-bold text-white">{summary.advancers}</p>
                    <p className="text-[10px] uppercase tracking-wider text-success">Advancers</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{summary.decliners}</p>
                    <p className="text-[10px] uppercase tracking-wider text-danger">Decliners</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{summary.activeStocks}</p>
                    <p className="text-[10px] uppercase tracking-wider text-white/50">Active</p>
                  </div>
                </>
              ) : (
                <p className="col-span-3 text-center text-[10px] text-white/40">
                  Loading market data…
                </p>
              )}
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-white/45">
              <Landmark className="h-3 w-3" />
              Live feed powered by Constant Capital Research
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
