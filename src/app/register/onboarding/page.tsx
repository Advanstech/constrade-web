"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";;
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CreditCard,
  Loader2,
  LogOut,
  PartyPopper,
} from "lucide-react";
import { useAreaTheme } from "@/hooks/use-area-theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/auth/AuthProvider";
import { onboardingApi } from "@/lib/api";
import type { KycProgress } from "@/lib/api.types";
import { cn } from "@/lib/utils";
import { StepForm } from "./StepForm";
import {
  EMPTY_FORM,
  STEP_LABELS,
  type KycFormData,
  type Step1Data,
  type Step2Data,
  type Step3Data,
  type Step4Data,
  type Step5Data,
  type Step6Data,
  type Step7Data,
} from "./steps";

type StepKey = keyof KycFormData;

function mergeForm(saved: Record<string, unknown>): KycFormData {
  const out: KycFormData = {};
  (Object.keys(EMPTY_FORM) as StepKey[]).forEach((key) => {
    const savedData = saved[key] as any | undefined;
    const base = EMPTY_FORM[key] as any;
    (out as any)[key] = (savedData ? { ...base, ...savedData } : { ...base });
  });
  return out;
}

function validateStep(step: number, form: KycFormData): boolean {
  switch (step) {
    case 1: {
      const d = form["1"] as Step1Data | undefined;
      return !!d && d.investmentTypes.length > 0 && !!d.category;
    }
    case 2: {
      const d = form["2"] as Step2Data | undefined;
      return !!d && !!(d.surname && d.firstName && d.title && d.gender && d.maritalStatus && d.dateOfBirth && d.residentialStatus && d.countryOfOrigin && d.countryOfResidence);
    }
    case 3: {
      const d = form["3"] as Step3Data | undefined;
      return !!d && !!(d.residentialAddress && d.cityTown && d.email && d.mobile1);
    }
    case 4: {
      const d = form["4"] as Step4Data | undefined;
      return !!d && !!d.passportPhoto && !!d.identityDocs[0]?.type && !!d.identityDocs[0]?.number && !!d.identityDocs[0]?.fileName;
    }
    case 5: {
      const d = form["5"] as Step5Data | undefined;
      return !!d && !!(d.employmentStatus && d.monthlyIncomeRange && d.employer.name);
    }
    case 6: {
      const d = form["6"] as Step6Data | undefined;
      return !!d && !!(d.riskTolerance && d.investmentHorizon && d.investmentKnowledge && d.sourceOfFunds && d.initialInvestment);
    }
    case 7: {
      const d = form["7"] as Step7Data | undefined;
      return !!d && !!(d.accuracy && d.sourceOfFundsDeclaration && d.terms);
    }
    default:
      return true;
  }
}

