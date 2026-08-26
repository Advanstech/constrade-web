import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const SERVICES = ["Securities Trading", "FX Trading", "Investment Research", "Financings & Capital Markets", "Investment Advisory", "Strategic Advisory"];

const RESOURCES = [
  { label: "Markets", href: "/#markets" },
  { label: "Research Portal", href: "/#research" },
  { label: "Open an Account", href: "/register" },
  { label: "Client Login", href: "/login" },
];

export function Footer() {
  return (
    <footer className="bg-brand-navy text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo tone="white" />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">
              Ghana&apos;s premier investment &amp; capital markets partner — a full-service
              securities firm regulated by the Securities and Exchange Commission (SEC) Ghana and
              licensed to trade on the Ghana Stock Exchange.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["SEC Regulated", "GSE Licensed", "CSD Registered"].map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium tracking-wide text-white/80"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display text-sm font-bold uppercase tracking-widest text-brand-bronze">
              Services
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-white/75">
              {SERVICES.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-bold uppercase tracking-widest text-brand-bronze">
              Platform
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-white/75">
              {RESOURCES.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="hover:text-white">
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4 text-xs text-white/70">
              <p className="font-semibold text-white/90">Constant Capital Ghana Limited</p>
              <p className="mt-1">Broker Dealer · constantcap.com.gh</p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/55 sm:flex-row">
          <p>© {new Date().getFullYear()} Constant Capital Ghana Limited. All rights reserved.</p>
          <p>Investments carry risk. Past performance is not indicative of future results.</p>
        </div>
      </div>
    </footer>
  );
}
