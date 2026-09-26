"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeftRight,
  Briefcase,
  CandlestickChart,
  FileSearch,
  LineChart,
  Smartphone,
  Users,
  Activity,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";

const SERVICES = [
  {
    icon: CandlestickChart,
    title: "Securities Trading",
    body: "Access the Ghana Stock Exchange and African markets with competitive rates. Execute trades instantly across our web, iOS, and Android platforms.",
    className: "lg:col-span-2 lg:row-span-2 bg-gradient-to-br from-brand-navy via-brand-navy/95 to-brand-navy/90 text-white border-brand-navy/50",
    iconClassName: "bg-white/10 text-brand-bronze",
    titleClassName: "text-white",
    bodyClassName: "text-white/70",
    isLarge: true,
    href: "/app/trade",
  },
  {
    icon: LineChart,
    title: "Fixed Income",
    body: "Invest in Ghanaian treasury bills and government bonds with live yields and reinvestment guidance.",
    className: "lg:col-span-1 bg-card",
    iconClassName: "bg-brand-bronze/10 text-brand-bronze",
    titleClassName: "text-card-foreground",
    bodyClassName: "text-muted-foreground",
    href: "/app/markets",
  },
  {
    icon: ArrowLeftRight,
    title: "FX Trading",
    body: "Licensed foreign exchange services with institutional hedging solutions for businesses.",
    className: "lg:col-span-1 bg-card",
    iconClassName: "bg-brand-bronze/10 text-brand-bronze",
    titleClassName: "text-card-foreground",
    bodyClassName: "text-muted-foreground",
    href: "/app/trade",
  },
  {
    icon: FileSearch,
    title: "Investment Research",
    body: "Comprehensive market intelligence covering Ghana and emerging African opportunities.",
    className: "lg:col-span-1 bg-card",
    iconClassName: "bg-brand-bronze/10 text-brand-bronze",
    titleClassName: "text-card-foreground",
    bodyClassName: "text-muted-foreground",
    href: "/app/markets",
  },
  {
    icon: Briefcase,
    title: "Capital Markets",
    body: "International capital raising through debt and equity offerings, connecting Africa with global investors.",
    className: "lg:col-span-1 bg-card",
    iconClassName: "bg-brand-bronze/10 text-brand-bronze",
    titleClassName: "text-card-foreground",
    bodyClassName: "text-muted-foreground",
    href: "/register",
  },
  {
    icon: Users,
    title: "Investment Advisory",
    body: "Tailored portfolio management for institutions, family offices, and high-net-worth clients.",
    className: "lg:col-span-1 bg-card",
    iconClassName: "bg-brand-bronze/10 text-brand-bronze",
    titleClassName: "text-card-foreground",
    bodyClassName: "text-muted-foreground",
    href: "/register",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

function DecorativeChart() {
  return (
    <div className="flex-1 min-h-[180px] my-6 relative rounded-2xl border border-white/10 bg-black/20 overflow-hidden flex flex-col p-4">
      {/* Chart grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
        </div>
        <div className="text-white/40 text-[10px] font-mono tracking-wider">LIVE TRADING</div>
      </div>

      {/* Candlesticks & Line */}
      <div className="relative z-10 flex-1 flex items-end justify-between gap-2 mt-2 px-1">
        {[
          { h: 30, t: 'up' }, { h: 50, t: 'up' }, { h: 40, t: 'down' },
          { h: 65, t: 'up' }, { h: 80, t: 'up' }, { h: 55, t: 'down' },
          { h: 45, t: 'down' }, { h: 75, t: 'up' }, { h: 90, t: 'up' }, { h: 100, t: 'up' }
        ].map((candle, i) => (
          <div key={i} className="relative flex flex-col items-center flex-1 justify-end h-full group/candle">
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              whileInView={{ height: `${candle.h}%`, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.1, type: "spring", bounce: 0.4 }}
              className="w-full flex items-center justify-center relative"
            >
              {/* Wick */}
              <div className={cn(
                "absolute top-[-20%] bottom-[-10%] w-[1px] transition-colors duration-300",
                candle.t === 'up' ? "bg-emerald-400/40 group-hover/candle:bg-emerald-400" : "bg-rose-400/40 group-hover/candle:bg-rose-400"
              )} />
              {/* Body */}
              <div className={cn(
                "w-full max-w-[12px] rounded-[2px] relative z-10 h-[60%] transition-colors duration-300",
                candle.t === 'up' ? "bg-emerald-400/80 group-hover/candle:bg-emerald-400" : "bg-rose-400/80 group-hover/candle:bg-rose-400"
              )} />
            </motion.div>
          </div>
        ))}
      </div>
      
      {/* Gradient fade at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
    </div>
  );
}

export function Services() {
  return (
    <section id="services" className="relative overflow-hidden bg-gradient-subtle py-20 lg:py-32">
      {/* Abstract Background Elements */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 -ml-[50%] h-[1000px] w-[200%] opacity-20 dark:opacity-10">
        <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat opacity-20 mix-blend-overlay" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
          className="absolute left-1/2 top-1/4 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-brand blur-[120px]"
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <div className="inline-flex items-center rounded-full border border-brand-bronze/30 bg-brand-bronze/10 px-3 py-1 mb-4">
            <Globe className="mr-2 h-3.5 w-3.5 text-brand-bronze" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-bronze">
              What We Do
            </p>
          </div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight text-brand-navy dark:text-white sm:text-5xl">
            Delivering for Our{" "}
            <span className="text-gradient-brand block mt-2">Global Clients</span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Connecting African opportunities with international capital through expert financial
            services, deep market knowledge, and world-class mobile and web platforms.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {SERVICES.map((s, i) => (
            <motion.div
              key={s.title}
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className={cn(
                "group relative overflow-hidden rounded-3xl border transition-all duration-300 shadow-sm hover:shadow-xl",
                s.className
              )}
            >
              <Link href={s.href} className="flex h-full flex-col p-8">
                {/* Glassmorphic hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/0 to-white/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
                
                <div className="relative z-10 flex h-full flex-col">
                  <span className={cn(
                    "inline-flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm mb-6 transition-transform duration-300 group-hover:scale-110",
                    s.iconClassName
                  )}>
                    <s.icon className="h-6 w-6" />
                  </span>
                  
                  <h3 className={cn("font-display text-2xl font-bold tracking-tight mb-3", s.titleClassName)}>
                    {s.title}
                  </h3>
                  
                  <p className={cn("text-base leading-relaxed flex-none", s.bodyClassName)}>
                    {s.body}
                  </p>
                  
                  {s.isLarge && (
                    <DecorativeChart />
                  )}
                  
                  {!s.isLarge && (
                    <div className="flex-1" />
                  )}
                  
                  {s.isLarge && (
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-md transition-colors hover:bg-white/10">
                        <div className="flex items-center gap-2 mb-2 text-white/80">
                          <Smartphone className="h-4 w-4 text-brand-bronze" />
                          <span className="text-xs font-semibold uppercase tracking-wider">Mobile App</span>
                        </div>
                        <p className="text-xs text-white/60 leading-relaxed">Native iOS & Android apps for trading on the go.</p>
                      </div>
                      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-md transition-colors hover:bg-white/10">
                        <div className="flex items-center gap-2 mb-2 text-white/80">
                          <Activity className="h-4 w-4 text-brand-bronze" />
                          <span className="text-xs font-semibold uppercase tracking-wider">Live Market</span>
                        </div>
                        <p className="text-xs text-white/60 leading-relaxed">Real-time GSE market data and interactive charts.</p>
                      </div>
                    </div>
                  )}
                  
                  {!s.isLarge && (
                    <div className="mt-6 flex items-center text-sm font-semibold text-brand-bronze opacity-0 -translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                      Learn more <ArrowLeftRight className="ml-2 h-4 w-4" />
                    </div>
                  )}
                </div>
                
                {/* Decorative corner blur for all cards */}
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand-bronze/20 blur-3xl transition-transform duration-700 group-hover:scale-150 pointer-events-none" />
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
