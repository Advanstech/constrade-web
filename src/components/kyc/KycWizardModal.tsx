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
  const draft = (data.draft ?? {}) as any;
  const app = (data.kycApplication ?? {}) as any;
  const individual = data.individualProfile ?? {};
  const employment = data.employmentDetails ?? {};
  const tax = data.taxDetails ?? {};
  const financial = data.financialInfo ?? {};
  const bank = data.bankDetails ?? {};
  const documents: any[] = Array.isArray(data.documents) ? data.documents : [];
  const profileName = String(profile?.full_name ?? "").trim().split(/\s+/);
  const firstName = profileName[0] ?? "";
  const surname = profileName.slice(1).join(" ");
  const saved1 = { ...EMPTY_FORM["1"]!, ...(draft["1"] ?? {}) };
  const saved2 = { ...EMPTY_FORM["2"]!, ...(draft["2"] ?? {}) };
  const saved3 = { ...EMPTY_FORM["3"]!, ...(draft["3"] ?? {}) };
  const saved4 = { ...EMPTY_FORM["4"]!, ...(draft["4"] ?? {}) };
  const saved5 = { ...EMPTY_FORM["5"]!, ...(draft["5"] ?? {}) };
  const saved6 = { ...EMPTY_FORM["6"]!, ...(draft["6"] ?? {}) };
  const identityType =
    saved4.idDocumentType === "PASSPORT" ||
    individual.idDocumentType === "PASSPORT" ||
    app.idType === "PASSPORT"
      ? "Passport"
      : "Ghana Card";
  const persistedIds = documents
    .filter((doc) => doc.type === "GHANA_CARD" || doc.type === "PASSPORT")
    .slice(-2);
  const selfie = [...documents].reverse().find((doc) => doc.type === "SELFIE");
  const signature = [...documents].reverse().find((doc) => doc.type === "SIGNATURE");
  const baseIdentityDocs = Array.isArray(saved4.identityDocs) && saved4.identityDocs.length > 0
    ? saved4.identityDocs
    : EMPTY_FORM["4"]!.identityDocs;
  const identityDocs = EMPTY_FORM["4"]!.identityDocs.map((emptyDoc, index) => {
    const savedDoc = (baseIdentityDocs[index] ?? {}) as any;
    const persisted = persistedIds[index];
    return {
      ...emptyDoc,
      ...savedDoc,
      type: savedDoc.type || (persisted?.type === "PASSPORT" ? "Passport" : identityType),
      number:
        savedDoc.number ||
        (saved4 as any).idNumber ||
        app.idNumber ||
        (identityType === "Passport" ? individual.passportNumber : individual.ghanaCardNumber) ||
        "",
      placeOfIssue: savedDoc.placeOfIssue || app.idPlaceOfIssue || emptyDoc.placeOfIssue || "Accra",
      issueDate: savedDoc.issueDate || toDateInput(app.idIssueDate) || "",
      expiryDate: savedDoc.expiryDate || toDateInput(app.idExpiryDate) || "",
      fileName: savedDoc.fileName || persisted?.fileName || "",
      file: null,
      fileUrl: persisted?.fileUrl,
    };
  });

  const clean = (v: unknown): string => {
    if (typeof v !== "string") return "";
    const t = v.trim();
    return t.toUpperCase() === "N/A" ? "" : t;
  };

  const appCategory =
    app.category === "JOINT"
      ? "Joint"
      : app.category === "ITF"
        ? "ITF"
        : clean(saved1.accountCategory) || "Individual";

  const appNok = app.nextOfKin ?? {};
  const appFatca = app.fatcaDetails ?? {};
  const appPep: any[] = Array.isArray(app.pepEntries) ? app.pepEntries : [];
  const appBanks: any[] = Array.isArray(app.settlementBanks) ? app.settlementBanks : [];
  const primaryAppBank = appBanks[0] ?? {};
  const secondaryAppBank = appBanks[1] ?? {};

  return {
    "1": {
      ...saved1,
      accountCategory: appCategory,
      title: clean(saved1.title) || clean(app.title) || "",
      gender: clean(saved1.gender) || clean(app.gender) || "",
      firstName: clean(saved1.firstName) || clean(app.firstName) || firstName,
      surname: clean(saved1.surname) || clean(app.surname) || clean((draft["1"] as any)?.lastName) || surname,
      otherNames: clean(saved1.otherNames) || clean(app.otherNames) || "",
      maidenName: clean(saved1.maidenName) || clean(app.maidenName) || "",
      previousNames: clean(saved1.previousNames) || clean(app.previousNames) || "",
      maritalStatus: clean(saved1.maritalStatus) || clean(app.maritalStatus) || "",
      dateOfBirth: clean(saved1.dateOfBirth) || toDateInput(app.dateOfBirth) || toDateInput(individual.dateOfBirth),
      placeOfBirth: clean(saved1.placeOfBirth) || clean(app.placeOfBirth) || "",
      mothersMaidenName: clean(saved1.mothersMaidenName) || clean(app.motherMaidenName) || "",
      countryOfOrigin:
        clean(saved1.countryOfOrigin) ||
        clean(app.countryOfOrigin) ||
        clean((draft["1"] as any)?.nationality) ||
        clean(individual.nationality) ||
        "Ghana",
      countryOfResidence:
        clean(saved1.countryOfResidence) ||
        clean(app.countryOfResidence) ||
        clean((draft["1"] as any)?.nationality) ||
        clean(individual.nationality) ||
        "Ghana",
      tin: clean(saved1.tin) || clean(app.tin) || clean(tax.tinNumber) || "",
      hasExistingCsd: saved1.hasExistingCsd || Boolean(data.csdAccount?.csdNumber),
      csdNumber: clean(saved1.csdNumber) || clean(data.csdAccount?.csdNumber) || "",
      jointApplicant: {
        ...EMPTY_FORM["1"]!.jointApplicant,
        ...(saved1.jointApplicant ?? {}),
        ...(app.jointApplicant
          ? {
              ...app.jointApplicant,
              dateOfBirth: toDateInput(app.jointApplicant.dateOfBirth),
              idIssueDate: toDateInput(app.jointApplicant.idIssueDate),
              idExpiryDate: toDateInput(app.jointApplicant.idExpiryDate),
            }
          : {}),
      },
      itfBeneficiary: {
        ...EMPTY_FORM["1"]!.itfBeneficiary,
        ...(saved1.itfBeneficiary ?? {}),
        ...(app.itfBeneficiary
          ? {
              ...app.itfBeneficiary,
              dateOfBirth: toDateInput(app.itfBeneficiary.dateOfBirth),
              idIssueDate: toDateInput(app.itfBeneficiary.idIssueDate),
              idExpiryDate: toDateInput(app.itfBeneficiary.idExpiryDate),
            }
          : {}),
      },
    },
    "2": {
      ...saved2,
      email: clean(saved2.email) || clean(app.emailAddress) || profile?.email || "",
      mobile1:
        clean(saved2.mobile1) ||
        clean(app.mobileNumber1) ||
        clean((draft["1"] as any)?.phone) ||
        profile?.phone ||
        "",
      mobile2: clean(saved2.mobile2) || clean(app.mobileNumber2) || "",
      residentialAddress:
        clean(saved2.residentialAddress) ||
        clean(app.residentialAddress) ||
        clean((draft["1"] as any)?.address) ||
        clean(individual.residentialAddress) ||
        clean(individual.address) ||
        "",
      nearestLandmark: clean(saved2.nearestLandmark) || clean(app.nearestLandmark) || "",
      cityTown: clean(saved2.cityTown) || clean(app.cityTown) || "",
      digitalAddress: clean(saved2.digitalAddress) || clean(app.digitalAddress) || "",
      postalAddress: clean(saved2.postalAddress) || clean(app.postalAddress) || "",
      occupation:
        clean(saved2.occupation) ||
        clean((draft["1"] as any)?.occupation) ||
        clean(individual.occupation) ||
        "",
      profession:
        clean(saved2.profession) ||
        clean(app.profession) ||
        clean((draft["2"] as any)?.jobTitle) ||
        clean(employment.jobTitle) ||
        "",
      employmentStatus:
        clean(saved2.employmentStatus) ||
        clean(app.employmentStatus) ||
        clean((employment as any).employmentStatus) ||
        "",
      yearsEmployed: clean(saved2.yearsEmployed) || (app.yearsOfEmployment != null ? String(app.yearsOfEmployment) : ""),
      yearsCurrent: clean(saved2.yearsCurrent) || (app.yearsOfCurrentEmployment != null ? String(app.yearsOfCurrentEmployment) : ""),
      yearsPrevious: clean(saved2.yearsPrevious) || (app.yearsOfPreviousEmployment != null ? String(app.yearsOfPreviousEmployment) : ""),
      monthlyIncomeRange:
        clean(saved2.monthlyIncomeRange) ||
        clean((draft["2"] as any)?.annualIncome) ||
        clean(financial.annualIncome) ||
        "",
      employer: {
        ...EMPTY_FORM["2"]!.employer,
        ...(saved2.employer ?? {}),
        name:
          clean(saved2.employer?.name) ||
          clean(app.employerName) ||
          clean((draft["2"] as any)?.employerName) ||
          clean(employment.employerName) ||
          "",
        address: clean(saved2.employer?.address) || clean(app.employerAddress) || "",
        landmark: clean(saved2.employer?.landmark) || clean(app.employerLandmark) || "",
        digitalAddress: clean(saved2.employer?.digitalAddress) || clean(app.employerDigitalAddress) || "",
        cityTown: clean(saved2.employer?.cityTown) || clean(app.employerCity) || "",
        natureOfBusiness:
          clean(saved2.employer?.natureOfBusiness) ||
          clean(app.natureOfBusiness) ||
          clean((draft["2"] as any)?.industry) ||
          clean(employment.industry) ||
          "",
        contact1: clean(saved2.employer?.contact1) || clean(app.officePhone1) || "",
        contact2: clean(saved2.employer?.contact2) || clean(app.officePhone2) || "",
        officeEmail: clean(saved2.employer?.officeEmail) || clean(app.officeEmail) || "",
      },
      bankName:
        clean(saved2.bankName) ||
        clean(primaryAppBank.bankName) ||
        clean((draft["3"] as any)?.bankName) ||
        clean(bank.bankName) ||
        "",
      branch:
        clean(saved2.branch) ||
        clean(primaryAppBank.branch) ||
        clean((draft["3"] as any)?.branch) ||
        clean(bank.branch) ||
        "",
      accountName:
        clean(saved2.accountName) ||
        clean(primaryAppBank.accountName) ||
        clean((draft["3"] as any)?.accountName) ||
        clean(bank.accountName) ||
        "",
      accountNumber:
        clean(saved2.accountNumber) ||
        clean(primaryAppBank.accountNumber) ||
        clean((draft["3"] as any)?.accountNumber) ||
        clean(bank.accountNumber) ||
        "",
      hasSecondaryBank: Boolean(saved2.hasSecondaryBank || secondaryAppBank.bankName),
      secondaryBank: {
        ...EMPTY_FORM["2"]!.secondaryBank,
        ...(saved2.secondaryBank ?? {}),
        ...(secondaryAppBank.bankName ? secondaryAppBank : {}),
      },
      nextOfKin: {
        ...EMPTY_FORM["2"]!.nextOfKin,
        ...(saved2.nextOfKin ?? {}),
        ...(appNok.firstName || appNok.surname
          ? {
              ...appNok,
              dateOfBirth: toDateInput(appNok.dateOfBirth),
              idIssueDate: toDateInput(appNok.idIssueDate),
              idExpiryDate: toDateInput(appNok.idExpiryDate),
            }
          : {}),
      },
    },
    "3": {
      ...saved3,
      category:
        clean(saved3.category) ||
        (data.corporateProfile || progress.data.corporateProfile
          ? "Corporate Client"
          : "Individual Investor"),
      investmentObjectives:
        clean(saved3.investmentObjectives) ||
        clean(app.investmentObjectives) ||
        clean((draft["2"] as any)?.investmentObjectives) ||
        clean(financial.investmentObjectives) ||
        "",
      sourceOfFunds:
        clean(saved3.sourceOfFunds) ||
        clean(app.sourceOfFunds) ||
        clean((draft["1"] as any)?.sourceOfFunds) ||
        clean(individual.sourceOfFunds) ||
        "Salary",
      sourceOfFundsOther: clean(saved3.sourceOfFundsOther) || clean(app.sourceOfFundsOther) || "",
      initialInvestment:
        clean(saved3.initialInvestment) ||
        (app.initialInvestmentAmount != null ? String(app.initialInvestmentAmount) : "") ||
        clean((draft["2"] as any)?.netWorth) ||
        clean(financial.netWorth) ||
        "",
      topUpFrequency: clean(saved3.topUpFrequency) || clean(app.topUpFrequency) || "Monthly",
      marketLossReaction: clean(saved3.marketLossReaction) || clean(app.marketLossReaction) || "CONCERNED_HOLD",
      modeOfInstructions: clean(saved3.modeOfInstructions) || "Email",
      statementDelivery: clean(saved3.statementDelivery) || "Email",
      statementFrequency: clean(saved3.statementFrequency) || "Monthly",
      signingMandate: clean(saved3.signingMandate) || "One to Sign",
    },
    "4": {
      ...EMPTY_FORM["4"]!,
      ...saved4,
      passportPhoto: saved4.passportPhoto || selfie?.fileName || "",
      passportFile: null,
      passportPhotoUrl: selfie?.fileUrl,
      identityDocs,
      fatcaDetails: {
        ...EMPTY_FORM["4"]!.fatcaDetails,
        ...(saved4.fatcaDetails ?? {}),
        ...(appFatca.id ? appFatca : {}),
      },
      isPep: Boolean(saved4.isPep || appPep.length > 0 || tax.politicallyExposedPerson),
      pepEntries:
        Array.isArray(saved4.pepEntries) && saved4.pepEntries.length > 0
          ? saved4.pepEntries
          : appPep.map((p: any) => ({
              officialName: p.officialName || "",
              relationship: p.relationship || "",
              positionHeld: p.positionHeld || "",
            })),
    },
    "5": {
      ...saved5,
      signature:
        saved5.signature ||
        ((draft["5"] as any)?.signatureBase64
          ? `data:image/png;base64,${(draft["5"] as any).signatureBase64}`
          : ""),
      signatureFile: null,
      signatureFileName: saved5.signatureFileName || signature?.fileName || "",
      signatureUrl: signature?.fileUrl,
    },
    "6": {
      ...saved6,
      accuracy: Boolean(saved6.accuracy ?? (draft["6"] as any)?.accuracyDeclaration ?? app.declarationAccepted),
      terms: Boolean(saved6.terms ?? (draft["6"] as any)?.termsAccepted ?? app.declarationAccepted),
      sourceOfFundsDeclaration: Boolean(
        saved6.sourceOfFundsDeclaration ?? (draft["6"] as any)?.sofDeclaration ?? app.declarationAccepted,
      ),
    },
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
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(0);

  // Snapshot of each UI step at its last-saved state. Used to skip API calls
  // when the user presses Next without making any changes.
  const snapshots = useRef<Record<number, KycFormData[keyof KycFormData]>>({});
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const hydratedOpenSessionRef = useRef(false);
  const hasLoadedInitialStepRef = useRef(false);
  const userNavigatedRef = useRef(false);

  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftQueue = useRef<Promise<void>>(Promise.resolve());
  const lastSavedDraft = useRef("");
  const draftErrorShown = useRef(false);
  const pct = Math.round((completedSteps / STEP_LABELS.length) * 100);

  const fetchStatus = useCallback(async () => {
    const currentProfile = profileRef.current;
    if (!currentProfile) return;
    try {
      setLoading(true);
      const res = await onboardingApi.progress();
      const hydrated = hydrateKycForm(res, currentProfile);
      setForm(hydrated);
      lastSavedDraft.current = JSON.stringify(serializeKycDraft(hydrated));
      snapshots.current = Object.fromEntries(
        STEP_LABELS.map((_, index) => [index + 1, JSON.parse(JSON.stringify(hydrated[String(index + 1) as keyof KycFormData]))]),
      );
      const completed = Math.min(res.completedSteps, STEP_LABELS.length);
      const resumeStep = Math.min(Math.max(1, res.currentStep), STEP_LABELS.length);
      setCompletedSteps(completed);
      setMaxStepReached((prev) => Math.max(prev, resumeStep, completed + 1));
      if (!hasLoadedInitialStepRef.current && !userNavigatedRef.current) {
        setStep(resumeStep);
      }
      hasLoadedInitialStepRef.current = true;
    } catch (err) {
      console.error("Failed to load saved KYC application", err);
      toast.error("Could not load your saved KYC application", { description: "Please try again or contact support." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      hydratedOpenSessionRef.current = false;
      hasLoadedInitialStepRef.current = false;
      userNavigatedRef.current = false;
      return;
    }
    if (hydratedOpenSessionRef.current || !profileRef.current) return;
    hydratedOpenSessionRef.current = true;
    void fetchStatus();
  }, [open, Boolean(profile), fetchStatus]);

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
      void queueDraftSave(form).catch((err: unknown) => {
        const isAuth = (err as any)?.status === 401 || String((err as any)?.message || "").includes("Unauthorized");
        if (isAuth) {
          if (!draftErrorShown.current) {
            toast.error("Session expired", { description: "Please sign in again to save your KYC progress." });
            draftErrorShown.current = true;
          }
          return;
        }
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
        .catch((err: unknown) => {
          const isAuth = (err as any)?.status === 401 || String((err as any)?.message || "").includes("Unauthorized");
          if (isAuth) {
            toast.error("Session expired", { description: "Please sign in again to save your KYC progress." });
            return;
          }
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
      const d4 = form["4"];
      const d5 = form["5"];

      // Submit full SEC KYC Application for Individual / Joint / ITF accounts
      if (!isCorporate && d1) {
        const mapResidentialStatus = (val?: string) => {
          const u = (val || "").toUpperCase();
          if (u.includes("NON") && u.includes("GHANA")) return "NON_RESIDENT_GHANAIAN";
          if (u.includes("NON") && u.includes("FOREIGN")) return "NON_RESIDENT_FOREIGNER";
          if (u.includes("FOREIGN")) return "RESIDENT_FOREIGNER";
          return "RESIDENT_GHANAIAN";
        };
        const mapIncomeRange = (val?: string) => {
          const v = val || "";
          if (v.includes("Below")) return "BELOW_1000";
          if (v.includes("5,001")) return "FROM_5001_TO_10000";
          if (v.includes("Above")) return "ABOVE_10000";
          return "FROM_1001_TO_5000";
        };
        const mapStatementDelivery = (val?: string) => {
          const u = (val || "").toUpperCase();
          if (u.includes("SMS")) return "SMS";
          if (u.includes("COLLECTION")) return "COLLECTION";
          return "EMAIL";
        };
        const mapStatementFreq = (val?: string) => {
          const u = (val || "").toUpperCase();
          if (u.includes("QUARTER")) return "QUARTERLY";
          if (u.includes("YEAR")) return "YEARLY";
          return "MONTHLY";
        };
        const mapMandate = (val?: string) => {
          const u = (val || "").toUpperCase();
          if (u.includes("EITHER")) return "EITHER_TO_SIGN";
          if (u.includes("BOTH")) return "BOTH_TO_SIGN";
          return "ONE_TO_SIGN";
        };

        const rawCategory = (d1.accountCategory || "Individual").toUpperCase();
        const category = rawCategory === "JOINT" ? "JOINT" : rawCategory === "ITF" ? "ITF" : "INDIVIDUAL";
        const invTypesRaw = Array.isArray(d3?.investmentTypes) ? d3.investmentTypes : [];
        const investmentTypes = [
          ...(invTypesRaw.some((t) => t.toLowerCase().includes("treasury") || t.toLowerCase().includes("bond"))
            ? ["TREASURY_BILLS_NOTES_BONDS"]
            : []),
          ...(invTypesRaw.some((t) => t.toLowerCase().includes("equit"))
            ? ["EQUITIES"]
            : []),
        ];
        if (investmentTypes.length === 0) {
          investmentTypes.push("TREASURY_BILLS_NOTES_BONDS");
        }

        const primaryIdDoc = d4?.identityDocs?.[0];
        const backIdDoc = d4?.identityDocs?.[1];
        const nok = d2?.nextOfKin;
        const emg1 = d2?.emergencyContacts?.[0];

        const settlementBanks = [
          {
            isPrimary: true,
            bankName: d2?.bankName || "N/A",
            accountName: d2?.accountName || `${d1.firstName || ""} ${d1.surname || ""}`.trim() || "N/A",
            accountNumber: d2?.accountNumber || "N/A",
            branch: d2?.branch || "Head Office",
          },
          ...(d2?.hasSecondaryBank && d2.secondaryBank?.bankName && d2.secondaryBank?.accountNumber
            ? [
                {
                  isPrimary: false,
                  bankName: d2.secondaryBank.bankName,
                  accountName: d2.secondaryBank.accountName || `${d1.firstName || ""} ${d1.surname || ""}`.trim(),
                  accountNumber: d2.secondaryBank.accountNumber,
                  branch: d2.secondaryBank.branch || "Head Office",
                },
              ]
            : []),
        ];

        const secPayload: Record<string, unknown> = {
          category,
          investmentTypes,
          title: d1.title || "Mr.",
          gender: d1.gender || "Male",
          surname: d1.surname || "Investor",
          firstName: d1.firstName || "Investor",
          otherNames: d1.otherNames || undefined,
          maidenName: d1.previousNames || undefined,
          maritalStatus: d1.maritalStatus || "Single",
          previousNames: d1.previousNames || undefined,
          dateOfBirth: d1.dateOfBirth || "1990-01-01",
          placeOfBirth: d1.placeOfBirth || "Accra",
          motherMaidenName: d1.mothersMaidenName || "N/A",
          tin: d1.tin || undefined,
          residentialStatus: mapResidentialStatus(d1.residentialStatus),
          countryOfOrigin: d1.countryOfOrigin || "Ghana",
          countryOfResidence: d1.countryOfResidence || "Ghana",
          residentPermitNumber: d1.permitNumber || undefined,
          permitIssueDate: d1.permitIssueDate || undefined,
          permitExpiryDate: d1.permitExpiryDate || undefined,
          placeOfIssue: d1.permitPlaceOfIssue || undefined,
          profession: d2?.profession || d2?.occupation || undefined,
          professionalLicenseNo: d1.professionalLicenseNo || undefined,
          residentialAddress: d2?.residentialAddress || "Accra, Ghana",
          nearestLandmark: d2?.nearestLandmark || undefined,
          digitalAddress: d2?.digitalAddress || "GA-000-0000",
          cityTown: d2?.cityTown || "Accra",
          postalAddress: d2?.postalAddress || undefined,
          emailAddress: d2?.email || profile?.email || "",
          mobileNumber1: d2?.mobile1 || profile?.phone || "",
          mobileNumber2: d2?.mobile2 || undefined,
          emergencyContactName: emg1?.name || nok?.firstName || undefined,
          emergencyRelationship: emg1?.relationship || nok?.relationship || undefined,
          emergencyContactNumber: emg1?.number || nok?.contactNumber || undefined,
          idType: primaryIdDoc?.type === "Passport" ? "PASSPORT" : "GHANA_CARD",
          idNumber: primaryIdDoc?.number || "GHA-000000000-0",
          idIssueDate: primaryIdDoc?.issueDate || "2020-01-01",
          idExpiryDate: primaryIdDoc?.expiryDate || "2030-01-01",
          idPlaceOfIssue: primaryIdDoc?.placeOfIssue || "Accra",
          idDocumentFrontUrl: primaryIdDoc?.fileUrl || "",
          idDocumentBackUrl: backIdDoc?.fileUrl || undefined,
          selfiePhotoUrl: d4?.passportPhotoUrl || "",
          employmentStatus: d2?.employmentStatus || "Employed",
          yearsOfEmployment: d2?.yearsEmployed ? Number(d2.yearsEmployed) || 0 : undefined,
          yearsOfCurrentEmployment: d2?.yearsCurrent ? Number(d2.yearsCurrent) || 0 : undefined,
          yearsOfPreviousEmployment: d2?.yearsPrevious ? Number(d2.yearsPrevious) || 0 : undefined,
          monthlyIncomeRange: mapIncomeRange(d2?.monthlyIncomeRange),
          employerName: d2?.employer?.name || undefined,
          employerAddress: d2?.employer?.address || undefined,
          employerLandmark: d2?.employer?.landmark || undefined,
          employerDigitalAddress: d2?.employer?.digitalAddress || undefined,
          employerCity: d2?.employer?.cityTown || undefined,
          natureOfBusiness: d2?.employer?.natureOfBusiness || undefined,
          officePhone1: d2?.employer?.contact1 || undefined,
          officePhone2: d2?.employer?.contact2 || undefined,
          officeEmail: d2?.employer?.officeEmail || undefined,
          modeOfInstructions: (d3?.modeOfInstructions || "EMAIL").toUpperCase(),
          modeOfStatementDelivery: mapStatementDelivery(d3?.statementDelivery),
          statementFrequency: mapStatementFreq(d3?.statementFrequency),
          settlementBanks,
          sourceOfFunds: d3?.sourceOfFunds || "Salary",
          sourceOfFundsOther: d3?.sourceOfFundsOther || undefined,
          initialInvestmentAmount: Number(d3?.initialInvestment) || 0,
          topUpFrequency: d3?.topUpFrequency || "Monthly",
          investmentObjectives: d3?.investmentObjectives || "Capital preservation and growth",
          riskTolerance: d3?.riskTolerance || "Medium",
          investmentHorizon: d3?.investmentHorizon || "Medium Term",
          investmentKnowledge: d3?.investmentKnowledge || "Medium",
          marketLossReaction: d3?.marketLossReaction || "CONCERNED_HOLD",
          fatcaDetails: d4?.fatcaDetails,
          pepEntries: d4?.isPep && Array.isArray(d4.pepEntries)
            ? d4.pepEntries.filter((p) => p.officialName.trim().length > 0)
            : [],
          nextOfKin: {
            title: nok?.title || "Mr.",
            gender: nok?.gender || "Male",
            surname: nok?.surname || (emg1?.name ? emg1.name.split(" ").slice(-1)[0] : d1.surname || "NextOfKin"),
            firstName: nok?.firstName || (emg1?.name ? emg1.name.split(" ")[0] : "NextOfKin"),
            otherNames: nok?.otherNames || undefined,
            relationship: nok?.relationship || emg1?.relationship || "Relative",
            dateOfBirth: nok?.dateOfBirth || "1990-01-01",
            placeOfBirth: nok?.placeOfBirth || "Accra",
            residentialStatus: mapResidentialStatus(nok?.residentialStatus),
            countryOfOrigin: nok?.countryOfOrigin || "Ghana",
            countryOfResidence: nok?.countryOfResidence || "Ghana",
            contactNumber: nok?.contactNumber || emg1?.number || d2?.mobile1 || "",
            emailAddress: nok?.emailAddress || undefined,
            idType: nok?.idType === "Passport" ? "PASSPORT" : "GHANA_CARD",
            idNumber: nok?.idNumber || "GHA-000000000-0",
            idIssueDate: nok?.idIssueDate || "2020-01-01",
            idExpiryDate: nok?.idExpiryDate || "2030-01-01",
          },
          ...(category === "ITF" && d1.itfBeneficiary
            ? {
                itfBeneficiary: {
                  title: d1.itfBeneficiary.title || "Master",
                  gender: d1.itfBeneficiary.gender || "Male",
                  surname: d1.itfBeneficiary.surname || d1.surname || "Beneficiary",
                  firstName: d1.itfBeneficiary.firstName || "Beneficiary",
                  otherNames: d1.itfBeneficiary.otherNames || undefined,
                  relationship: d1.itfBeneficiary.relationship || "Child",
                  maritalStatus: d1.itfBeneficiary.maritalStatus || "Single",
                  dateOfBirth: d1.itfBeneficiary.dateOfBirth || "2015-01-01",
                  placeOfBirth: d1.itfBeneficiary.placeOfBirth || "Accra",
                  residentialStatus: mapResidentialStatus(d1.itfBeneficiary.residentialStatus),
                  countryOfOrigin: d1.itfBeneficiary.countryOfOrigin || "Ghana",
                  countryOfResidence: d1.itfBeneficiary.countryOfResidence || "Ghana",
                  tin: d1.itfBeneficiary.tin || undefined,
                  idType: d1.itfBeneficiary.idType || undefined,
                  idNumber: d1.itfBeneficiary.idNumber || undefined,
                  idIssueDate: d1.itfBeneficiary.idIssueDate || undefined,
                  idExpiryDate: d1.itfBeneficiary.idExpiryDate || undefined,
                },
              }
            : {}),
          ...(category === "JOINT" && d1.jointApplicant
            ? {
                jointApplicant: {
                  title: d1.jointApplicant.title || "Mrs.",
                  gender: d1.jointApplicant.gender || "Female",
                  surname: d1.jointApplicant.surname || d1.surname || "Joint",
                  firstName: d1.jointApplicant.firstName || "Joint",
                  otherNames: d1.jointApplicant.otherNames || undefined,
                  maidenName: d1.jointApplicant.maidenName || undefined,
                  maritalStatus: d1.jointApplicant.maritalStatus || "Married",
                  dateOfBirth: d1.jointApplicant.dateOfBirth || "1990-01-01",
                  placeOfBirth: d1.jointApplicant.placeOfBirth || "Accra",
                  motherMaidenName: d1.jointApplicant.motherMaidenName || "N/A",
                  tin: d1.jointApplicant.tin || undefined,
                  residentialStatus: mapResidentialStatus(d1.jointApplicant.residentialStatus),
                  countryOfOrigin: d1.jointApplicant.countryOfOrigin || "Ghana",
                  countryOfResidence: d1.jointApplicant.countryOfResidence || "Ghana",
                  residentialAddress: d1.jointApplicant.residentialAddress || d2?.residentialAddress || "Accra",
                  digitalAddress: d1.jointApplicant.digitalAddress || d2?.digitalAddress || "GA-000-0000",
                  mobileNumber1: d1.jointApplicant.mobileNumber1 || d2?.mobile1 || "",
                  emailAddress: d1.jointApplicant.emailAddress || d2?.email || "",
                  idType: d1.jointApplicant.idType === "Passport" ? "PASSPORT" : "GHANA_CARD",
                  idNumber: d1.jointApplicant.idNumber || "GHA-000000000-0",
                  idIssueDate: d1.jointApplicant.idIssueDate || "2020-01-01",
                  idExpiryDate: d1.jointApplicant.idExpiryDate || "2030-01-01",
                  signatureUrl: d5?.jointSignature || d5?.signatureUrl || "",
                },
              }
            : {}),
          signingMandate: mapMandate(d3?.signingMandate),
          signatureUrl1: d5?.signatureUrl || d5?.signature || "digital-signature",
          signatureUrl2: d5?.jointSignature || undefined,
          declarationAccepted: Boolean(data?.accuracy && data?.terms && data?.sourceOfFundsDeclaration),
        };

        await onboardingApi.submitSecKyc(secPayload).catch((err) => {
          console.warn("SEC KYC structured submission warning:", err);
        });
      }

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
    userNavigatedRef.current = true;
    if (target === step) return;

    // Moving to an already reached, completed, or previous step:
    if (target < step || target <= maxStepReached || target <= completedSteps + 1) {
      void queueDraftSave(form);
      setStep(target);
      return;
    }

    // Forward navigation to the very next step saves and validates the current step first.
    if (target > step + 1) {
      toast.error("Please complete the current step first.");
      return;
    }

    await next();
  };

  const summary = useMemo(() => {
    const nok = form["2"]?.nextOfKin;
    const nokName = `${nok?.firstName || ""} ${nok?.surname || ""}`.trim();
    const idDoc = form["4"]?.identityDocs?.[0];
    return [
      { label: "Full Name", value: `${form["1"]?.title || ""} ${form["1"]?.firstName || ""} ${form["1"]?.surname || ""}`.trim() },
      { label: "Ownership Category", value: `${form["1"]?.accountCategory || "Individual"} (${form["3"]?.category || "Individual Investor"})` },
      { label: "Mobile & Digital GPS", value: [form["2"]?.mobile1, form["2"]?.digitalAddress].filter(Boolean).join(" • ") },
      { label: "Email Address", value: form["2"]?.email },
      { label: "Identity Document", value: idDoc?.number ? `${idDoc.type || "Ghana Card"} • ${idDoc.number}` : undefined },
      { label: "Primary Settlement Bank", value: form["2"]?.bankName ? `${form["2"]?.bankName} (${form["2"]?.accountNumber || "—"})` : undefined },
      { label: "Next of Kin", value: nokName ? `${nokName} (${nok?.relationship || "Relative"})` : undefined },
      { label: "Risk Profile & Mandate", value: `${form["3"]?.riskTolerance || "Medium"} Risk • ${form["3"]?.signingMandate || "One to Sign"}` },
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
                const reachable = num <= step + 1 || num <= completedSteps + 1 || num <= maxStepReached;
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
