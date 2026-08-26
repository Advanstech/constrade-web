import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaBand() {
  return (
    <section className="px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-brand px-6 py-14 text-center shadow-glow sm:px-12">
          <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative mx-auto max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white">
              <ShieldCheck className="h-3.5 w-3.5" />
              Regulated · Licensed · Secured
            </span>
            <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Start Investing on the Ghana Stock Exchange Today
            </h2>
            <p className="mt-4 text-base text-white/85">
              Open your Constant Capital account in minutes. Get your CSD account number and
              start trading equities, treasury bills and bonds.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="xl"
                className="bg-white text-brand-bronze-dark hover:bg-white/90"
              >
                <Link href="/register">
                  Open an Account <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="xl"
                variant="outlineLight"
                className="border-white/40"
              >
                <Link href="/login">Client Login</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
