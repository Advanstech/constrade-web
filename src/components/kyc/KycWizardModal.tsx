/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

import { useAuth } from "@/auth/AuthProvider";
import { onboardingApi } from "@/lib/api";
import type { KycProgress } from "@/lib/api.types";
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

function serializeKycDraft(form: KycFormData): Record<string, unknown> {
  return JSON.parse(JSON.stringify(form, (key, value) => {
    if (typeof File !== "undefined" && value instanceof File) return undefined;
    if (["fileUrl", "passportPhotoUrl", "signatureUrl"].includes(key)) return undefined;
    return value;
  }));
}

function toDateInput(value?: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function hydrateKycForm(progress: KycProgress, profile: any): KycFormData {
  const data = progress.data as any;
  const draft = (data.draft ?? {}) as Partial<KycFormData>;
  const individual = data.individualProfile ?? {};
  const employment = data.employmentDetails ?? {};
  const tax = data.taxDetails ?? {};
  const financial = data.financialInfo ?? {};
  const bank = data.bankDetails ?? {};
  const documents: any[] = Array.isArray(data.documents) ? data.documents : [];
  const profileName = String(profile?.full_name ?? "").trim().split(/\s+/);
  const firstName = profileName[0] ?? "";
  const surname = profileName.slice(1).join(" ");
  const saved1 = { ...EMPTY_FORM["1"]!, ...draft["1"] };
  const saved2 = { ...EMPTY_FORM["2"]!, ...draft["2"] };
  const saved3 = { ...EMPTY_FORM["3"]!, ...draft["3"] };
  const saved4 = draft["4"] ?? EMPTY_FORM["4"]!;
  const saved5 = { ...EMPTY_FORM["5"]!, ...draft["5"] };
  const saved6 = { ...EMPTY_FORM["6"]!, ...draft["6"] };
  const identityType = individual.idDocumentType === "PASSPORT" ? "Passport" : "Ghana Card";
  const persistedIds = documents
    .filter((doc) => doc.type === "GHANA_CARD" || doc.type === "PASSPORT")
    .slice(-2);
  const selfie = [...documents].reverse().find((doc) => doc.type === "SELFIE");
  const signature = [...documents].reverse().find((doc) => doc.type === "SIGNATURE");
  const identityDocs = EMPTY_FORM["4"]!.identityDocs.map((emptyDoc, index) => {
    const savedDoc = (saved4.identityDocs?.[index] ?? {}) as any;
    const persisted = persistedIds[index];
    return {
      ...emptyDoc,
      ...savedDoc,
      type: savedDoc.type || (persisted?.type === "PASSPORT" ? "Passport" : identityType),
      number: savedDoc.number || (identityType === "Passport" ? individual.passportNumber : individual.ghanaCardNumber) || "",
      fileName: savedDoc.fileName || persisted?.fileName || "",
      file: null,
      fileUrl: persisted?.fileUrl,
    };
  });

  return {
    "1": {
      ...saved1,
      firstName: saved1.firstName || firstName,
      surname: saved1.surname || surname,
      dateOfBirth: saved1.dateOfBirth || toDateInput(individual.dateOfBirth),
      countryOfOrigin: saved1.countryOfOrigin || individual.nationality || "",
      countryOfResidence: saved1.countryOfResidence || individual.nationality || "",
      tin: saved1.tin || tax.tinNumber || "",
      hasExistingCsd: saved1.hasExistingCsd || Boolean(data.csdAccount?.csdNumber),
      csdNumber: saved1.csdNumber || data.csdAccount?.csdNumber || "",
    },
    "2": {
      ...saved2,
      email: saved2.email || profile?.email || "",
      mobile1: saved2.mobile1 || profile?.phone || "",
      residentialAddress: saved2.residentialAddress || individual.residentialAddress || individual.address || "",
      occupation: saved2.occupation || individual.occupation || "",
      profession: saved2.profession || employment.jobTitle || "",
      employmentStatus: saved2.employmentStatus || "",
      employer: {
        ...EMPTY_FORM["2"]!.employer,
        ...saved2.employer,
        name: saved2.employer?.name || employment.employerName || "",
        natureOfBusiness: saved2.employer?.natureOfBusiness || employment.industry || "",
      },
      bankName: saved2.bankName || bank.bankName || "",
      branch: saved2.branch || bank.branch || "",
      accountName: saved2.accountName || bank.accountName || "",
      accountNumber: saved2.accountNumber || bank.accountNumber || "",
    },
    "3": {
      ...saved3,
      category: saved3.category || (data.corporateProfile || progress.data.corporateProfile ? "Corporate Client" : "Individual Client"),
      investmentObjectives: saved3.investmentObjectives || financial.investmentObjectives || "",
      sourceOfFunds: saved3.sourceOfFunds || individual.sourceOfFunds || "",
      initialInvestment: saved3.initialInvestment || financial.netWorth || "",
    },
    "4": {
      ...EMPTY_FORM["4"]!,
      ...saved4,
      passportPhoto: saved4.passportPhoto || selfie?.fileName || "",
      passportFile: null,
      passportPhotoUrl: selfie?.fileUrl,
      identityDocs,
    },
    "5": {
      ...saved5,
      signatureFile: null,
      signatureFileName: saved5.signatureFileName || signature?.fileName || "",
      signatureUrl: signature?.fileUrl,
    },
    "6": saved6,
  };
}

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

  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftQueue = useRef<Promise<void>>(Promise.resolve());
  const lastSavedDraft = useRef("");
  const draftErrorShown = useRef(false);
  const pct = Math.round((completedSteps / STEP_LABELS.length) * 100);

  const fetchStatus = useCallback(async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const res = await onboardingApi.progress();
      const hydrated = hydrateKycForm(res, profile);
      setForm(hydrated);
      lastSavedDraft.current = JSON.stringify(serializeKycDraft(hydrated));
      snapshots.current = Object.fromEntries(
        STEP_LABELS.map((_, index) => [index + 1, JSON.parse(JSON.stringify(hydrated[String(index + 1) as keyof KycFormData]))]),
      );
      setCompletedSteps(Math.min(res.completedSteps, STEP_LABELS.length));
      setStep(Math.min(Math.max(1, res.currentStep), STEP_LABELS.length));
    } catch (err) {
      console.error("Failed to load saved KYC application", err);
      toast.error("Could not load your saved KYC application", { description: "Please try again or contact support." });
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (open) void fetchStatus();
  }, [open, fetchStatus]);

  const queueDraftSave = useCallback((draftForm: KycFormData) => {
    const serialized = JSON.stringify(serializeKycDraft(draftForm));
    if (serialized === lastSavedDraft.current) return draftQueue.current;
    draftQueue.current = draftQueue.current
      .catch(() => undefined)
      .then(async () => {
        if (serialized === lastSavedDraft.current) return;
        await onboardingApi.saveDraft(JSON.parse(serialized));
        lastSavedDraft.current = serialized;
        draftErrorShown.current = false;
      });
    return draftQueue.current;
  }, []);

  useEffect(() => {
    if (!open || loading) return;
    const serialized = JSON.stringify(serializeKycDraft(form));
    if (serialized === lastSavedDraft.current) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      void queueDraftSave(form).catch((err) => {
        console.error("Failed to sync KYC draft", err);
        if (!draftErrorShown.current) {
          toast.error("KYC changes could not sync", { description: "We’ll retry when you continue. Check your connection if this persists." });
          draftErrorShown.current = true;
        }
      });
    }, 600);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [form, open, loading, queueDraftSave]);

  const flushDraft = async () => {
    if (draftTimer.current) clearTimeout(draftTimer.current);
    await queueDraftSave(form);
    await draftQueue.current;
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (open && !nextOpen) {
      void flushDraft()
        .then(() => onOpenChange(false))
        .catch((err) => {
          console.error("Failed to save KYC draft before closing", err);
          toast.error("Your latest KYC changes could not be saved", { description: "Please retry before closing." });
        });
      return;
    }
    onOpenChange(nextOpen);
  };

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
      setStep((current) => current + 1);
      return;
    }

    try {
      setSaving(true);
      await flushDraft();
      if (!isStepDirty(step)) {
        setStep((current) => current + 1);
        return;
      }

      switch (step) {
        case 1: {
          const d = data as NonNullable<KycFormData["1"]>;
          await onboardingApi.saveStep(1, { type: "INDIVIDUAL" });
          await onboardingApi.saveStep(2, {
            dateOfBirth: d.dateOfBirth,
            nationality: d.countryOfOrigin || "Ghana",
            occupation: form["2"]?.occupation || "N/A",
            sourceOfFunds: form["3"]?.sourceOfFunds || "N/A",
            address: d.countryOfResidence || "Ghana",
          });
          await onboardingApi.saveStep(4, {
            tinNumber: d.tin || "N/A",
            taxResidency: d.countryOfResidence || "Ghana",
          });
          if (d.hasExistingCsd && d.csdNumber) {
            await onboardingApi.setCsdAccount(d.csdNumber);
          }
          break;
        }
        case 2: {
          const d = data as NonNullable<KycFormData["2"]>;
          await onboardingApi.saveStep(3, {
            employmentStatus: d.employmentStatus || "N/A",
            jobTitle: d.profession || d.occupation || "N/A",
            employerName: d.employer?.name || "N/A",
            industry: d.employer?.natureOfBusiness || "N/A",
            duration: d.yearsEmployed || "N/A",
          });
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
          const s1 = form["1"];
          const isCorporate = d.category === "Corporate Client" || d.category === "Institutional Customer";
          await onboardingApi.saveStep(1, { type: isCorporate ? "CORPORATE" : "INDIVIDUAL" });
          if (!isCorporate && s1) {
            await onboardingApi.saveStep(2, {
              dateOfBirth: s1.dateOfBirth,
              nationality: s1.countryOfOrigin || "Ghana",
              occupation: form["2"]?.occupation || "N/A",
              sourceOfFunds: d.sourceOfFunds || "N/A",
              address: s1.countryOfResidence || "Ghana",
            });
          }
          await onboardingApi.saveStep(5, {
            annualIncome: form["2"]?.monthlyIncomeRange || "N/A",
            netWorth: d.initialInvestment || "N/A",
            investmentObjectives: d.investmentObjectives || "N/A",
          });
          break;
        }
        case 4: {
          const d = data as NonNullable<KycFormData["4"]>;
          const firstDoc = d.identityDocs[0];
          if (firstDoc?.number && form["1"]?.dateOfBirth) {
            await onboardingApi.saveStep(2, {
              dateOfBirth: form["1"].dateOfBirth,
              nationality: form["1"].countryOfOrigin || "Ghana",
              occupation: form["2"]?.occupation || "N/A",
              sourceOfFunds: form["3"]?.sourceOfFunds || "N/A",
              address: form["1"].countryOfResidence || "Ghana",
              idDocumentType: firstDoc.type === "Passport" ? "PASSPORT" : "GHANA_CARD",
              ghanaCardNumber: firstDoc.type === "Ghana Card" ? firstDoc.number : undefined,
              passportNumber: firstDoc.type === "Passport" ? firstDoc.number : undefined,
            });
          }

          const updatedStep = {
            ...d,
            passportFile: null as File | null,
            identityDocs: d.identityDocs.map((doc) => ({ ...doc })),
          };
          const persistUploadedDocuments = async () => {
            const nextForm = { ...form, "4": { ...updatedStep } };
            setForm(nextForm);
            const serialized = JSON.stringify(serializeKycDraft(nextForm));
            await onboardingApi.saveDraft(JSON.parse(serialized));
            lastSavedDraft.current = serialized;
            snapshots.current[4] = JSON.parse(JSON.stringify(serializeKycDraft(nextForm)["4"]));
          };
          if (d.passportFile && !d.passportPhotoUrl) {
            const uploaded = await onboardingApi.uploadDocument(d.passportFile, "SELFIE");
            updatedStep.passportPhotoUrl = uploaded.fileUrl;
            updatedStep.passportPhoto = d.passportFile.name;
            await persistUploadedDocuments();
          }
          for (let i = 0; i < updatedStep.identityDocs.length; i += 1) {
            const doc = updatedStep.identityDocs[i];
            if (doc.file && !doc.fileUrl) {
              const uploaded = await onboardingApi.uploadDocument(doc.file, doc.type === "Passport" ? "PASSPORT" : "GHANA_CARD");
              updatedStep.identityDocs[i] = { ...doc, fileName: doc.file.name, file: undefined, fileUrl: uploaded.fileUrl };
              await persistUploadedDocuments();
            }
          }
          if (!updatedStep.identityDocs.some((doc) => doc.fileUrl) || !updatedStep.passportPhotoUrl) {
            throw new Error("Upload the identity document and passport photo before continuing.");
          }
          await persistUploadedDocuments();
          break;
        }
        case 5: {
          const d = data as NonNullable<KycFormData["5"]>;
          let uploadedUrl = d.signatureUrl;
          let fileName = d.signatureFileName;
          if (d.signatureFile) {
            const uploaded = await onboardingApi.uploadDocument(d.signatureFile, "SIGNATURE");
            uploadedUrl = uploaded.fileUrl;
            fileName = d.signatureFile.name;
          } else if (d.signature && !d.signatureUrl) {
            const response = await fetch(d.signature);
            if (!response.ok) throw new Error("Could not prepare the signature upload");
            const blob = await response.blob();
            const file = new File([blob], "signature.png", { type: "image/png" });
            const uploaded = await onboardingApi.uploadDocument(file, "SIGNATURE");
            uploadedUrl = uploaded.fileUrl;
            fileName = file.name;
          }
          if (!uploadedUrl) throw new Error("Provide and save your digital signature before continuing.");
          const nextForm = { ...form, "5": { ...d, signatureFile: null, signatureFileName: fileName, signatureUrl: uploadedUrl } };
          setForm(nextForm);
          const serialized = JSON.stringify(serializeKycDraft(nextForm));
          await onboardingApi.saveDraft(JSON.parse(serialized));
          lastSavedDraft.current = serialized;
          snapshots.current[5] = JSON.parse(JSON.stringify(serializeKycDraft(nextForm)["5"]));
          break;
        }
        case 6:
          break;
      }

      if (step !== 4 && step !== 5) updateSnapshot(step);
      const progress = await onboardingApi.progress();
      setCompletedSteps(progress.completedSteps);
      setStep((current) => Math.min(current + 1, STEP_LABELS.length));
    } catch (err) {
      toast.error("KYC step could not be saved", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    try {
      setSubmitting(true);
      await flushDraft();

      // Persist every structured section before finalising — the wizard can
      // be resumed past earlier steps, so the submit path must not rely on
      // Continue having been pressed on each step. All endpoints upsert.
      const d1 = form["1"];
      const d2 = form["2"];
      const d3 = form["3"];
      const isCorporate =
        d3?.category === "Corporate Client" || d3?.category === "Institutional Customer";
      await onboardingApi.saveStep(1, { type: isCorporate ? "CORPORATE" : "INDIVIDUAL" });
      if (!isCorporate && d1?.dateOfBirth) {
        await onboardingApi.saveStep(2, {
          dateOfBirth: d1.dateOfBirth,
          nationality: d1.countryOfOrigin || "Ghana",
          occupation: d2?.occupation || "N/A",
          sourceOfFunds: d3?.sourceOfFunds || "N/A",
          address: d1.countryOfResidence || "Ghana",
        });
        await onboardingApi.saveStep(4, {
          tinNumber: d1.tin || "N/A",
          taxResidency: d1.countryOfResidence || "Ghana",
        });
      }
      if (d2?.employer || d2?.bankName || d2?.accountNumber) {
        await onboardingApi.saveStep(3, {
          employmentStatus: d2.employmentStatus || "N/A",
          jobTitle: d2.profession || d2.occupation || "N/A",
          employerName: d2.employer?.name || "N/A",
          industry: d2.employer?.natureOfBusiness || "N/A",
          duration: d2.yearsEmployed || "N/A",
        });
        if (d2.bankName || d2.accountNumber) {
          await onboardingApi.saveStep(6, {
            bankName: d2.bankName || "N/A",
            branch: d2.branch || "",
            accountName: d2.accountName || `${d1?.firstName || ""} ${d1?.surname || ""}`.trim() || "N/A",
            accountNumber: d2.accountNumber || "N/A",
          });
        }
      }
      if (d3) {
        await onboardingApi.saveStep(5, {
          annualIncome: d2?.monthlyIncomeRange || "N/A",
          netWorth: d3.initialInvestment || "N/A",
          investmentObjectives: d3.investmentObjectives || "N/A",
        });
      }

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
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

        <div className="flex-none border-t border-border/40 bg-background/80 px-4 py-4 backdrop-blur-md sm:px-12 sm:py-5 lg:px-20">
          <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3">
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
                onClick={() => handleOpenChange(false)}
                className="text-muted-foreground hover:text-foreground font-medium hidden sm:flex"
              >
                Save & Exit
              </Button>
            </div>
            
            {step < STEP_LABELS.length ? (
              <Button size="lg" className="min-w-0 flex-1 shadow-md font-semibold sm:min-w-[140px] sm:flex-none" variant="premium" onClick={() => void next()} disabled={saving || loading}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {saving ? "Saving…" : "Continue"} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button size="lg" className="min-w-0 flex-1 shadow-md font-semibold sm:min-w-[200px] sm:flex-none" variant="premium" onClick={() => void submit()} disabled={submitting || loading}>
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
