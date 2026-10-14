"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  TrendingUp,
  Smartphone,
  Search,
  Bell,
  ShieldCheck,
  Building2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { marketsApi } from "@/lib/api";
import type { MarketSummary, Quote } from "@/lib/api.types";
import { changeBgClass, formatGHS, formatPercent } from "@/lib/format";

const CREDENTIALS = [
  { value: "GSE · GFIM", label: "Equities & Fixed Income" },
  { value: "CSD Direct", label: "Depository Participant (CCL)" },
  { value: "SEC · BoG", label: "Regulated & Supervised" },
];

export function Hero() {
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -110]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.96]);

  useEffect(() => {
    let alive = true;
    void Promise.all([
      marketsApi.summary().catch(() => null),
      marketsApi.instruments().catch(() => [] as Quote[]),
    ]).then(([s, all]) => {
      if (!alive) return;
      if (s) setSummary(s);
      if (all.length) setQuotes(all);
    });
    return () => {
      alive = false;
    };
  }, []);

  const benchmarkRows = [
    {
      label: "GSE Composite (GSE-CI)",
      venue: "GSE",
      value: summary?.gseComposite != null ? summary.gseComposite.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—",
      change: summary?.gseChangePct ?? null,
    },
    {
      label: "91-Day GoG T-Bill",
      venue: "BoG",
      value: summary?.tbill91 != null ? `${summary.tbill91.toFixed(2)}%` : "—",
      change: summary?.tbill91ChangePct ?? null,
    },
    {
      label: "364-Day GoG T-Bill",
      venue: "BoG",
      value:
        summary?.tbill364 != null
          ? `${summary.tbill364.toFixed(2)}%`
          : summary?.usdGhs != null
            ? `₵${summary.usdGhs.toFixed(4)}`
            : "—",
      change: summary?.tbill364 != null ? summary.tbill364ChangePct ?? null : summary?.usdGhsChangePct ?? null,
    },
  ];

  // Top live GSE equities for the right-hand execution card (real quotes, never fabricated).
  const liveEquities = quotes
    .filter((q) => q.assetClass === "equity" && q.price > 0)
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct) || b.volume - a.volume)
    .slice(0, 3);

  return (
    <section
      ref={containerRef}
      className="relative min-h-[96vh] w-full overflow-hidden bg-background pt-24 pb-20 sm:pt-32 flex items-center"
    >
      {/* Dynamic Background Glows & Grid */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.35)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.35)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_40%,#000_60%,transparent_100%)]" />
      <motion.div
        style={{ y: y1 }}
        className="pointer-events-none absolute -left-32 -top-32 h-[520px] w-[520px] rounded-full bg-brand-bronze/15 blur-[120px]"
      />
      <motion.div
        style={{ y: y2 }}
        className="pointer-events-none absolute -bottom-40 -right-20 h-[620px] w-[620px] rounded-full bg-brand-navy/15 dark:bg-brand-bronze/10 blur-[140px]"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.12fr_0.88fr] lg:px-8">
        {/* Left Column: Copy & CTAs */}
        <motion.div
          style={{ opacity, scale }}
          className="relative z-10 flex flex-col items-start"
        >
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="inline-flex flex-wrap items-center gap-2 rounded-full border border-brand-bronze/35 bg-brand-bronze/10 px-4 py-1.5 text-xs font-semibold text-brand-bronze shadow-[0_0_24px_rgba(247,130,24,0.14)] backdrop-blur-md"
          >
            <BadgeCheck className="h-4 w-4 shrink-0" />
            <span>SEC-Ghana Licensed Broker-Dealer · GSE · GFIM · CSD Participant</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: "easeOut" }}
            className="mt-6 font-display text-4xl font-extrabold leading-[1.06] tracking-tight text-foreground sm:text-6xl lg:text-[3.95rem]"
          >
            Ghana&apos;s Institutional-Grade{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-bronze via-brand-orange to-brand-bronze">
              Secondary Trading
            </span>{" "}
            Desk.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16, ease: "easeOut" }}
            className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground"
          >
            Trade Ghana Stock Exchange (GSE) equities, Ghana Fixed Income Market (GFIM) bonds,
            and Bank of Ghana Treasury Bills from one unified brokerage account — settled
            directly into your Central Securities Depository (CSD) account with official
            contract notes on every fill.
          </motion.p>

          {/* Venue pills */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.22, ease: "easeOut" }}
            className="mt-6 flex flex-wrap items-center gap-2 text-xs"
          >
            {[
              "GSE Equities",
              "GFIM Secondary Bonds",
              "BoG 91D · 182D · 364D T-Bills",
              "CSD Direct Custody",
            ].map((pill) => (
              <span
                key={pill}
                className="rounded-lg border border-border/80 bg-card/70 px-3 py-1 font-medium text-foreground/85 backdrop-blur-sm"
              >
                {pill}
              </span>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28, ease: "easeOut" }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <Button
              asChild
              size="xl"
              variant="premium"
              className="rounded-full px-8 shadow-xl shadow-brand-bronze/25 hover:shadow-brand-bronze/40 transition-all hover:-translate-y-0.5"
            >
              <Link href="/register">
                Open Brokerage Account <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="xl"
              variant="outline"
              className="rounded-full px-8 bg-card/60 backdrop-blur-sm border-border hover:bg-muted/80 transition-all hover:-translate-y-0.5"
            >
              <a href="#markets">
                <Smartphone className="mr-2 h-5 w-5 text-brand-bronze" /> Explore Live Markets
              </a>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.36, ease: "easeOut" }}
            className="mt-14 grid grid-cols-3 gap-6 divide-x divide-border/60 w-full max-w-xl"
          >
            {CREDENTIALS.map((s, i) => (
              <div key={s.label} className={i === 0 ? "pr-3" : "px-4"}>
                <p className="font-display text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                  {s.value}
                </p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right Column: Live Trading Desk & CSD Custody Preview */}
        <div className="relative h-[590px] w-full hidden lg:block">
          {/* Center Terminal / Mobile Mockup */}
          <motion.div
            style={{ y: y3 }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.25, type: "spring", bounce: 0.3 }}
            className="absolute left-1/2 top-1/2 z-20 h-[510px] w-[285px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[2.5rem] border-[6px] border-brand-navy/95 bg-card shadow-[0_25px_60px_-15px_rgba(15,16,47,0.45)] dark:border-white/10"
          >
            <div className="absolute left-1/2 top-0 z-30 h-5 w-28 -translate-x-1/2 rounded-b-xl bg-brand-navy/95 dark:bg-white/10" />

            <div className="flex h-full w-full flex-col bg-background p-4 pt-9">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Constant Capital · CCL
                  </p>
                  <p className="font-display font-bold text-base">Ghana Markets Desk</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-brand-bronze/15 flex items-center justify-center">
                  <Bell className="h-4 w-4 text-brand-bronze" />
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-navy p-4 text-white shadow-lg mb-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-widest text-white/70 font-semibold">
                    GSE Composite Index
                  </p>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    LIVE · GSE
                  </span>
                </div>
                <p className="font-display text-2xl font-extrabold mt-1">
                  {summary?.gseComposite != null
                    ? summary.gseComposite.toLocaleString("en-GH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "—"}
                </p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-white/80">
                  <span>{formatPercent(summary?.gseChangePct ?? 0)} YTD / session</span>
                  <span className="font-mono text-brand-bronze">
                    {summary?.activeStocks ?? 0} listed
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Benchmarks &amp; Rates
                  </p>
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                {benchmarkRows.map((r) => (
                  <div
                    key={r.label}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/35 px-3 py-2.5"
                  >
                    <div>
                      <span className="text-xs font-semibold block">{r.label}</span>
                      <span className="text-[10px] font-mono uppercase text-brand-bronze">
                        {r.venue}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold font-mono">{r.value}</p>
                      {r.change != null && (
                        <p
                          className={`text-[10px] font-bold ${changeBgClass(r.change)} px-1 rounded mt-0.5 inline-block`}
                        >
                          {formatPercent(r.change)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Floating Left: CSD Custody & Settlement Card */}
          <motion.div
            style={{ y: y2 }}
            initial={{ opacity: 0, x: -40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.45, type: "spring" }}
            className="absolute left-[-16px] top-[76px] z-30 w-64 rounded-2xl border border-border/70 bg-card/90 p-4 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  CSD Account Active
                </p>
                <p className="font-bold text-xs">Direct Depository Custody</p>
              </div>
            </div>
            <div className="space-y-1.5 rounded-xl bg-muted/50 p-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Depository</span>
                <span className="font-semibold">CSD Ghana</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Participant</span>
                <span className="font-mono font-bold text-brand-bronze">CCL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contract Note</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Auto-Attached
                </span>
              </div>
            </div>
          </motion.div>

          {/* Floating Right: Live GSE Quotes Card */}
          <motion.div
            style={{ y: y1 }}
            initial={{ opacity: 0, x: 40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.6, type: "spring" }}
            className="absolute right-[-28px] bottom-[88px] z-30 w-72 rounded-2xl border border-white/10 bg-[#0F102F]/95 p-5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-bronze/20">
                  <TrendingUp className="h-4 w-4 text-brand-bronze" />
                </span>
                <div>
                  <p className="text-xs font-bold text-white">GSE Live Tape</p>
                  <p className="text-[10px] uppercase tracking-wider text-white/50">
                    Ghana Stock Exchange
                  </p>
                </div>
              </div>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>

            <div className="space-y-2.5">
              {liveEquities.length > 0 ? (
                liveEquities.map((eq) => (
                  <div key={eq.ticker} className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{eq.ticker}</p>
                      <p className="text-[10px] text-white/55 truncate max-w-[130px]">
                        {eq.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-bold text-white">
                        {formatGHS(eq.price)}
                      </p>
                      <p
                        className={`text-[10px] font-bold ${
                          eq.changePct > 0
                            ? "text-emerald-400"
                            : eq.changePct < 0
                              ? "text-rose-400"
                              : "text-white/50"
                        }`}
                      >
                        {formatPercent(eq.changePct)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 py-2 text-xs text-white/70">
                  <Building2 className="h-4 w-4 text-brand-bronze" />
                  <span>Connected to GSE &amp; GFIM order book</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Smooth scroll cue */}
      <a
        href="#markets"
        aria-label="Scroll to live markets"
        className="absolute bottom-5 left-1/2 -translate-x-1/2 hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3.5 py-1.5 text-[11px] font-medium text-muted-foreground backdrop-blur-md transition-colors hover:border-brand-bronze/40 hover:text-foreground"
      >
        <span>Live GSE &amp; GFIM Tape</span>
        <ChevronDown className="h-3.5 w-3.5 animate-bounce text-brand-bronze" />
      </a>
    </section>
  );
}