const Onboarding = () => {
  useAreaTheme("light");
  const { profile, signOut, refreshProfile } = useAuth();
  const navigate = useRouter();

  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const [csd, setCsd] = useState<string | null>(null);
  const [form, setForm] = useState<KycFormData>(EMPTY_FORM);
  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    void onboardingApi
      .progress()
      .then((p: KycProgress) => {
        if (!alive) return;
        setForm(mergeForm(p.data));
        setCompletedSteps(p.completedSteps);
        if (p.status === "approved") {
          setApproved(true);
        } else {
          setStep(Math.min(Math.max(p.completedSteps + 1, 1), STEP_LABELS.length));
        }
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const patchStep = <K extends StepKey>(
    key: K,
    updater:
      | Partial<NonNullable<KycFormData[K]>>
      | ((cur: NonNullable<KycFormData[K]>) => NonNullable<KycFormData[K]>),
  ) => {
    setForm((f) => {
      const cur = (f[key] ?? EMPTY_FORM[key]) as NonNullable<KycFormData[K]>;
      const next =
        typeof updater === "function"
          ? updater(cur)
          : ({ ...cur, ...updater } as NonNullable<KycFormData[K]>);
      return { ...f, [key]: next };
    });
  };

  const stepValid = validateStep(step, form);
  // Steps 1..7 are saveable form steps; step 8 is the review/submit screen.
  const pct = Math.round((completedSteps / (STEP_LABELS.length - 1)) * 100);

  const saveCurrentStep = async (): Promise<boolean> => {
    if (!stepValid) {
      toast.error("Please complete the required fields on this step");
      return false;
    }
    setSaving(true);
    try {
      const prog = await onboardingApi.saveStep(step, (form[String(step) as StepKey] ?? {}) as any);
      setCompletedSteps(prog.completedSteps);
      return true;
    } catch (err) {
      toast.error("Could not save progress", {
        description: err instanceof Error ? err.message : undefined,
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    if (step === STEP_LABELS.length) return;
    const ok = await saveCurrentStep();
    if (ok) setStep((s) => s + 1);
  };

  const submit = async () => {
    if (completedSteps < STEP_LABELS.length - 1) {
      toast.error("Complete all steps before submitting");
      return;
    }
    setSubmitting(true);
    try {
      const result = await onboardingApi.submit();
      setCsd(result.application.csdAccount);
      await refreshProfile();
      toast.success("Application approved — welcome to Constant Capital!");
    } catch (err) {
      toast.error("Submission failed", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const summary = useMemo(() => {
    const rows: { label: string; value: string }[] = [];
    const d1 = form["1"] as Step1Data | undefined;
    const d2 = form["2"] as Step2Data | undefined;
    const d3 = form["3"] as Step3Data | undefined;
    const d4 = form["4"] as Step4Data | undefined;
    const d5 = form["5"] as Step5Data | undefined;
    const d6 = form["6"] as Step6Data | undefined;
    if (d1) rows.push({ label: "Investment type", value: [d1.investmentTypes.join(", "), d1.category].filter(Boolean).join(" · ") });
    if (d2) {
      rows.push({ label: "Full name", value: [d2.title, d2.firstName, d2.surname, d2.otherNames].filter(Boolean).join(" ") });
      rows.push({ label: "Date of birth", value: d2.dateOfBirth });
      rows.push({ label: "TIN", value: d2.tin || "—" });
      rows.push({ label: "Residential status", value: d2.residentialStatus });
    }
    if (d3) {
      rows.push({ label: "Address", value: d3.residentialAddress });
      rows.push({ label: "Email / Mobile", value: `${d3.email} · ${d3.mobile1}` });
    }
    if (d4) rows.push({ label: "Identity", value: d4.identityDocs.filter((x) => x.type).map((x) => `${x.type} (${x.number})`).join(", ") || "—" });
    if (d5) {
      rows.push({ label: "Employment", value: d5.employmentStatus });
      rows.push({ label: "Monthly income", value: d5.monthlyIncomeRange });
      rows.push({ label: "Employer", value: d5.employer.name || "—" });
    }
    if (d6) {
      rows.push({ label: "Risk tolerance", value: d6.riskTolerance });
      rows.push({ label: "Source of funds", value: d6.sourceOfFunds });
      rows.push({ label: "Initial investment", value: d6.initialInvestment ? `₵${Number(d6.initialInvestment).toLocaleString("en-GH")}` : "—" });
    }
    return rows;
  }, [form]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand-bronze" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* header */}
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
        <Link href="/" aria-label="Constant Capital">
          <Logo compact tone="navy" className="scale-75" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:block">{profile?.email}</span>
          <Button variant="ghost" size="icon" onClick={() => void signOut()} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-bronze">
            CSD Account Opening &amp; KYC
          </p>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {approved && csd ? "Welcome to Constant Capital" : "Complete your application"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {approved && csd
              ? "Your application is approved. Here is your Central Securities Depository number."
              : "Your progress is saved automatically so you can continue at your convenience."}
          </p>
        </div>

        {approved && csd ? (
          <Card className="mt-10 overflow-hidden shadow-glow">
            <div className="bg-gradient-brand px-6 py-10 text-center text-white">
              <PartyPopper className="mx-auto h-10 w-10" />
              <p className="mt-3 text-sm font-medium uppercase tracking-widest text-white/85">
                CSD Account Number
              </p>
              <p className="mt-2 font-display text-3xl font-extrabold tracking-wider">{csd}</p>
              <p className="mt-2 text-xs text-white/75">
                Registered with the Central Securities Depository (Ghana) Ltd
              </p>
            </div>
            <CardContent className="p-6">
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-brand-bronze" />
                <p>
                  Use your CSD number for share transfers and dividend payments. You can now buy
                  and sell equities, treasury bills and bonds on the Ghana Stock Exchange.
                </p>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Button asChild size="lg" variant="premium">
                  <Link href="/app">
                    Go to my portfolio <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/app/markets">Browse the markets</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : approved && !csd ? (
          <Card className="mt-10 shadow-card">
            <CardContent className="p-8 text-center">
              <BadgeCheck className="mx-auto h-12 w-12 text-success" />
              <h2 className="mt-4 font-display text-xl font-extrabold">You're onboarded</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your CSD account <span className="font-semibold text-foreground">{profile?.csd_account}</span> is active.
              </p>
              <Button asChild className="mt-6 w-full" variant="premium">
                <Link href="/app">Go to my portfolio</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* progress */}
            <div className="mt-8">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-brand-bronze">
                  Step {step} of {STEP_LABELS.length} — {STEP_LABELS[step - 1]}
                </span>
                <span className="text-muted-foreground">
                  {pct}% complete · progress saved
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-brand transition-all duration-300"
                  style={{ width: `${Math.max(pct, step === STEP_LABELS.length ? 100 : 0)}%` }}
                />
              </div>
            </div>

            <Card className="mt-6 shadow-card">
              <CardContent className="p-6 sm:p-8">
                {step === STEP_LABELS.length ? (
                  <div className="space-y-4">
                    {summary.map((row) => (
                      <div key={row.label} className="flex items-start justify-between gap-4 border-b border-border/60 pb-3 text-sm">
                        <span className="shrink-0 text-muted-foreground">{row.label}</span>
                        <span className="text-right font-medium text-foreground">{row.value || "—"}</span>
                      </div>
                    ))}
                    <div className="flex items-start gap-2 rounded-lg border border-brand-bronze/25 bg-brand-bronze-soft p-3 text-xs text-brand-bronze-dark">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
                      By submitting, you authorise Constant Capital to verify your identity and
                      open your CSD account with the Central Securities Depository (Ghana) Ltd.
                    </div>
                  </div>
                ) : (
                  <StepForm step={step} form={form} patchStep={patchStep} />
                )}
              </CardContent>
            </Card>

            <div className="mt-6 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1}
              >
                <ArrowLeft className="h-4 w-4" /> Previous
              </Button>
              {step < STEP_LABELS.length ? (
                <Button variant="premium" onClick={() => void next()} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {saving ? "Saving…" : "Next"} <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="premium" onClick={() => void submit()} disabled={submitting || pct < 100}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {submitting ? "Submitting…" : "Submit application"}
                </Button>
              )}
            </div>

            {/* step quick-nav */}
            <div className="mt-8">
              {loading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {STEP_LABELS.map((label, i) => {
                    const n = i + 1;
                    const done = n <= completedSteps;
                    const active = n === step;
                    return (
                      <button
                        key={label}
                        onClick={() => setStep(n)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                          active
                            ? "border-brand-bronze bg-brand-bronze text-white"
                            : done
                              ? "border-success/30 bg-success/10 text-success"
                              : "border-border text-muted-foreground hover:border-brand-bronze/40",
                        )}
                      >
                        {done && <Check className="h-3 w-3" />}
                        {n}. {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Onboarding;
