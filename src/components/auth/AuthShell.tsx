"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { BadgeCheck, CandlestickChart, Landmark, Lock, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useAreaTheme } from "@/hooks/use-area-theme";
import { marketsApi } from "@/lib/api";
import type { MarketSummary } from "@/lib/api.types";

const HIGHLIGHTS = [
  {
    icon: CandlestickChart,
    title: "GSE & GFIM Secondary Execution",
    body: "Trade listed equities, GoG bonds, and BoG Treasury Bills from one unified account.",
  },
  {
    icon: Landmark,
    title: "Direct CSD Securities Custody",
    body: "Open a new Central Securities Depository account or link your existing CSD number (Broker Code: CCL).",
  },
  {
    icon: ShieldCheck,
    title: "SEC-Ghana Regulated & Audited",
    body: "Official broker contract notes attached to every executed trade, retained per AML Act 1044.",
  },
  {
    icon: Lock,
    title: "Passwordless OTP & Session Guard",
    body: "6-digit email PIN or password sign-in with automatic idle-session protection.",
  },
];

/** Split-screen shell for the login / register pages. */
export function AuthShell({ children }: { children: ReactNode }) {
  useAreaTheme("light");
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

  return (
    <div className="grid min-h-dvh min-w-0 lg:grid-cols-2">
      {/* Brand panel */}
      <div className="bg-gradient-navy relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-bronze/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-brand-bronze/10 blur-3xl" />

        <div className="relative flex items-center justify-between">
          <Link href="/">
            <Logo tone="white" className="scale-90" />
          </Link>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-bronze">
            Broker Code · CCL
          </span>
        </div>

        <div className="relative">
          <h2 className="font-display text-3xl font-extrabold leading-snug text-white">
            Ghana&apos;s Premier{" "}
            <span className="text-gradient-brand">Equities &amp; Fixed Income</span>{" "}
            Brokerage Desk
          </h2>
          <ul className="mt-7 space-y-4">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title} className="flex items-start gap-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-bronze/20">
                  <h.icon className="h-4 w-4 text-brand-bronze" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{h.title}</p>
                  <p className="mt-0.5 text-xs text-white/65 leading-relaxed">{h.body}</p>
                </div>
              </li>
            ))}
          </ul>

          {summary && (
            <div className="mt-8 grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                  GSE-CI
                </p>
                <p className="mt-0.5 font-mono text-sm font-bold text-white">
                  {summary.gseComposite != null ? summary.gseComposite.toFixed(2) : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                  91D T-Bill
                </p>
                <p className="mt-0.5 font-mono text-sm font-bold text-brand-bronze">
                  {summary.tbill91 != null ? `${summary.tbill91.toFixed(2)}%` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                  364D T-Bill
                </p>
                <p className="mt-0.5 font-mono text-sm font-bold text-emerald-400">
                  {summary.tbill364 != null ? `${summary.tbill364.toFixed(2)}%` : "—"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="relative flex items-center gap-2 text-xs text-white/55">
          <BadgeCheck className="h-3.5 w-3.5 text-brand-bronze" />
          constantcap.com.gh · SEC Ghana Licensed · GSE · GFIM · CSD Participant
        </div>
      </div>

      {/* Form panel */}
      <div className="flex min-w-0 items-center justify-center bg-background px-4 py-8 sm:px-8 sm:py-12">
        <div className="min-w-0 w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo tone="navy" className="scale-75" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
