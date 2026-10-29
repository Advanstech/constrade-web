/* eslint-disable @typescript-eslint/no-explicit-any */

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRef, useEffect, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { X, Plus, Trash2, Download, ShieldCheck, Copy, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { onboardingApi } from "@/lib/api";
import {
  ChoiceChips,
  DeclarationRow,
  EMPTY_FORM,
  Field,
  FileUpload,
  MultiChips,
  SearchableSelect,
  SuggestionChips,
  DateSelect,
  type KycFormData,
} from "./steps";
import { GHANA_BANKS, GHANA_BANK_NAMES } from "./ghana-banks";
import {
  COUNTRIES,
  GHANA_CITIES,
  OCCUPATIONS,
  PROFESSIONS,
  INDUSTRIES,
  RELATIONSHIPS,
  INVESTMENT_OBJECTIVE_SUGGESTIONS,
} from "./kyc-options";
import {
  normalizeIdDocument,
  normalizePassportPhoto,
  normalizeSignatureImage,
} from "@/lib/kyc-image-processing";

/** Helper to auto-format GhanaPost GPS (e.g. GA-052-7331) */
function formatGhanaPostGps(rawInput: string): string {
  const raw = rawInput.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const letters = raw.slice(0, 2).replace(/[^A-Z]/g, "");
  const rest = raw.slice(letters.length).replace(/[^0-9]/g, "");
  let formatted = letters;
  if (letters.length === 2 && rest.length > 0) {
    formatted += "-" + rest.slice(0, 4);
    if (rest.length > 4) {
      formatted += "-" + rest.slice(4, 8);
    }
  }
  return formatted;
}

/** Helper to auto-format Ghana Card (GHA-XXXXXXXXX-X) */
function formatGhanaCardNumber(rawInput: string): string {
  let raw = rawInput.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!raw.startsWith("GHA") && raw.length <= 3) {
    const prefix = "GHA".slice(0, Math.max(raw.length, 0));
    if (raw !== prefix.slice(0, raw.length)) {
      raw = "GHA" + raw.replace(/[A-Z]/g, "");
    }
  }
  const digits = raw.startsWith("GHA") ? raw.slice(3) : raw.replace(/[A-Z]/g, "");
  let formatted = "GHA-";
  if (digits.length <= 9) {
    formatted += digits;
  } else {
    formatted += digits.slice(0, 9) + "-" + digits.slice(9, 10);
  }
  return formatted;
}

/** Investment objectives textarea that reveals suggestion chips only on focus. */
function InvestmentObjectivesField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setFocused(false);
      }}
    >
      <Textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tell us more about your investment goals, target yields, and liquidity preferences..."
      />
      {focused && (
        <SuggestionChips
          suggestions={INVESTMENT_OBJECTIVE_SUGGESTIONS}
          onPick={(s) => onChange(value ? `${value}. ${s}` : s)}
        />
      )}
    </div>
  );
}

type StepKey = keyof KycFormData;

export function StepForm({
  step,
  form,
  patchStep,
}: {
  step: number;
  form: KycFormData;
  patchStep: <K extends StepKey>(
    key: K,
    updater:
      | Partial<NonNullable<KycFormData[K]>>
      | ((cur: NonNullable<KycFormData[K]>) => NonNullable<KycFormData[K]>),
  ) => void;
}) {
  switch (step) {
    case 1: return <Step1 form={form} patchStep={patchStep} />;
    case 2: return <Step2 form={form} patchStep={patchStep} />;
    case 3: return <Step3 form={form} patchStep={patchStep} />;
    case 4: return <Step4 form={form} patchStep={patchStep} />;
    case 5: return <Step5 form={form} patchStep={patchStep} />;
    case 6: return <Step6 form={form} patchStep={patchStep} />;
    default: return null;
  }
}

