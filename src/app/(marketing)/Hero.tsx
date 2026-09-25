"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, BadgeCheck, Globe2, Landmark, TrendingUp, Smartphone, Play, Search, Bell, PieChart as PieChartIcon } from "lucide-react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

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
        { label: "GSE Composite", value: summary.gseComposite?.toFixed(2) ?? "—", change: summary.gseChangePct },
        { label: "USD/GHS", value: summary.usdGhs?.toFixed(4) ?? "—", change: summary.usdGhsChangePct },
        { label: "91-Day T-Bill", value: summary.tbill91 != null ? `${summary.tbill91.toFixed(2)}%` : "—", change: summary.tbill91ChangePct },
      ]
    : [];

  return (
    <section 
      ref={containerRef} 
      className="relative min-h-[100vh] w-full overflow-hidden bg-background pt-24 pb-20 sm:pt-32 flex items-center"
    >
      {/* Dynamic Background Glows */}
      <motion.div 
        style={{ y: y1 }}
        className="pointer-events-none absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-brand-bronze/10 blur-[100px]" 
      />
      <motion.div 
        style={{ y: y2 }}
        className="pointer-events-none absolute -bottom-40 -right-20 h-[600px] w-[600px] rounded-full bg-brand-orange/5 blur-[120px]" 
      />
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        
        {/* Left Column: Copy & CTAs */}
        <motion.div 
          style={{ opacity, scale }}
          className="relative z-10 flex flex-col items-start"
        >
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="inline-flex items-center gap-2 rounded-full border border-brand-bronze/30 bg-brand-bronze/10 px-4 py-2 text-xs font-semibold text-brand-bronze shadow-[0_0_20px_rgba(201,160,113,0.15)] backdrop-blur-md"
          >
            <BadgeCheck className="h-4 w-4" />
            SEC-Ghana Regulated · Licensed GSE Broker
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="mt-6 font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-[4.2rem]"
          >
            Invest for the <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-bronze via-brand-orange to-brand-bronze bg-300% animate-gradient-x">
              Future
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
          >
            Work with all the necessary information and tools to boost money flow from your capital investment. 
            Trade Ghanaian equities, treasury bills, and fixed income on both Web and Mobile.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Button asChild size="xl" variant="premium" className="rounded-full px-8 shadow-xl shadow-brand-bronze/20 hover:shadow-brand-bronze/40 transition-all hover:-translate-y-1">
              <Link href="/register">
                Open Web Platform <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline" className="rounded-full px-8 bg-card/50 backdrop-blur-sm border-border hover:bg-muted/80 transition-all hover:-translate-y-1">
              <Link href="#download">
                <Smartphone className="mr-2 h-5 w-5" /> Get Mobile App
              </Link>
            </Button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="mt-16 grid grid-cols-3 gap-8 divide-x divide-border/50 w-full max-w-lg"
          >
            {STATS.map((s, i) => (
              <div key={s.label} className={i === 0 ? "pr-4" : "px-4"}>
                <p className="font-display text-3xl font-extrabold text-foreground">
                  {s.value}
                </p>
                <p className="mt-1 text-sm font-medium text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right Column: Floating UI Cards */}
        <div className="relative h-[600px] w-full hidden lg:block perspective-1000">
          
          {/* Main Mobile App Mockup (Center) */}
          <motion.div 
            style={{ y: y3 }}
            initial={{ opacity: 0, y: 50, rotateX: 10, rotateY: -10 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, rotateY: 0 }}
            transition={{ duration: 0.8, delay: 0.3, type: "spring", bounce: 0.4 }}
            className="absolute left-1/2 top-1/2 z-20 h-[500px] w-[260px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[2.5rem] border-[6px] border-black/90 bg-card shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] dark:border-white/10 dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)]"
          >
            {/* Mockup Notch */}
            <div className="absolute left-1/2 top-0 z-30 h-6 w-32 -translate-x-1/2 rounded-b-xl bg-black/90 dark:bg-white/10" />
            
            {/* Mockup Content */}
            <div className="flex h-full w-full flex-col bg-background p-4 pt-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Welcome back</p>
                  <p className="font-display font-bold text-lg">Portfolio</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-brand-bronze/20 flex items-center justify-center">
                  <Bell className="h-4 w-4 text-brand-bronze" />
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-brand p-4 text-white shadow-lg mb-6">
                <p className="text-xs text-white/80 font-medium">Total Balance</p>
                <p className="font-display text-2xl font-extrabold mt-1">₵ 124,500.00</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">+2.4% today</span>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm">Market Movers</p>
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
                {rows.map((r, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-muted/40 p-3">
                    <span className="text-xs font-semibold">{r.label}</span>
                    <div className="text-right">
                      <p className="text-xs font-bold">{r.value}</p>
                      <p className={`text-[10px] font-bold ${changeBgClass(r.change)} px-1 rounded mt-0.5 inline-block`}>
                        {formatPercent(r.change)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Web App Analytics Card (Floating Left) */}
          <motion.div 
            style={{ y: y2 }}
            initial={{ opacity: 0, x: -50, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.5, type: "spring" }}
            className="absolute left-[-20px] top-[100px] z-30 w-64 rounded-2xl border border-border/50 bg-card/80 p-5 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <PieChartIcon className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Allocation</p>
                <p className="font-bold text-sm">Dividend Strategy</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span>Equities</span>
                <span className="font-bold">65%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 w-[65%]" />
              </div>
              <div className="flex justify-between items-center text-xs pt-2">
                <span>Fixed Income</span>
                <span className="font-bold">35%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 w-[35%]" />
              </div>
            </div>
          </motion.div>

          {/* Live Market Ticker Card (Floating Right) */}
          <motion.div 
            style={{ y: y1 }}
            initial={{ opacity: 0, x: 50, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.7, type: "spring" }}
            className="absolute right-[-40px] bottom-[120px] z-30 w-72 rounded-2xl border border-white/10 bg-[#0f172a]/95 p-5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/20">
                  <TrendingUp className="h-4 w-4 text-brand-orange" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">Live Execution</p>
                  <p className="text-[10px] uppercase tracking-wider text-white/50">Constant Capital</p>
                </div>
              </div>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">MTNGH</p>
                  <p className="text-[10px] text-white/50">Buy Market</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-400">Filled</p>
                  <p className="text-[10px] text-white/50">0.003s latency</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">GCB</p>
                  <p className="text-[10px] text-white/50">Sell Limit</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-amber-400">Pending</p>
                  <p className="text-[10px] text-white/50">₵4.50</p>
                </div>
              </div>
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
