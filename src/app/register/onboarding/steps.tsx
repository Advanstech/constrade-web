import { Check, Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

// ---------- types ----------
export interface EmergencyContact {
  name: string;
  relationship: string;
  number: string;
}

export interface IdentityDoc {
  type: string;
  number: string;
  placeOfIssue: string;
  issueDate: string;
  expiryDate: string;
  fileName: string;
}

export interface EmployerInfo {
  name: string;
  address: string;
  landmark: string;
  digitalAddress: string;
  cityTown: string;
  natureOfBusiness: string;
  contact1: string;
  contact2: string;
  officeEmail: string;
}

export interface Step1Data {
  investmentTypes: string[];
  category: string;
}

export interface Step2Data {
  title: string;
  gender: string;
  surname: string;
  firstName: string;
  otherNames: string;
  maidenName: string;
  maritalStatus: string;
  dateOfBirth: string;
  placeOfBirth: string;
  mothersMaidenName: string;
  tin: string;
  residentialStatus: string;
  countryOfOrigin: string;
  countryOfResidence: string;
  permitNumber: string;
  permitIssueDate: string;
  permitExpiryDate: string;
  occupation: string;
  profession: string;
}

export interface Step3Data {
  residentialAddress: string;
  nearestLandmark: string;
  cityTown: string;
  digitalAddress: string;
  postalAddress: string;
  email: string;
  mobile1: string;
  mobile2: string;
  emergencyContacts: EmergencyContact[];
}

export interface Step4Data {
  passportPhoto: string;
  identityDocs: IdentityDoc[];
}

export interface Step5Data {
  employmentStatus: string;
  yearsEmployed: string;
  yearsCurrent: string;
  yearsPrevious: string;
  monthlyIncomeRange: string;
  employer: EmployerInfo;
}

export interface Step6Data {
  investmentObjectives: string;
  riskTolerance: string;
  investmentHorizon: string;
  investmentKnowledge: string;
  sourceOfFunds: string;
  initialInvestment: string;
}

export interface Step7Data {
  accuracy: boolean;
  sourceOfFundsDeclaration: boolean;
  terms: boolean;
}

export interface KycFormData {
  "1"?: Step1Data;
  "2"?: Step2Data;
  "3"?: Step3Data;
  "4"?: Step4Data;
  "5"?: Step5Data;
  "6"?: Step6Data;
  "7"?: Step7Data;
}

export const EMPTY_FORM: KycFormData = {
  "1": { investmentTypes: [], category: "" },
  "2": {
    title: "", gender: "", surname: "", firstName: "", otherNames: "",
    maidenName: "", maritalStatus: "", dateOfBirth: "", placeOfBirth: "",
    mothersMaidenName: "", tin: "", residentialStatus: "", countryOfOrigin: "",
    countryOfResidence: "", permitNumber: "", permitIssueDate: "",
    permitExpiryDate: "", occupation: "", profession: "",
  },
  "3": {
    residentialAddress: "", nearestLandmark: "", cityTown: "",
    digitalAddress: "", postalAddress: "", email: "", mobile1: "", mobile2: "",
    emergencyContacts: [
      { name: "", relationship: "", number: "" },
      { name: "", relationship: "", number: "" },
    ],
  },
  "4": {
    passportPhoto: "",
    identityDocs: [
      { type: "", number: "", placeOfIssue: "", issueDate: "", expiryDate: "", fileName: "" },
      { type: "", number: "", placeOfIssue: "", issueDate: "", expiryDate: "", fileName: "" },
    ],
  },
  "5": {
    employmentStatus: "", yearsEmployed: "", yearsCurrent: "", yearsPrevious: "",
    monthlyIncomeRange: "",
    employer: {
      name: "", address: "", landmark: "", digitalAddress: "", cityTown: "",
      natureOfBusiness: "", contact1: "", contact2: "", officeEmail: "",
    },
  },
  "6": {
    investmentObjectives: "", riskTolerance: "", investmentHorizon: "",
    investmentKnowledge: "", sourceOfFunds: "", initialInvestment: "",
  },
  "7": { accuracy: false, sourceOfFundsDeclaration: false, terms: false },
};

export const STEP_LABELS = [
  "Investment Type",
  "Personal Information",
  "Contact Details",
  "Proof of Identity",
  "Employment Details",
  "Investment Profile",
  "Declarations",
  "Review & Submit",
];

// ---------- shared field components ----------
export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

/** Pill-style single choice (radio behaviour). */
export function ChoiceChips({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div className={cn("grid gap-2", columns === 1 ? "grid-cols-1" : columns === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2")}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(active ? "" : opt)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-brand-bronze bg-brand-bronze-soft text-brand-bronze-dark"
                : "border-border bg-background text-foreground hover:border-brand-bronze/40 hover:bg-muted/50",
            )}
          >
            {active && <Check className="h-3.5 w-3.5" />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/** Multi-select chips. */
export function MultiChips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => {
        const active = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-brand-bronze bg-brand-bronze-soft text-brand-bronze-dark"
                : "border-border bg-background text-foreground hover:border-brand-bronze/40 hover:bg-muted/50",
            )}
          >
            {active && <Check className="h-3.5 w-3.5" />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/** Fake file upload: captures the file name for the demo. */
export function FileUpload({
  label,
  fileName,
  onChange,
}: {
  label: string;
  fileName: string;
  onChange: (name: string) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3.5 transition-colors hover:border-brand-bronze/50 hover:bg-brand-bronze-soft/30">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-bronze/15">
        <Upload className="h-4 w-4 text-brand-bronze" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {fileName || "Click to choose a file (JPG, PNG or PDF)"}
        </span>
      </span>
      <input
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0]?.name ?? "")}
      />
    </label>
  );
}

export function DeclarationRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:border-brand-bronze/40">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        className="mt-0.5"
      />
      <span className="text-sm leading-relaxed text-foreground">{children}</span>
    </label>
  );
}
