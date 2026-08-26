"use client";

import Link from "next/link";
import { BadgeCheck, CandlestickChart, Lock, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useAreaTheme } from "@/hooks/use-area-theme";
import type { ReactNode } from "react";

const HIGHLIGHTS = [
  {
    icon: CandlestickChart,
    title: "Trade GSE securities",
    body: "Equities, treasury bills and government bonds from one secure account.",
  },
  {
    icon: ShieldCheck,
    title: "SEC-Ghana regulated",
    body: "Your assets are held by a licensed broker dealer and CSD-registered.",
  },
  {
    icon: Lock,
    title: "Bank-grade security",
    body: "Encrypted sessions and role-based access across the platform.",
  },
];

/** Split-screen shell for the login / register pages. */
export function AuthShell({ children }: { children: ReactNode }) {
  useAreaTheme("light");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="bg-gradient-navy relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-bronze/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-brand-bronze/10 blur-3xl" />

        <Link href="/">
          <Logo tone="white" className="scale-90" />
        </Link>

        <div className="relative">
          <h2 className="font-display text-3xl font-extrabold leading-snug text-white">
            Ghana&apos;s Premier Investment &amp;{" "}
            <span className="text-gradient-brand">Capital Markets</span> Partner
          </h2>
          <ul className="mt-8 space-y-5">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title} className="flex items-start gap-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-bronze/20">
                  <h.icon className="h-4 w-4 text-brand-bronze" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{h.title}</p>
                  <p className="mt-0.5 text-xs text-white/60">{h.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-white/50">
          <BadgeCheck className="h-3.5 w-3.5 text-brand-bronze" />
          constantcap.com.gh · SEC Regulated · GSE Licensed
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo tone="navy" className="scale-75" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
