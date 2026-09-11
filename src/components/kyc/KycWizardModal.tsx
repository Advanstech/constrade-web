/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
    }
  }, [open, fetchStatus]);

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

    try {
      setSaving(true);
      // The 4 UI steps map to multiple backend endpoints via saveOnboardingStep:
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
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto p-0 sm:rounded-2xl">
        <div className="sticky top-0 z-10 bg-background/80 px-6 py-4 backdrop-blur-md border-b">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-extrabold text-brand-bronze">
              Complete your KYC application
            </DialogTitle>
            <DialogDescription>
              {STEP_LABELS.length} steps to finalize your account setup. Progress is saved automatically.
            </DialogDescription>
          </DialogHeader>

          {/* Stepper Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-foreground">
                Step {step} of {STEP_LABELS.length} — {STEP_LABELS[step - 1]}
              </span>
              <span className="text-muted-foreground">{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-brand transition-all duration-300"
                style={{ width: `${Math.max(pct, step === STEP_LABELS.length ? 100 : 0)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8">
          {step === STEP_LABELS.length ? (
            <div className="space-y-4">
              {summary.map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-4 border-b border-border/60 pb-3 text-sm">
                  <span className="shrink-0 text-muted-foreground">{row.label}</span>
                  <span className="text-right font-medium text-foreground">{row.value || "—"}</span>
                </div>
              ))}
              <StepForm step={step} form={form} patchStep={patchStep} />
            </div>
          ) : (
            <StepForm step={step} form={form} patchStep={patchStep} />
          )}
        </div>

        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t bg-background/80 px-6 py-4 backdrop-blur-md">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || loading}
          >
            <ArrowLeft className="h-4 w-4" /> Previous
          </Button>
          
          {step < STEP_LABELS.length ? (
            <Button variant="premium" onClick={() => void next()} disabled={saving || loading}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Saving…" : "Next"} <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="premium" onClick={() => void submit()} disabled={submitting || loading}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {submitting ? "Submitting…" : "Submit application"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
