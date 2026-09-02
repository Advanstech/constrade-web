"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileSearch, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subscriptionsApi } from "@/lib/api";

export function Research() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await subscriptionsApi.subscribeResearch(email);
      setSubscribed(true);
      toast.success("Successfully subscribed to Constant Capital Research!");
    } catch {
      toast.error("Could not subscribe. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

            {subscribed ? (
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <p className="text-sm font-semibold">You're subscribed! Check your inbox for market updates.</p>
              </div>
            ) : (
              <form className="mt-6 flex flex-col gap-2 sm:flex-row" onSubmit={handleSubmit}>
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="border-white/20 bg-white/10 pl-9 text-white placeholder:text-white/50 focus-visible:ring-brand-bronze"
                  />
                </div>
                <Button type="submit" variant="premium" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe Now"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