function Step1({ form, patchStep }: { form: KycFormData; patchStep: any }) {
  const d = { ...EMPTY_FORM["1"]!, ...(form["1"] ?? {}) };
  const joint = { ...EMPTY_FORM["1"]!.jointApplicant, ...(d.jointApplicant ?? {}) };
  const itf = { ...EMPTY_FORM["1"]!.itfBeneficiary, ...(d.itfBeneficiary ?? {}) };
  const p = (v: any) => patchStep("1", v);
  const pJoint = (v: any) => p({ jointApplicant: { ...joint, ...v } });
  const pItf = (v: any) => p({ itfBeneficiary: { ...itf, ...v } });

  const isForeign =
    (!!d.countryOfOrigin && d.countryOfOrigin !== "Ghana") ||
    d.residentialStatus === "Resident Foreigner" ||
    d.residentialStatus === "Non-Resident Foreigner";

  return (
    <div className="space-y-8">
      {/* Ownership Category Banner */}
      <div className="rounded-2xl border border-brand-bronze/30 bg-brand-bronze/5 p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-bronze">
              SEC Section A — Account Ownership Category
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select whether this account is for yourself, shared with a co-applicant, or held In-Trust-For (ITF) a beneficiary.
            </p>
          </div>
        </div>
        <ChoiceChips
          columns={3}
          options={["Individual", "Joint", "ITF"]}
          value={d.accountCategory || "Individual"}
          onChange={(accountCategory) => p({ accountCategory })}
        />
      </div>

      {/* Primary Applicant */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Title">
          <ChoiceChips columns={3} options={["Dr.", "Prof.", "Mr.", "Mrs.", "Ms.", "Other"]} value={d.title} onChange={(title) => p({ title })} />
        </Field>
        <Field label="Gender">
          <ChoiceChips options={["Male", "Female"]} value={d.gender} onChange={(gender) => p({ gender })} />
        </Field>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Surname">
          <Input value={d.surname} onChange={(e) => p({ surname: e.target.value })} placeholder="Mensah" />
        </Field>
        <Field label="First name">
          <Input value={d.firstName} onChange={(e) => p({ firstName: e.target.value })} placeholder="Kwame" />
        </Field>
        <Field label="Other names">
          <Input value={d.otherNames} onChange={(e) => p({ otherNames: e.target.value })} placeholder="Kofi" />
        </Field>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Previous names / maiden name (if any)">
          <Input value={d.previousNames} onChange={(e) => p({ previousNames: e.target.value })} placeholder="Optional" />
        </Field>
        <Field label="Marital status">
          <ChoiceChips columns={3} options={["Single", "Married", "Divorced", "Widowed", "Separated"]} value={d.maritalStatus} onChange={(maritalStatus) => p({ maritalStatus })} />
        </Field>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Date of birth">
          <DateSelect value={d.dateOfBirth} onChange={(v) => p({ dateOfBirth: v })} yearRange={[1930, new Date().getFullYear() - 16]} />
        </Field>
        <Field label="Place of birth">
          <Input value={d.placeOfBirth} onChange={(e) => p({ placeOfBirth: e.target.value })} placeholder="Enter city or town of birth (e.g. Accra)" />
        </Field>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Mother's maiden name (SEC Mandatory)">
          <Input value={d.mothersMaidenName} onChange={(e) => p({ mothersMaidenName: e.target.value })} placeholder="Required for CSD & SEC verification" />
        </Field>
        <Field label="TIN (Ghana Tax Identification Number)">
          <Input value={d.tin} onChange={(e) => p({ tin: e.target.value })} placeholder="e.g. P0012345678" />
        </Field>
      </div>
      <Field label="Residential status">
        <ChoiceChips columns={2} options={["Resident Ghanaian", "Non-Resident Ghanaian", "Resident Foreigner", "Non-Resident Foreigner"]} value={d.residentialStatus} onChange={(residentialStatus) => p({ residentialStatus })} />
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Country of origin">
          <SearchableSelect options={COUNTRIES} value={d.countryOfOrigin} onChange={(countryOfOrigin) => p({ countryOfOrigin })} placeholder="Select country" />
        </Field>
        <Field label="Country of residence">
          <SearchableSelect options={COUNTRIES} value={d.countryOfResidence} onChange={(countryOfResidence) => p({ countryOfResidence })} placeholder="Select country" />
        </Field>
      </div>
      {isForeign && (
        <div className="space-y-5 rounded-2xl border border-border bg-muted/20 p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-bronze flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-bronze inline-block" />
            Non-Ghanaian Citizens — Resident Permit &amp; Professional Details
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Resident permit number"><Input value={d.permitNumber} onChange={(e) => p({ permitNumber: e.target.value })} /></Field>
            <Field label="Place of issue"><Input value={d.permitPlaceOfIssue} onChange={(e) => p({ permitPlaceOfIssue: e.target.value })} placeholder="e.g. GIS Accra" /></Field>
            <Field label="Permit issue date"><DateSelect value={d.permitIssueDate} onChange={(v) => p({ permitIssueDate: v })} yearRange={[2000, new Date().getFullYear()]} /></Field>
            <Field label="Permit expiry date"><DateSelect value={d.permitExpiryDate} onChange={(v) => p({ permitExpiryDate: v })} yearRange={[new Date().getFullYear(), new Date().getFullYear() + 15]} /></Field>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Professional license number (if applicable)">
              <Input value={d.professionalLicenseNo} onChange={(e) => p({ professionalLicenseNo: e.target.value })} placeholder="Optional" />
            </Field>
          </div>
        </div>
      )}

      {/* Conditional Joint Applicant (Applicant 2) */}
      {d.accountCategory === "Joint" && (
        <div className="space-y-6 rounded-2xl border border-brand-bronze/40 bg-brand-bronze/5 p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-bronze">
              SEC Section B2 — Joint Applicant (Applicant 2) Particulars
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Provide the personal and identity details of the co-applicant for this Joint Account.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Title">
              <ChoiceChips columns={3} options={["Dr.", "Prof.", "Mr.", "Mrs.", "Ms.", "Other"]} value={joint.title} onChange={(title) => pJoint({ title })} />
            </Field>
            <Field label="Gender">
              <ChoiceChips options={["Male", "Female"]} value={joint.gender} onChange={(gender) => pJoint({ gender })} />
            </Field>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <Field label="Surname"><Input value={joint.surname} onChange={(e) => pJoint({ surname: e.target.value })} /></Field>
            <Field label="First name"><Input value={joint.firstName} onChange={(e) => pJoint({ firstName: e.target.value })} /></Field>
            <Field label="Other names"><Input value={joint.otherNames} onChange={(e) => pJoint({ otherNames: e.target.value })} /></Field>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <Field label="Date of birth">
              <DateSelect value={joint.dateOfBirth} onChange={(dateOfBirth) => pJoint({ dateOfBirth })} yearRange={[1930, new Date().getFullYear() - 16]} />
            </Field>
            <Field label="Place of birth">
              <Input value={joint.placeOfBirth} onChange={(e) => pJoint({ placeOfBirth: e.target.value })} placeholder="Enter city or town of birth" />
            </Field>
            <Field label="Mother's maiden name">
              <Input value={joint.motherMaidenName} onChange={(e) => pJoint({ motherMaidenName: e.target.value })} />
            </Field>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <Field label="Mobile number"><Input value={joint.mobileNumber1} onChange={(e) => pJoint({ mobileNumber1: e.target.value })} placeholder="+233 ..." /></Field>
            <Field label="Email address"><Input type="email" value={joint.emailAddress} onChange={(e) => pJoint({ emailAddress: e.target.value })} /></Field>
            <Field label="Ghana TIN"><Input value={joint.tin} onChange={(e) => pJoint({ tin: e.target.value })} /></Field>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Residential address"><Input value={joint.residentialAddress} onChange={(e) => pJoint({ residentialAddress: e.target.value })} /></Field>
            <Field label="Digital address (GhanaPost GPS)">
              <Input value={joint.digitalAddress} placeholder="GA-123-4567" maxLength={12} onChange={(e) => pJoint({ digitalAddress: formatGhanaPostGps(e.target.value) })} />
            </Field>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="ID Type">
              <ChoiceChips options={["Ghana Card", "Passport"]} value={joint.idType || "Ghana Card"} onChange={(idType) => pJoint({ idType })} />
            </Field>
            <Field label="ID Number">
              <Input
                value={joint.idNumber}
                placeholder={joint.idType === "Passport" ? "Passport No." : "GHA-123456789-0"}
                onChange={(e) =>
                  pJoint({
                    idNumber: joint.idType === "Passport" ? e.target.value : formatGhanaCardNumber(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="ID Issue Date">
              <DateSelect value={joint.idIssueDate} onChange={(idIssueDate) => pJoint({ idIssueDate })} yearRange={[2005, new Date().getFullYear()]} />
            </Field>
            <Field label="ID Expiry Date">
              <DateSelect value={joint.idExpiryDate} onChange={(idExpiryDate) => pJoint({ idExpiryDate })} yearRange={[new Date().getFullYear(), new Date().getFullYear() + 15]} />
            </Field>
          </div>
        </div>
      )}

      {/* Conditional In-Trust-For (ITF) Beneficiary */}
      {d.accountCategory === "ITF" && (
        <div className="space-y-6 rounded-2xl border border-brand-bronze/40 bg-brand-bronze/5 p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-bronze">
              SEC Section C — In-Trust-For (ITF) Beneficiary Particulars
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Provide the full details of the minor or beneficiary for whom this trust investment account is held.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Beneficiary Title">
              <ChoiceChips columns={3} options={["Master", "Miss", "Mr.", "Ms.", "Other"]} value={itf.title} onChange={(title) => pItf({ title })} />
            </Field>
            <Field label="Beneficiary Gender">
              <ChoiceChips options={["Male", "Female"]} value={itf.gender} onChange={(gender) => pItf({ gender })} />
            </Field>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <Field label="Surname"><Input value={itf.surname} onChange={(e) => pItf({ surname: e.target.value })} /></Field>
            <Field label="First name"><Input value={itf.firstName} onChange={(e) => pItf({ firstName: e.target.value })} /></Field>
            <Field label="Other names"><Input value={itf.otherNames} onChange={(e) => pItf({ otherNames: e.target.value })} /></Field>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <Field label="Relationship to Account Holder">
              <SearchableSelect options={RELATIONSHIPS} value={itf.relationship} onChange={(relationship) => pItf({ relationship })} placeholder="e.g. Child" />
            </Field>
            <Field label="Date of birth">
              <DateSelect value={itf.dateOfBirth} onChange={(dateOfBirth) => pItf({ dateOfBirth })} yearRange={[1950, new Date().getFullYear()]} />
            </Field>
            <Field label="Place of birth">
              <Input value={itf.placeOfBirth} onChange={(e) => pItf({ placeOfBirth: e.target.value })} placeholder="Enter city or town of birth" />
            </Field>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <Field label="Country of origin">
              <SearchableSelect options={COUNTRIES} value={itf.countryOfOrigin} onChange={(countryOfOrigin) => pItf({ countryOfOrigin })} placeholder="Ghana" />
            </Field>
            <Field label="Country of residence">
              <SearchableSelect options={COUNTRIES} value={itf.countryOfResidence} onChange={(countryOfResidence) => pItf({ countryOfResidence })} placeholder="Ghana" />
            </Field>
            <Field label="Beneficiary ID / Birth Cert No. (optional)">
              <Input value={itf.idNumber} onChange={(e) => pItf({ idNumber: e.target.value })} placeholder="GHA-... or Birth Cert No." />
            </Field>
          </div>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-border bg-muted/20 p-6">
        <div className="flex items-center space-x-3">
          <Checkbox id="csd" checked={d.hasExistingCsd} onCheckedChange={(c) => p({ hasExistingCsd: !!c })} />
          <Label htmlFor="csd" className="font-semibold cursor-pointer">Do you have an existing Central Securities Depository (CSD) Account Number?</Label>
        </div>
        {d.hasExistingCsd && (
          <div className="grid gap-6 sm:grid-cols-2 pt-2 border-t border-border/50">
            <Field label="CSD Account Number">
              <Input value={d.csdNumber} onChange={(e) => p({ csdNumber: e.target.value })} placeholder="e.g. CSD1234567" />
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}

function Step2({ form, patchStep }: { form: KycFormData; patchStep: any }) {
  const d = { ...EMPTY_FORM["2"]!, ...(form["2"] ?? {}) };
  const p = (v: any) => patchStep("2", v);
  const e = { ...EMPTY_FORM["2"]!.employer, ...(d.employer ?? {}) };
  const secBank = { ...EMPTY_FORM["2"]!.secondaryBank, ...(d.secondaryBank ?? {}) };
  const nok = { ...EMPTY_FORM["2"]!.nextOfKin, ...(d.nextOfKin ?? {}) };
  const pNok = (v: any) => p({ nextOfKin: { ...nok, ...v } });

  const defaultAccountName = `${form["1"]?.firstName ?? ""} ${form["1"]?.surname ?? ""}`.trim();
  const accountNameValue = d.accountName || defaultAccountName;

  const branches = GHANA_BANKS[d.bankName] ?? [];
  const hasBranches = branches.length > 0;
  const secBranches = GHANA_BANKS[secBank.bankName] ?? [];

  const copyEmergencyToNok = () => {
    const emg = d.emergencyContacts?.[0];
    if (!emg?.name && !emg?.number) {
      toast.info("Enter Emergency Contact 1 details above first.");
      return;
    }
    const parts = (emg.name || "").trim().split(/\s+/);
    pNok({
      firstName: parts[0] || nok.firstName,
      surname: parts.slice(1).join(" ") || nok.surname,
      relationship: emg.relationship || nok.relationship,
      contactNumber: emg.number || nok.contactNumber,
    });
    toast.success("Copied Emergency Contact 1 into Next of Kin");
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-3">
        <Field label="Mobile number 1 (Primary)">
          <Input value={d.mobile1} onChange={(ev) => p({ mobile1: ev.target.value })} placeholder="+233 ..." />
        </Field>
        <Field label="Mobile number 2 (Alternative)">
          <Input value={d.mobile2} onChange={(ev) => p({ mobile2: ev.target.value })} placeholder="+233 ..." />
        </Field>
        <Field label="Email address">
          <Input type="email" value={d.email} onChange={(ev) => p({ email: ev.target.value })} />
        </Field>
      </div>

      <Field label="Residential address (Physical Location)">
        <Textarea rows={2} value={d.residentialAddress} onChange={(ev) => p({ residentialAddress: ev.target.value })} placeholder="House number, street name, residential area" />
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Nearest landmark"><Input value={d.nearestLandmark} onChange={(ev) => p({ nearestLandmark: ev.target.value })} placeholder="e.g. Near East Legon Police Station" /></Field>
        <Field label="City/Town"><Input value={d.cityTown} onChange={(ev) => p({ cityTown: ev.target.value })} placeholder="Enter your city or town (e.g. Accra)" /></Field>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Digital address (GhanaPost GPS — Mandatory)">
          <Input
            value={d.digitalAddress}
            placeholder="GA-123-4567"
            maxLength={12}
            onChange={(ev) => p({ digitalAddress: formatGhanaPostGps(ev.target.value) })}
          />
        </Field>
        <Field label="Postal address"><Input value={d.postalAddress} onChange={(ev) => p({ postalAddress: ev.target.value })} placeholder="P.O. Box ..." /></Field>
      </div>

      {d.emergencyContacts.map((c: any, i: number) => (
        <div key={i} className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">Emergency contact {i + 1}</p>
          <div className="grid gap-6 sm:grid-cols-3">
            <Field label="Contact name"><Input value={c.name} onChange={(ev) => p({ emergencyContacts: d.emergencyContacts.map((x: any, j: number) => (j === i ? { ...x, name: ev.target.value } : x)) })} /></Field>
            <Field label="Relationship"><SearchableSelect options={RELATIONSHIPS} value={c.relationship} onChange={(relationship) => p({ emergencyContacts: d.emergencyContacts.map((x: any, j: number) => (j === i ? { ...x, relationship } : x)) })} placeholder="Select relationship" /></Field>
            <Field label="Contact number"><Input value={c.number} onChange={(ev) => p({ emergencyContacts: d.emergencyContacts.map((x: any, j: number) => (j === i ? { ...x, number: ev.target.value } : x)) })} placeholder="+233 ..." /></Field>
          </div>
        </div>
      ))}

      {/* SEC Section L: Next of Kin Profile */}
      <div className="space-y-5 rounded-2xl border border-brand-bronze/30 bg-brand-bronze/5 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-bronze">
              SEC Section L — Next of Kin Particulars
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Designated Next of Kin for regulatory and estate succession records.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={copyEmergencyToNok} className="text-xs h-8">
            <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Emergency Contact 1
          </Button>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Title">
            <ChoiceChips columns={3} options={["Dr.", "Prof.", "Mr.", "Mrs.", "Ms.", "Other"]} value={nok.title} onChange={(title) => pNok({ title })} />
          </Field>
          <Field label="Gender">
            <ChoiceChips options={["Male", "Female"]} value={nok.gender} onChange={(gender) => pNok({ gender })} />
          </Field>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          <Field label="Surname"><Input value={nok.surname} onChange={(ev) => pNok({ surname: ev.target.value })} /></Field>
          <Field label="First name"><Input value={nok.firstName} onChange={(ev) => pNok({ firstName: ev.target.value })} /></Field>
          <Field label="Other names"><Input value={nok.otherNames} onChange={(ev) => pNok({ otherNames: ev.target.value })} /></Field>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          <Field label="Relationship">
            <SearchableSelect options={RELATIONSHIPS} value={nok.relationship} onChange={(relationship) => pNok({ relationship })} placeholder="e.g. Spouse" />
          </Field>
          <Field label="Date of birth">
            <DateSelect value={nok.dateOfBirth} onChange={(dateOfBirth) => pNok({ dateOfBirth })} yearRange={[1930, new Date().getFullYear()]} />
          </Field>
          <Field label="Place of birth">
            <Input value={nok.placeOfBirth} onChange={(ev) => pNok({ placeOfBirth: ev.target.value })} placeholder="Enter city or town of birth" />
          </Field>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Contact phone number"><Input value={nok.contactNumber} onChange={(ev) => pNok({ contactNumber: ev.target.value })} placeholder="+233 ..." /></Field>
          <Field label="Email address"><Input type="email" value={nok.emailAddress} onChange={(ev) => pNok({ emailAddress: ev.target.value })} /></Field>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="ID Type">
            <ChoiceChips options={["Ghana Card", "Passport"]} value={nok.idType || "Ghana Card"} onChange={(idType) => pNok({ idType })} />
          </Field>
          <Field label="ID Number">
            <Input
              value={nok.idNumber}
              placeholder={nok.idType === "Passport" ? "Passport No." : "GHA-123456789-0"}
              onChange={(ev) =>
                pNok({
                  idNumber: nok.idType === "Passport" ? ev.target.value : formatGhanaCardNumber(ev.target.value),
                })
              }
            />
          </Field>
          <Field label="ID Issue Date">
            <DateSelect value={nok.idIssueDate} onChange={(idIssueDate) => pNok({ idIssueDate })} yearRange={[2005, new Date().getFullYear()]} />
          </Field>
          <Field label="ID Expiry Date">
            <DateSelect value={nok.idExpiryDate} onChange={(idExpiryDate) => pNok({ idExpiryDate })} yearRange={[new Date().getFullYear(), new Date().getFullYear() + 15]} />
          </Field>
        </div>
      </div>

      {/* SEC Section F: Employment & Business Details */}
      <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-5 mt-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">SEC Section F — Employment &amp; Business Details</p>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Occupation"><SearchableSelect options={OCCUPATIONS} value={d.occupation} onChange={(occupation) => p({ occupation })} placeholder="Select or type occupation" /></Field>
          <Field label="Profession"><SearchableSelect options={PROFESSIONS} value={d.profession} onChange={(profession) => p({ profession })} placeholder="Select or type profession" /></Field>
        </div>
        <Field label="Employment status">
          <ChoiceChips options={["Employed", "Self-employed", "Retired", "Student", "Unemployed"]} value={d.employmentStatus} onChange={(employmentStatus) => p({ employmentStatus })} />
        </Field>
        <div className="grid gap-6 sm:grid-cols-3">
          <Field label="Total years of employment"><Input value={d.yearsEmployed} onChange={(ev) => p({ yearsEmployed: ev.target.value })} placeholder="e.g. 8" /></Field>
          <Field label="Years at current employment"><Input value={d.yearsCurrent} onChange={(ev) => p({ yearsCurrent: ev.target.value })} placeholder="e.g. 4" /></Field>
          <Field label="Years at previous employment"><Input value={d.yearsPrevious} onChange={(ev) => p({ yearsPrevious: ev.target.value })} placeholder="e.g. 4" /></Field>
        </div>
        <Field label="Total monthly income range (GHS)">
          <ChoiceChips options={["Below 1,000", "1,001 – 5,000", "5,001 – 10,000", "Above 10,000"]} value={d.monthlyIncomeRange} onChange={(monthlyIncomeRange) => p({ monthlyIncomeRange })} />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2 mt-4">
          <Field label="Employer / Business Name"><Input value={e.name} onChange={(ev) => p({ employer: { ...e, name: ev.target.value } })} /></Field>
          <Field label="Nature of business (Industry)"><SearchableSelect options={INDUSTRIES} value={e.natureOfBusiness} onChange={(natureOfBusiness) => p({ employer: { ...e, natureOfBusiness } })} placeholder="Select or type industry" /></Field>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Employer / Business Address"><Input value={e.address} onChange={(ev) => p({ employer: { ...e, address: ev.target.value } })} placeholder="Street address, building" /></Field>
          <Field label="Employer City / Town"><Input value={e.cityTown} onChange={(ev) => p({ employer: { ...e, cityTown: ev.target.value } })} placeholder="Enter employer city or town" /></Field>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Employer Nearest Landmark"><Input value={e.landmark} onChange={(ev) => p({ employer: { ...e, landmark: ev.target.value } })} /></Field>
          <Field label="Employer Digital GPS Address">
            <Input
              value={e.digitalAddress}
              placeholder="GA-123-4567"
              maxLength={12}
              onChange={(ev) => p({ employer: { ...e, digitalAddress: formatGhanaPostGps(ev.target.value) } })}
            />
          </Field>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          <Field label="Office Phone 1"><Input value={e.contact1} onChange={(ev) => p({ employer: { ...e, contact1: ev.target.value } })} placeholder="+233 ..." /></Field>
          <Field label="Office Phone 2 (optional)"><Input value={e.contact2} onChange={(ev) => p({ employer: { ...e, contact2: ev.target.value } })} placeholder="+233 ..." /></Field>
          <Field label="Office Email"><Input type="email" value={e.officeEmail} onChange={(ev) => p({ employer: { ...e, officeEmail: ev.target.value } })} placeholder="hr@company.com" /></Field>
        </div>
      </div>

      {/* SEC Section H: Settlement Bank Details */}
      <div className="space-y-5 rounded-xl border border-border bg-muted/30 p-5 mt-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">
              SEC Section H — Settlement Bank Details (Dividend &amp; Disposal Proceeds)
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Interest, dividend, and maturity proceeds will be remitted to your primary bank account.
            </p>
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Primary Bank Name">
            <div className="relative">
              <Input
                value={d.bankName}
                onChange={(ev) => p({ bankName: ev.target.value })}
                placeholder="Select or type your bank"
                list="ghana-banks"
              />
              <datalist id="ghana-banks">
                {GHANA_BANK_NAMES.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              {d.bankName && (
                <button
                  type="button"
                  onClick={() => p({ bankName: "", branch: "" })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear bank"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </Field>
          <Field label="Branch">
            <div className="relative">
              <Input
                value={d.branch}
                onChange={(ev) => p({ branch: ev.target.value })}
                placeholder={hasBranches ? "Select or type branch" : "Type your branch"}
                list={hasBranches ? "ghana-branches" : undefined}
              />
              {hasBranches && (
                <datalist id="ghana-branches">
                  {branches.map((branch) => (
                    <option key={branch} value={branch} />
                  ))}
                </datalist>
              )}
              {d.branch && (
                <button
                  type="button"
                  onClick={() => p({ branch: "" })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear branch"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </Field>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Account Name">
            <div className="relative">
              <Input value={accountNameValue} onChange={(ev) => p({ accountName: ev.target.value })} placeholder="Kwame Mensah" />
              {accountNameValue && (
                <button
                  type="button"
                  onClick={() => p({ accountName: "" })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear account name"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </Field>
          <Field label="Account Number"><Input value={d.accountNumber} onChange={(ev) => p({ accountNumber: ev.target.value })} placeholder="1234567890123" /></Field>
        </div>

        {/* Optional Secondary Bank */}
        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="sec-bank"
              checked={Boolean(d.hasSecondaryBank)}
              onCheckedChange={(c) => p({ hasSecondaryBank: Boolean(c) })}
            />
            <Label htmlFor="sec-bank" className="text-xs font-semibold cursor-pointer">
              Add a Secondary Settlement Bank Account (Optional)
            </Label>
          </div>
          {d.hasSecondaryBank && (
            <div className="grid gap-6 sm:grid-cols-2 mt-4">
              <Field label="Secondary Bank Name">
                <Input
                  value={secBank.bankName}
                  onChange={(ev) => p({ secondaryBank: { ...secBank, bankName: ev.target.value } })}
                  placeholder="Select or type bank"
                  list="ghana-banks"
                />
              </Field>
              <Field label="Secondary Bank Branch">
                <Input
                  value={secBank.branch}
                  onChange={(ev) => p({ secondaryBank: { ...secBank, branch: ev.target.value } })}
                  placeholder="Branch name"
                  list={secBranches.length > 0 ? "sec-ghana-branches" : undefined}
                />
                {secBranches.length > 0 && (
                  <datalist id="sec-ghana-branches">
                    {secBranches.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                )}
              </Field>
              <Field label="Secondary Account Name">
                <Input
                  value={secBank.accountName || defaultAccountName}
                  onChange={(ev) => p({ secondaryBank: { ...secBank, accountName: ev.target.value } })}
                />
              </Field>
              <Field label="Secondary Account Number">
                <Input
                  value={secBank.accountNumber}
                  onChange={(ev) => p({ secondaryBank: { ...secBank, accountNumber: ev.target.value } })}
                />
              </Field>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const MARKET_LOSS_OPTIONS = [
  {
    value: "EXTREMELY_CONCERNED_SELL",
    title: "Extremely concerned; sell my investment immediately",
    desc: "Capital preservation is my top priority; I cannot tolerate short-term portfolio drawdowns.",
  },
  {
    value: "CONCERNED_CONSIDER_SELLING",
    title: "Concerned; consider selling part of my investment",
    desc: "I would reduce my exposure to limit further downside while keeping a portion invested.",
  },
  {
    value: "CONCERNED_HOLD",
    title: "Concerned; but hold and not sell my investment",
    desc: "I understand market fluctuations and would hold my position awaiting recovery.",
  },
  {
    value: "NOT_CONCERNED_LONG_TERM",
    title: "Not overly concerned; I am invested for the long term",
    desc: "I view short-term dips as normal volatility or an opportunity to accumulate more.",
  },
] as const;

function Step3({ form, patchStep }: { form: KycFormData; patchStep: any }) {
  const d = { ...EMPTY_FORM["3"]!, ...(form["3"] ?? {}) };
  const p = (v: any) => patchStep("3", v);
  return (
    <div className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Investor Classification">
          <ChoiceChips
            options={["Individual Investor", "Corporate Client", "Institutional Customer", "Financial Professional"]}
            value={d.category}
            onChange={(category) => p({ category })}
          />
        </Field>
        <Field label="Target Investment Securities">
          <MultiChips
            options={["Treasury Bills/Notes/Bonds", "Equities"]}
            value={d.investmentTypes}
            onChange={(investmentTypes) => p({ investmentTypes })}
          />
        </Field>
      </div>

      {/* SEC Section I: Expected Investment Activity */}
      <div className="space-y-5 rounded-xl border border-border bg-muted/30 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">
          SEC Section I — Expected Investment Activity &amp; Source of Funds
        </p>
        <Field label="Primary Source of Funds">
          <ChoiceChips
            columns={3}
            options={["Salary", "Business Income", "Personal Savings", "Investments", "Inheritance/Gift", "Pension / Retirement", "Others"]}
            value={d.sourceOfFunds}
            onChange={(sourceOfFunds) => p({ sourceOfFunds })}
          />
        </Field>
        {d.sourceOfFunds === "Others" && (
          <Field label="Specify Other Source of Funds">
            <Input
              value={d.sourceOfFundsOther}
              onChange={(e) => p({ sourceOfFundsOther: e.target.value })}
              placeholder="Please specify your source of funds"
            />
          </Field>
        )}
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Initial investment amount (GHS)">
            <Input type="number" min="0" value={d.initialInvestment} onChange={(e) => p({ initialInvestment: e.target.value })} placeholder="e.g. 10000" />
          </Field>
          <Field label="Expected top-up / contribution frequency">
            <ChoiceChips
              columns={3}
              options={["Monthly", "Quarterly", "Bi-Annually", "Annually", "Other"]}
              value={d.topUpFrequency || "Monthly"}
              onChange={(topUpFrequency) => p({ topUpFrequency })}
            />
          </Field>
        </div>
      </div>

      {/* SEC Section J: Suitability Assessment */}
      <div className="space-y-5 rounded-xl border border-border bg-muted/30 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">
          SEC Section J — Client Investment Profile &amp; Suitability Assessment
        </p>
        <Field label="Investment Objectives">
          <InvestmentObjectivesField value={d.investmentObjectives} onChange={(v) => p({ investmentObjectives: v })} />
        </Field>
        <div className="grid gap-6 sm:grid-cols-3">
          <Field label="Risk tolerance">
            <ChoiceChips columns={1} options={["Low", "Medium", "High"]} value={d.riskTolerance} onChange={(riskTolerance) => p({ riskTolerance })} />
          </Field>
          <Field label="Investment horizon">
            <ChoiceChips columns={1} options={["Short Term", "Medium Term", "Long Term"]} value={d.investmentHorizon} onChange={(investmentHorizon) => p({ investmentHorizon })} />
          </Field>
          <Field label="Investment knowledge">
            <ChoiceChips columns={1} options={["Low", "Medium", "High"]} value={d.investmentKnowledge} onChange={(investmentKnowledge) => p({ investmentKnowledge })} />
          </Field>
        </div>

        {/* SEC Mandatory 10% Market Loss Reaction Question */}
        <div className="space-y-3 pt-3 border-t border-border/60">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-brand-bronze shrink-0 mt-0.5" />
            <div>
              <Label className="text-sm font-bold text-foreground">
                SEC Mandatory Suitability Question: What would be your reaction if your investment portfolio lost 10% of its value in Year 1?
              </Label>
              <p className="text-xs text-muted-foreground">
                Required under Securities and Exchange Commission (SEC) Ghana Conduct of Business Guidelines.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {MARKET_LOSS_OPTIONS.map((opt) => {
              const active = (d.marketLossReaction || "CONCERNED_HOLD") === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => p({ marketLossReaction: opt.value })}
                  className={cn(
                    "flex flex-col items-start text-left rounded-xl border p-4 transition-all",
                    active
                      ? "border-brand-bronze bg-brand-bronze-soft text-brand-bronze-dark shadow-sm"
                      : "border-border bg-background hover:border-brand-bronze/40",
                  )}
                >
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="text-xs font-bold">{opt.title}</span>
                    <span
                      className={cn(
                        "h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                        active ? "border-brand-bronze bg-brand-bronze text-white" : "border-muted-foreground/40",
                      )}
                    >
                      {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SEC Section G & N: Instructions, Statement Delivery & Signing Mandate */}
      <div className="space-y-5 rounded-xl border border-border bg-muted/30 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">
          SEC Section G &amp; N — Instructions, Statement Service &amp; Signing Mandate
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Preferred Mode of Instructions">
            <ChoiceChips
              columns={3}
              options={["Email", "Telephone", "Form"]}
              value={d.modeOfInstructions || "Email"}
              onChange={(modeOfInstructions) => p({ modeOfInstructions })}
            />
          </Field>
          <Field label="Account Signing Mandate">
            <ChoiceChips
              columns={3}
              options={["One to Sign", "Either to Sign", "Both to Sign"]}
              value={d.signingMandate || "One to Sign"}
              onChange={(signingMandate) => p({ signingMandate })}
            />
          </Field>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Statement Delivery Mode">
            <ChoiceChips
              columns={3}
              options={["Email", "SMS", "Collection"]}
              value={d.statementDelivery || "Email"}
              onChange={(statementDelivery) => p({ statementDelivery })}
            />
          </Field>
          <Field label="Statement Frequency">
            <ChoiceChips
              columns={3}
              options={["Monthly", "Quarterly", "Yearly"]}
              value={d.statementFrequency || "Monthly"}
              onChange={(statementFrequency) => p({ statementFrequency })}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

const FATCA_QUESTIONS: Array<{ key: keyof NonNullable<KycFormData["4"]>["fatcaDetails"]; label: string }> = [
  { key: "isForeignCitizen", label: "1. Are you a citizen of another country (besides Ghana)?" },
  { key: "holdsForeignPassport", label: "2. Do you hold a passport of any foreign country?" },
  { key: "holdsGreenCard", label: "3. Do you hold a US Green Card or Permanent Residence of any foreign country?" },
  { key: "isForeignTaxResident", label: "4. Are you a resident for tax purposes in any foreign jurisdiction?" },
  { key: "spent183DaysAbroad", label: "5. Have you spent more than 183 days in a foreign country in the past 12 months?" },
];

function Step4({ form, patchStep }: { form: KycFormData; patchStep: any }) {
  const d = { ...EMPTY_FORM["4"]!, ...(form["4"] ?? {}) };
  const fatca = { ...EMPTY_FORM["4"]!.fatcaDetails, ...(d.fatcaDetails ?? {}) };
  const pepEntries = Array.isArray(d.pepEntries) ? d.pepEntries : [];
  const p = (v: any) => patchStep("4", v);
  const pFatca = (v: any) => p({ fatcaDetails: { ...fatca, ...v } });

  const anyFatcaYes =
    fatca.isForeignCitizen ||
    fatca.holdsForeignPassport ||
    fatca.holdsGreenCard ||
    fatca.isForeignTaxResident ||
    fatca.spent183DaysAbroad;

  const addPepEntry = () => {
    if (pepEntries.length >= 3) return;
    p({
      isPep: true,
      pepEntries: [...pepEntries, { officialName: "", relationship: "", positionHeld: "" }],
    });
  };

  const updatePepEntry = (index: number, patch: Record<string, string>) => {
    p({
      pepEntries: pepEntries.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
    });
  };

  const removePepEntry = (index: number) => {
    const next = pepEntries.filter((_, idx) => idx !== index);
    p({ pepEntries: next, isPep: next.length > 0 });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">Standard Passport Picture</p>
        <Field label="Upload a standard passport picture">
          <FileUpload
            label="Upload or take passport photo"
            fileName={d.passportPhoto}
            file={d.passportFile}
            uploadedUrl={d.passportPhotoUrl && !d.passportPhoto.toLowerCase().endsWith(".pdf") ? d.passportPhotoUrl : undefined}
            onChange={(passportPhoto) => p({ passportPhoto })}
            onFile={async (passportFile) => {
              const processed = passportFile ? await normalizePassportPhoto(passportFile) : null;
              p({ passportFile: processed, passportPhotoUrl: undefined });
            }}
          />
        </Field>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">
          SEC Section E — Proof of Identity (Ghana Card or International Passport)
        </p>
        {d.identityDocs.map((doc: any, i: number) => {
          const isBack = i === 1;
          const frontDoc: any = d.identityDocs[0] || {};

          if (isBack && frontDoc.type === "Passport") {
            return null;
          }

          return (
            <div key={i} className="space-y-4">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground mt-4">
                Document {i + 1} ({isBack ? "Back" : "Front"})
              </p>
              {!isBack && (
                <>
                  <Field label="ID type">
                    <ChoiceChips options={["Ghana Card", "Passport"]} value={doc.type} onChange={(type) => p({ identityDocs: d.identityDocs.map((x: any, j: number) => (j === i ? { ...x, type } : x)) })} />
                  </Field>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <Field label="ID number">
                      {doc.type === "Ghana Card" ? (
                        <Input
                          value={doc.number}
                          placeholder="GHA-123456789-0"
                          maxLength={16}
                          onChange={(e) => {
                            const formatted = formatGhanaCardNumber(e.target.value);
                            p({ identityDocs: d.identityDocs.map((x: any, j: number) => (j === i ? { ...x, number: formatted } : x)) });
                          }}
                        />
                      ) : (
                        <Input
                          value={doc.number}
                          placeholder="Passport number"
                          onChange={(e) => p({ identityDocs: d.identityDocs.map((x: any, j: number) => (j === i ? { ...x, number: e.target.value } : x)) })}
                        />
                      )}
                    </Field>
                    <Field label="Place of issue"><Input value={doc.placeOfIssue} onChange={(e) => p({ identityDocs: d.identityDocs.map((x: any, j: number) => (j === i ? { ...x, placeOfIssue: e.target.value } : x)) })} /></Field>
                    <Field label="Issue date"><DateSelect value={doc.issueDate} onChange={(v) => p({ identityDocs: d.identityDocs.map((x: any, j: number) => (j === i ? { ...x, issueDate: v } : x)) })} yearRange={[2005, new Date().getFullYear()]} /></Field>
                    <Field label="Expiring date"><DateSelect value={doc.expiryDate} onChange={(v) => p({ identityDocs: d.identityDocs.map((x: any, j: number) => (j === i ? { ...x, expiryDate: v } : x)) })} yearRange={[new Date().getFullYear(), new Date().getFullYear() + 15]} /></Field>
                  </div>
                </>
              )}
              <FileUpload
                label={`Upload ${isBack ? (frontDoc.type || "ID") : (doc.type || "ID")} ${isBack ? "Back" : "Front"} copy`}
                fileName={doc.fileName}
                file={doc.file}
                uploadedUrl={doc.fileUrl && !doc.fileName.toLowerCase().endsWith(".pdf") ? doc.fileUrl : undefined}
                onChange={(fileName) => {
                  p({
                    identityDocs: d.identityDocs.map((x: any, j: number) => {
                      if (j === i) {
                        return isBack
                          ? { ...x, fileName, type: frontDoc.type, number: frontDoc.number, placeOfIssue: frontDoc.placeOfIssue, issueDate: frontDoc.issueDate, expiryDate: frontDoc.expiryDate }
                          : { ...x, fileName };
                      }
                      return x;
                    }),
                  });
                }}
                onFile={async (file) => {
                  const processed = file ? await normalizeIdDocument(file) : null;
                  p({
                    identityDocs: d.identityDocs.map((x: any, j: number) => {
                      if (j === i) {
                        return isBack
                          ? { ...x, file: processed, fileName: processed?.name ?? "", fileUrl: undefined, type: frontDoc.type, number: frontDoc.number, placeOfIssue: frontDoc.placeOfIssue, issueDate: frontDoc.issueDate, expiryDate: frontDoc.expiryDate }
                          : { ...x, file: processed, fileName: processed?.name ?? "", fileUrl: undefined };
                      }
                      return x;
                    }),
                  });
                }}
              />
            </div>
          );
        })}
      </div>

      {/* SEC Section K: FATCA & CRS Self-Certification */}
      <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">
            SEC Section K — FATCA &amp; CRS Tax Residency Self-Certification
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Foreign Account Tax Compliance Act (FATCA) &amp; Common Reporting Standard (CRS) mandatory checklist.
          </p>
        </div>
        <div className="space-y-2.5">
          {FATCA_QUESTIONS.map((q) => {
            const val = Boolean(fatca[q.key]);
            return (
              <div
                key={q.key}
                className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-background px-4 py-3"
              >
                <span className="text-xs sm:text-sm font-medium text-foreground">{q.label}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => pFatca({ [q.key]: true })}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-bold border transition-colors",
                      val
                        ? "border-brand-bronze bg-brand-bronze text-white"
                        : "border-border bg-muted/30 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => pFatca({ [q.key]: false })}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-bold border transition-colors",
                      !val
                        ? "border-brand-bronze bg-brand-bronze/15 text-brand-bronze-dark"
                        : "border-border bg-muted/30 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    No
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {anyFatcaYes && (
          <div className="space-y-4 rounded-xl border border-brand-bronze/40 bg-brand-bronze/5 p-4 mt-3">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-bronze">
              Foreign Tax Residency Particulars
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Foreign Full Legal Name">
                <Input value={fatca.foreignFullName} onChange={(e) => pFatca({ foreignFullName: e.target.value })} />
              </Field>
              <Field label="Foreign TIN / US SSN">
                <Input value={fatca.foreignTinOrSsn} onChange={(e) => pFatca({ foreignTinOrSsn: e.target.value })} placeholder="Tax ID or SSN" />
              </Field>
              <Field label="Foreign Residential Address">
                <Input value={fatca.foreignResidentialAddress} onChange={(e) => pFatca({ foreignResidentialAddress: e.target.value })} />
              </Field>
              <Field label="Foreign Mailing Address">
                <Input value={fatca.foreignMailingAddress} onChange={(e) => pFatca({ foreignMailingAddress: e.target.value })} />
              </Field>
              <Field label="Foreign Contact Phone">
                <Input value={fatca.foreignPhone} onChange={(e) => pFatca({ foreignPhone: e.target.value })} placeholder="+1 / +44 ..." />
              </Field>
            </div>
          </div>
        )}
      </div>

      {/* SEC Section M: Politically Exposed Persons (PEP) Screening */}
      <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">
              SEC Section M — Politically Exposed Persons (PEP) Declaration
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
              Do you, your spouse, or any immediate family member hold (or have held) a senior public, government, judicial, military, or political office in Ghana or abroad?
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                p({
                  isPep: true,
                  pepEntries:
                    pepEntries.length > 0
                      ? pepEntries
                      : [{ officialName: "", relationship: "Self", positionHeld: "" }],
                });
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-md text-xs font-bold border transition-colors",
                d.isPep
                  ? "border-brand-bronze bg-brand-bronze text-white"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              Yes (PEP)
            </button>
            <button
              type="button"
              onClick={() => p({ isPep: false, pepEntries: [] })}
              className={cn(
                "px-3.5 py-1.5 rounded-md text-xs font-bold border transition-colors",
                !d.isPep
                  ? "border-brand-bronze bg-brand-bronze/15 text-brand-bronze-dark"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              No
            </button>
          </div>
        </div>

        {d.isPep && (
          <div className="space-y-4 pt-2">
            {pepEntries.map((entry, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-bronze">
                    PEP Official #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePepEntry(idx)}
                    className="text-xs text-destructive hover:underline inline-flex items-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Name of Public Official">
                    <Input
                      value={entry.officialName}
                      onChange={(e) => updatePepEntry(idx, { officialName: e.target.value })}
                      placeholder="Full name"
                    />
                  </Field>
                  <Field label="Relationship to Applicant">
                    <SearchableSelect
                      options={["Self", ...RELATIONSHIPS]}
                      value={entry.relationship}
                      onChange={(relationship) => updatePepEntry(idx, { relationship })}
                      placeholder="Self / Spouse / Parent"
                    />
                  </Field>
                  <Field label="Public Position / Office Held">
                    <Input
                      value={entry.positionHeld}
                      onChange={(e) => updatePepEntry(idx, { positionHeld: e.target.value })}
                      placeholder="e.g. MP, Director-General, Judge"
                    />
                  </Field>
                </div>
              </div>
            ))}
            {pepEntries.length < 3 && (
              <Button type="button" variant="outline" size="sm" onClick={addPepEntry} className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Another PEP Official ({pepEntries.length}/3)
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Step5({ form, patchStep }: { form: KycFormData; patchStep: any }) {
  const d = { ...EMPTY_FORM["5"]!, ...(form["5"] ?? {}) };
  const isJoint = form["1"]?.accountCategory === "Joint";
  const p = (v: any) => patchStep("5", v);
  const sigCanvas = useRef<any>(null);
  const jointSigCanvas = useRef<any>(null);
  const [mode, setMode] = useState<"draw" | "upload">("draw");

  useEffect(() => {
    if (mode === "draw" && d.signature && sigCanvas.current) {
      if (sigCanvas.current.isEmpty()) {
        sigCanvas.current.fromDataURL(d.signature);
      }
    }
  }, [d.signature, mode]);

  const handleEnd = () => {
    if (sigCanvas.current) {
      p({
        signature: sigCanvas.current.toDataURL(),
        signatureFile: null,
        signatureFileName: "",
        signatureUrl: undefined,
      });
    }
  };

  const handleJointEnd = () => {
    if (jointSigCanvas.current) {
      p({
        jointSignature: jointSigCanvas.current.toDataURL(),
      });
    }
  };

  const clearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
    p({ signature: "", signatureFile: null, signatureFileName: "", signatureUrl: undefined });
  };

  const clearJointSignature = () => {
    if (jointSigCanvas.current) {
      jointSigCanvas.current.clear();
    }
    p({ jointSignature: "", jointSignatureFileName: "" });
  };

  const switchMode = (next: "draw" | "upload") => {
    setMode(next);
    if (next === "draw") {
      p({ signatureFile: null, signatureFileName: "" });
    } else {
      p({ signature: "" });
      if (sigCanvas.current) sigCanvas.current.clear();
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">
          Applicant 1 (Primary) Digital Signature Specimen
        </p>
        <p className="text-sm text-muted-foreground mb-2">
          Your signature will be embedded directly onto your official SEC KYC Form and CSD Form 1.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => switchMode("draw")}
            className={cn(
              "flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
              mode === "draw"
                ? "border-brand-bronze bg-brand-bronze-soft text-brand-bronze-dark"
                : "border-border bg-background text-foreground hover:bg-muted/50",
            )}
          >
            Draw signature
          </button>
          <button
            type="button"
            onClick={() => switchMode("upload")}
            className={cn(
              "flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
              mode === "upload"
                ? "border-brand-bronze bg-brand-bronze-soft text-brand-bronze-dark"
                : "border-border bg-background text-foreground hover:bg-muted/50",
            )}
          >
            Upload signature
          </button>
        </div>

        {mode === "draw" ? (
          <>
            {d.signatureUrl && !d.signature && !d.signatureFile && (
              <img src={d.signatureUrl} alt="Saved signature" className="max-h-24 rounded border border-border bg-white p-2" />
            )}
            <div className="border border-dashed border-brand-bronze/50 rounded-lg bg-white overflow-hidden">
              <SignatureCanvas
                ref={sigCanvas}
                canvasProps={{ className: "w-full h-48 cursor-crosshair" }}
                onEnd={handleEnd}
                penColor="black"
              />
            </div>
            <div className="flex justify-end mt-2">
              <button type="button" onClick={clearSignature} className="text-xs font-medium text-destructive hover:underline">
                Clear Signature
              </button>
            </div>
          </>
        ) : (
          <>
            <FileUpload
              label="Upload or photograph your signature"
              fileName={d.signatureFileName ?? ""}
              file={d.signatureFile}
              onChange={() => {}}
              onFile={async (file) => {
                const processed = file ? await normalizeSignatureImage(file) : null;
                p({ signatureFile: processed, signatureFileName: processed?.name ?? "", signatureUrl: undefined });
              }}
            />
            <p className="text-xs text-muted-foreground">
              Photograph your signature on a plain white background for best results.
            </p>
          </>
        )}
      </div>

      {isJoint && (
        <div className="space-y-4 rounded-xl border border-brand-bronze/40 bg-brand-bronze/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">
            Applicant 2 (Joint Account Holder) Digital Signature Specimen
          </p>
          <div className="border border-dashed border-brand-bronze/50 rounded-lg bg-white overflow-hidden">
            <SignatureCanvas
              ref={jointSigCanvas}
              canvasProps={{ className: "w-full h-40 cursor-crosshair" }}
              onEnd={handleJointEnd}
              penColor="black"
            />
          </div>
          <div className="flex justify-end mt-2">
            <button type="button" onClick={clearJointSignature} className="text-xs font-medium text-destructive hover:underline">
              Clear Joint Signature
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Step6({ form, patchStep }: { form: KycFormData; patchStep: any }) {
  const d = { ...EMPTY_FORM["6"]!, ...(form["6"] ?? {}) };
  const p = (v: any) => patchStep("6", v);
  const [downloadingKyc, setDownloadingKyc] = useState(false);
  const [downloadingCsd, setDownloadingCsd] = useState(false);
  const [downloadingIndemnity, setDownloadingIndemnity] = useState(false);

  const handleDownloadKycPdf = async () => {
    try {
      setDownloadingKyc(true);
      await onboardingApi.downloadKycForm();
      toast.success("Official SEC KYC Form downloaded");
    } catch (err) {
      toast.error("Could not download SEC KYC PDF", {
        description: err instanceof Error ? err.message : "Please try again after saving.",
      });
    } finally {
      setDownloadingKyc(false);
    }
  };

  const handleDownloadCsdPdf = async () => {
    try {
      setDownloadingCsd(true);
      await onboardingApi.downloadCsdForm();
      toast.success("Official CSD Account Opening Form downloaded");
    } catch (err) {
      toast.error("Could not download CSD Form PDF", {
        description: err instanceof Error ? err.message : "Please try again after saving.",
      });
    } finally {
      setDownloadingCsd(false);
    }
  };

  const handleDownloadIndemnityPdf = async () => {
    try {
      setDownloadingIndemnity(true);
      await onboardingApi.downloadIndemnityForm();
      toast.success("Electronic Communication Indemnity Form downloaded");
    } catch (err) {
      toast.error("Could not download Indemnity Form PDF", {
        description: err instanceof Error ? err.message : "Please try again after saving.",
      });
    } finally {
      setDownloadingIndemnity(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Official Regulatory Form Preview & Download Bar */}
      <div className="rounded-2xl border border-brand-bronze/30 bg-brand-bronze/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand-bronze/15 text-brand-bronze flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              3 Official Regulatory Forms Ready (SEC KYC, CSD Form 1 &amp; Indemnity Form)
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Preview your pre-filled regulatory forms before submitting. All three signed PDFs are automatically generated and dispatched to Constant Capital Compliance &amp; Brokerage upon submission.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadKycPdf}
            disabled={downloadingKyc}
            className="text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {downloadingKyc ? "Generating…" : "SEC KYC Form (PDF)"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadCsdPdf}
            disabled={downloadingCsd}
            className="text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {downloadingCsd ? "Generating…" : "CSD Form 1 (PDF)"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadIndemnityPdf}
            disabled={downloadingIndemnity}
            className="text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {downloadingIndemnity ? "Generating…" : "Indemnity Form (PDF)"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <DeclarationRow checked={d.accuracy} onChange={(accuracy) => p({ accuracy })}>
          I/We hereby declare that all information provided in this application is true, correct, and
          complete, and I/We undertake to notify Constant Capital (Ghana) Limited immediately of any changes.
        </DeclarationRow>
        <DeclarationRow checked={d.sourceOfFundsDeclaration} onChange={(sourceOfFundsDeclaration) => p({ sourceOfFundsDeclaration })}>
          <span>
            <strong>AML Source of Funds &amp; Electronic Communication Indemnity Undertaking:</strong>{" "}
            I/We confirm that the source of funds is legitimate and derived from lawful activities in
            compliance with the Anti-Money Laundering Act, 2020 (Act 1044). Furthermore, I/We hereby execute the{" "}
            <strong>Electronic Communication Indemnity Form</strong> addressed to{" "}
            <em>The Head of Brokerage, Constant Capital (Ghana) Limited</em>, authorizing the execution of
            securities instructions transmitted by telephone and e-mail and agreeing to hold Constant Capital
            (Ghana) Limited blameless and indemnified against all losses, proceedings, or demands arising therefrom.
          </span>
        </DeclarationRow>
        <DeclarationRow checked={d.terms} onChange={(terms) => p({ terms })}>
          I/We have read, understood, and agree to the Constant Capital{" "}
          <a href="/legal/terms" target="_blank" rel="noreferrer" className="font-medium text-brand-bronze underline underline-offset-2">General Terms &amp; Conditions</a>{" "}
          and <a href="/legal/privacy" target="_blank" rel="noreferrer" className="font-medium text-brand-bronze underline underline-offset-2">Privacy Policy</a>,
          and the Securities and Exchange Commission (SEC) Ghana investor rights and obligations.
        </DeclarationRow>
      </div>
    </div>
  );
}
