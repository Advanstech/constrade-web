/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

import { useAuth } from "@/auth/AuthProvider";
import { onboardingApi } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { type KycFormData, EMPTY_FORM, STEP_LABELS } from "./steps";
import { StepForm } from "./StepForm";

export function KycWizardModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  
  const [form, setForm] = useState<KycFormData>(EMPTY_FORM);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(0);

  // Snapshot of each UI step at its last-saved state. Used to skip API calls
  // when the user presses Next without making any changes.
  const snapshots = useRef<Record<number, KycFormData[keyof KycFormData]>>({});

  // Derive simple percentage
  const pct = Math.round((step / STEP_LABELS.length) * 100);

  const fetchStatus = useCallback(async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const res = await onboardingApi.progress();
      if (res) {
        const clamped = Math.min(res.completedSteps, STEP_LABELS.length);
        setCompletedSteps(clamped);
        setStep(Math.min(Math.max(1, clamped + 1), STEP_LABELS.length));
      }
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        console.error("Failed to fetch onboarding status", err);
      }
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (open) {
      void fetchStatus();
      if (profile) {
        const parts = profile.full_name.split(" ");
        const firstName = parts[0] || "";
        const surname = parts.length > 1 ? parts.slice(1).join(" ") : "";
        
        setForm(prev => {
          const s1 = prev["1"] || EMPTY_FORM["1"]!;
          const s2 = prev["2"] || EMPTY_FORM["2"]!;
          
          return {
            ...prev,
            "1": {
              ...s1,
              firstName: s1.firstName || firstName,
              surname: s1.surname || surname,
            },
            "2": {
              ...s2,
              email: s2.email || profile.email,
            }
          };
        });
      }
    }
  }, [open, fetchStatus, profile]);

  const cloneStep = (stepNum: number): KycFormData[keyof KycFormData] | undefined => {
    const data = form[String(stepNum) as keyof KycFormData];
    if (data === undefined) return undefined;
    // Deep copy, dropping any File objects (we compare fileName strings instead).
    try {
      return JSON.parse(JSON.stringify(data));
    } catch {
      return { ...data };
    }
  };

  const updateSnapshot = (stepNum: number) => {
    snapshots.current[stepNum] = cloneStep(stepNum);
  };

  const isStepDirty = (stepNum: number): boolean => {
    const current = cloneStep(stepNum);
    const snapshot = snapshots.current[stepNum];
    if (snapshot === undefined) return true;
    return JSON.stringify(snapshot) !== JSON.stringify(current);
  };

  // Use this generic patch step function
  const patchStep = <K extends keyof KycFormData>(
    key: K,
    updater: Partial<NonNullable<KycFormData[K]>> | ((cur: NonNullable<KycFormData[K]>) => NonNullable<KycFormData[K]>)
  ) => {
    setForm((prev) => {
      const current = prev[key] || EMPTY_FORM[key];
      const nextVal = typeof updater === "function" ? (updater as any)(current) : { ...current, ...updater };
      return { ...prev, [key]: nextVal };
    });
  };

  const next = async () => {
    if (step === STEP_LABELS.length) return;
    const data = form[String(step) as keyof KycFormData];
    if (!data) {
      setStep((s) => s + 1);
      return;
    }

    // If nothing changed on this step, just move forward without touching the server.
    if (!isStepDirty(step)) {
      setCompletedSteps((c) => Math.max(c, step));
      setStep((s) => s + 1);
      return;
    }

    try {
      setSaving(true);
      // The UI steps map to multiple backend endpoints via saveOnboardingStep:
      //   saveStep(1) = investor type,  saveStep(2) = individual profile,
      //   saveStep(3) = employment,     saveStep(4) = tax,
      //   saveStep(5) = financial,      saveStep(6) = bank,
      //   saveStep(7) = document ref,   uploadDocument() = file upload

      switch (step) {
        case 1: {
          const d = data as NonNullable<KycFormData["1"]>;
          // Set investor type first (backend requires INDIVIDUAL before individual-profile)
          await onboardingApi.saveStep(1, { type: "INDIVIDUAL" });
          // Save individual profile
          await onboardingApi.saveStep(2, {
            dateOfBirth: d.dateOfBirth,
            nationality: d.countryOfOrigin || "Ghana",
            occupation: "N/A",
            sourceOfFunds: "N/A",
            address: d.countryOfResidence || "Ghana",
          });
          // Save tax details (TIN)
          await onboardingApi.saveStep(4, {
            tinNumber: d.tin || "N/A",
            taxResidency: d.countryOfResidence || "Ghana",
          });
          // Save CSD Number if existing
          if (d.hasExistingCsd && d.csdNumber) {
            await onboardingApi.setCsdAccount(d.csdNumber);
          }
          break;
        }
        case 2: {
          const d = data as NonNullable<KycFormData["2"]>;
          // Save employment details
          await onboardingApi.saveStep(3, {
            employmentStatus: d.employmentStatus || "N/A",
            jobTitle: d.profession || "N/A",
            employerName: d.employer?.name || "N/A",
            industry: d.employer?.natureOfBusiness || "N/A",
            duration: d.yearsEmployed || "N/A",
          });
          // Save bank details
          if (d.bankName || d.accountNumber) {
            await onboardingApi.saveStep(6, {
              bankName: d.bankName || "N/A",
              branch: d.branch || "",
              accountName: d.accountName || `${form["1"]?.firstName || ""} ${form["1"]?.surname || ""}`.trim() || "N/A",
              accountNumber: d.accountNumber || "N/A",
            });
          }
          break;
        }
        case 3: {
          const d = data as NonNullable<KycFormData["3"]>;
          // Update individual profile with sourceOfFunds from Step 3 (while type is still INDIVIDUAL)
          const s1 = form["1"];
          if (s1) {
            await onboardingApi.saveStep(2, {
              dateOfBirth: s1.dateOfBirth,
              nationality: s1.countryOfOrigin || "Ghana",
              occupation: "N/A",
              sourceOfFunds: d.sourceOfFunds || "N/A",
              address: s1.countryOfResidence || "Ghana",
            });
          }
          // Update investor type if corporate
          const isCorporate = d.category === "Corporate Client" || d.category === "Institutional Customer";
          await onboardingApi.saveStep(1, { type: isCorporate ? "CORPORATE" : "INDIVIDUAL" });
          // Save financial info
          await onboardingApi.saveStep(5, {
            annualIncome: form["2"]?.monthlyIncomeRange || "N/A",
            netWorth: d.initialInvestment || "N/A",
            investmentObjectives: d.investmentObjectives || "N/A",
          });
          break;
        }
        case 4: {
          const d = data as NonNullable<KycFormData["4"]>;
          // Save the ID details back to individual profile
          const firstDoc = d.identityDocs[0];
          if (firstDoc) {
            await onboardingApi.saveStep(2, {
              dateOfBirth: form["1"]?.dateOfBirth || "1990-01-01",
              nationality: form["1"]?.countryOfOrigin || "Ghana",
              occupation: "N/A",
              sourceOfFunds: form["3"]?.sourceOfFunds || "N/A",
              address: form["1"]?.countryOfResidence || "Ghana",
              idDocumentType: firstDoc.type === "Passport" ? "PASSPORT" : "GHANA_CARD",
              ghanaCardNumber: firstDoc.type === "National ID" || firstDoc.type === "Ghana Card" ? firstDoc.number : undefined,
              passportNumber: firstDoc.type === "Passport" ? firstDoc.number : undefined,
            });
          }
          if (d.passportFile) {
            await onboardingApi.uploadDocument(d.passportFile, "SELFIE").catch(() => {});
          }
          for (const doc of d.identityDocs) {
            if (doc.file) {
              const docType = doc.type === "Passport" ? "PASSPORT" : "GHANA_CARD";
              await onboardingApi.uploadDocument(doc.file, docType).catch(() => {});
            }
          }
          break;
        }
        case 5: {
          const d = data as NonNullable<KycFormData["5"]>;
          if (d.signature) {
            const res = await fetch(d.signature);
            const blob = await res.blob();
            const file = new File([blob], "signature.png", { type: "image/png" });
            await onboardingApi.uploadDocument(file, "SIGNATURE").catch(() => {});
          }
          break;
        }
        case 6: {
          // Just move to submit
          break;
        }
      }

      updateSnapshot(step);
      setCompletedSteps((c) => Math.max(c, step));
      setStep((s) => s + 1);
    } catch (err) {
      toast.error("An error occurred", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    try {
      setSubmitting(true);
      const data = form["6"];
      await onboardingApi.submit({
        accuracyDeclaration: data?.accuracy ?? false,
        termsAccepted: data?.terms ?? false,
        sourceOfFundsDeclaration: data?.sourceOfFundsDeclaration ?? false,
      });
      await refreshProfile();
      onOpenChange(false);
      router.push("/app?onboarding=complete");
    } catch (err) {
      toast.error("An error occurred", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const goToStep = async (target: number) => {
    if (target === step) return;

    // Going back to an already-completed step is always allowed.
    if (target < step) {
      setStep(target);
      return;
    }

    // Forward navigation is limited to the very next step, which will save
    // the current step first if it is dirty.
    if (target > step + 1) {
      toast.error("Please complete the current step first.");
      return;
    }

    await next();
  };

  const summary = useMemo(() => {
    return [
      { label: "Full Name", value: `${form["1"]?.firstName || ""} ${form["1"]?.surname || ""}` },
      { label: "Account Type", value: form["3"]?.category },
      { label: "Mobile", value: form["2"]?.mobile1 },
      { label: "Email", value: form["2"]?.email },
    ];
  }, [form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-[100dvh] max-h-screen !rounded-none m-0 p-0 border-0 flex flex-col bg-background/95 backdrop-blur-xl">
        <div className="flex-none border-b border-border/40 bg-background/80 px-6 py-6 sm:px-12 lg:px-20 backdrop-blur-md">
          <div className="mx-auto max-w-4xl w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <DialogHeader className="text-left">
                <DialogTitle className="text-2xl md:text-3xl font-display font-extrabold text-brand-bronze tracking-tight">
                  Complete your KYC application
                </DialogTitle>
                <DialogDescription className="text-base mt-2">
                  {STEP_LABELS.length} steps to finalize your account setup. Progress is saved automatically.
                </DialogDescription>
              </DialogHeader>
            </div>
            
            <div className="w-full md:w-auto md:min-w-[320px]">
              <div className="flex items-center justify-between text-sm mb-2.5">
                <span className="font-semibold text-foreground">
                  Step {step} of {STEP_LABELS.length} — {STEP_LABELS[step - 1]}
                </span>
                <span className="text-brand-bronze font-bold">{pct}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted/50 border border-border/50">
                <div
                  className="h-full rounded-full bg-gradient-brand transition-all duration-500 ease-out"
                  style={{ width: `${Math.max(pct, step === STEP_LABELS.length ? 100 : 0)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stepper Progress */}
          <div className="mt-8 mx-auto max-w-4xl w-full">
            <div className="flex flex-wrap gap-2.5">
              {STEP_LABELS.map((label, idx) => {
                const num = idx + 1;
                const completed = num <= completedSteps || num < step;
                const active = num === step;
                const reachable = num <= step + 1 || num <= completedSteps + 1;
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={!reachable || active || loading}
                    onClick={() => void goToStep(num)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200",
                      active
                        ? "bg-brand-bronze text-white shadow-md ring-2 ring-brand-bronze/20 ring-offset-1 ring-offset-background"
                        : completed
                        ? "bg-brand-bronze/10 text-brand-bronze hover:bg-brand-bronze/20"
                        : reachable
                        ? "border border-border/60 bg-background text-foreground hover:border-brand-bronze/50 hover:bg-muted/30"
                        : "border border-border/40 bg-muted/20 text-muted-foreground/60 cursor-not-allowed",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-full text-[10px] transition-colors",
                        completed ? "bg-brand-bronze text-white" : active ? "bg-white/20 text-white" : "bg-muted-foreground/20 text-muted-foreground",
                      )}
                    >
                      {completed ? <Check className="h-3 w-3" /> : num}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-10 sm:px-12 lg:px-20 bg-muted/5">
          <div className="mx-auto max-w-4xl w-full">
            <div className="bg-background rounded-2xl sm:rounded-[2rem] border border-border/50 shadow-sm p-6 sm:p-10">
              {step === STEP_LABELS.length ? (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 bg-muted/20 p-6 rounded-xl border border-border/50">
                    {summary.map((row) => (
                      <div key={row.label} className="flex flex-col gap-1 border-b sm:border-b-0 border-border/40 pb-3 sm:pb-0 last:border-0">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{row.label}</span>
                        <span className="font-medium text-foreground text-sm">{row.value || "—"}</span>
                      </div>
                    ))}
                  </div>
                  <StepForm step={step} form={form} patchStep={patchStep} />
                </div>
              ) : (
                <StepForm step={step} form={form} patchStep={patchStep} />
              )}
            </div>
          </div>
        </div>

        <div className="flex-none border-t border-border/40 bg-background/80 px-6 py-5 sm:px-12 lg:px-20 backdrop-blur-md">
          <div className="mx-auto max-w-4xl w-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1 || loading}
                className="font-semibold shadow-sm"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Previous</span>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground hover:text-foreground font-medium hidden sm:flex"
              >
                Save & Exit
              </Button>
            </div>
            
            {step < STEP_LABELS.length ? (
              <Button size="lg" className="min-w-[140px] shadow-md font-semibold" variant="premium" onClick={() => void next()} disabled={saving || loading}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {saving ? "Saving…" : "Continue"} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button size="lg" className="min-w-[200px] shadow-md font-semibold" variant="premium" onClick={() => void submit()} disabled={submitting || loading}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                {submitting ? "Submitting…" : "Submit Application"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
