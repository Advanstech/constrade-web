import Link from "next/link";
import { ArrowRight, FileSearch, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Research() {
  return (
    <section id="research" className="bg-gradient-navy py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-bronze">
            Research Portal
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Market Intelligence at Your Fingertips
          </h2>
          <p className="mt-4 text-base text-white/70">
            In-depth analysis and insights on West African markets, equities, fixed income
            securities and macroeconomic trends — from the Constant Capital research team.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-8 backdrop-blur-sm">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-bronze/20">
              <Lock className="h-5 w-5 text-brand-bronze" />
            </span>
            <h3 className="mt-5 font-display text-xl font-bold text-white">Research Team Access</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-white/70">
              Members of our research team can log in to upload and publish reports, market
              updates and investment recommendations.
            </p>
            <Button asChild variant="outlineLight" className="mt-6">
              <Link href="/login">
                Research Team Login <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-8 backdrop-blur-sm">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-bronze/20">
              <FileSearch className="h-5 w-5 text-brand-bronze" />
            </span>
            <h3 className="mt-5 font-display text-xl font-bold text-white">Subscribe to Research</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-white/70">
              Get premium research reports delivered directly to your inbox — market insights,
              company notes and investment recommendations.
            </p>
            <form
              className="mt-6 flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <Input
                  type="email"
                  required
                  placeholder="Enter your email"
                  className="border-white/20 bg-white/10 pl-9 text-white placeholder:text-white/50 focus-visible:ring-brand-bronze"
                />
              </div>
              <Button type="submit" variant="premium">
                Subscribe Now
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
