import { Check, ChevronDown, Upload, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { type ReactNode, useState, useEffect, useRef, useMemo } from "react";

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
  file?: File;
  fileUrl?: string;
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
  hasExistingCsd: boolean;
  csdNumber: string;
}

export interface Step2Data {
  residentialAddress: string;
  nearestLandmark: string;
  cityTown: string;
  digitalAddress: string;
  postalAddress: string;
  email: string;
  mobile1: string;
  mobile2: string;
  emergencyContacts: EmergencyContact[];
  employmentStatus: string;
  yearsEmployed: string;
  yearsCurrent: string;
  yearsPrevious: string;
  monthlyIncomeRange: string;
  employer: EmployerInfo;
  occupation: string;
  profession: string;
  bankName: string;
  branch: string;
  accountName: string;
  accountNumber: string;
}

export interface Step3Data {
  investmentTypes: string[];
  category: string;
  investmentObjectives: string;
  riskTolerance: string;
  investmentHorizon: string;
  investmentKnowledge: string;
  sourceOfFunds: string;
  initialInvestment: string;
}

export interface Step4Data {
  passportPhoto: string;
  passportFile?: File | null;
  passportPhotoUrl?: string;
  identityDocs: IdentityDoc[];
}

export interface Step5Data {
  signature: string;
  signatureFile?: File | null;
  signatureFileName?: string;
  signatureUrl?: string;
}

export interface Step6Data {
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
}

export const EMPTY_FORM: KycFormData = {
  "1": {
    title: "", gender: "", surname: "", firstName: "", otherNames: "",
    maidenName: "", maritalStatus: "", dateOfBirth: "", placeOfBirth: "",
    mothersMaidenName: "", tin: "", residentialStatus: "", countryOfOrigin: "",
    countryOfResidence: "", permitNumber: "", permitIssueDate: "",
    permitExpiryDate: "", hasExistingCsd: false, csdNumber: "",
  },
  "2": {
    residentialAddress: "", nearestLandmark: "", cityTown: "",
    digitalAddress: "", postalAddress: "", email: "", mobile1: "", mobile2: "",
    emergencyContacts: [
      { name: "", relationship: "", number: "" },
      { name: "", relationship: "", number: "" },
    ],
    employmentStatus: "", yearsEmployed: "", yearsCurrent: "", yearsPrevious: "",
    monthlyIncomeRange: "",
    employer: {
      name: "", address: "", landmark: "", digitalAddress: "", cityTown: "",
      natureOfBusiness: "", contact1: "", contact2: "", officeEmail: "",
    },
    occupation: "", profession: "",
    bankName: "", branch: "", accountName: "", accountNumber: "",
  },
  "3": {
    investmentTypes: [], category: "",
    investmentObjectives: "", riskTolerance: "", investmentHorizon: "",
    investmentKnowledge: "", sourceOfFunds: "", initialInvestment: "",
  },
  "4": {
    passportPhoto: "",
    passportFile: null,
    identityDocs: [
      { type: "", number: "", placeOfIssue: "", issueDate: "", expiryDate: "", fileName: "", file: undefined },
      { type: "", number: "", placeOfIssue: "", issueDate: "", expiryDate: "", fileName: "", file: undefined },
    ],
  },
  "5": { signature: "", signatureFile: null, signatureFileName: "" },
  "6": { accuracy: false, sourceOfFundsDeclaration: false, terms: false },
};

export const STEP_LABELS = [
  "Personal Information",
  "Contact & Professional",
  "Account Preferences",
  "Document Uploads",
  "Digital Signature",
  "Review & Submit"
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

/** Searchable dropdown / combobox with free-text fallback. */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Search or type...",
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query) return options;
    const lc = query.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(lc));
  }, [options, query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); setQuery(""); }}
        className={cn(
          "flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm transition-colors",
          open ? "border-brand-bronze ring-1 ring-brand-bronze/30" : "border-input hover:border-brand-bronze/40",
        )}
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || placeholder}
        </span>
        <span className="flex items-center gap-1">
          {value && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="rounded-sm p-0.5 hover:bg-muted"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
          )}
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search…"
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-1 focus-visible:ring-brand-bronze/40"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <button
                type="button"
                onClick={() => { onChange(query); setOpen(false); }}
                className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
              >
                Use &ldquo;{query}&rdquo;
              </button>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                    opt === value && "bg-brand-bronze-soft text-brand-bronze-dark font-medium",
                  )}
                >
                  {opt === value && <Check className="h-3.5 w-3.5 shrink-0" />}
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Three-dropdown date picker (Day / Month / Year) — much easier to use than native date inputs. */
export function DateSelect({
  value,
  onChange,
  yearRange,
}: {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (iso: string) => void;
  /** [startYear, endYear] inclusive. Defaults to [1950, currentYear + 10]. */
  yearRange?: [number, number];
}) {
  const now = new Date();
  const [startY, endY] = yearRange ?? [1950, now.getFullYear() + 10];

  // Parse existing value into local state so partial selections persist
  const parts = value ? value.split("-") : [];
  const [localDay, setLocalDay] = useState(parts[2] ?? "");
  const [localMonth, setLocalMonth] = useState(parts[1] ?? "");
  const [localYear, setLocalYear] = useState(parts[0] ?? "");

  // Sync from parent when value changes externally
  useEffect(() => {
    const p = value ? value.split("-") : [];
    setLocalYear(p[0] ?? "");
    setLocalMonth(p[1] ?? "");
    setLocalDay(p[2] ?? "");
  }, [value]);

  const tryEmit = (y: string, m: string, d: string) => {
    if (y && m && d) {
      onChange(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    }
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Days depend on month+year
  const daysInMonth = localYear && localMonth
    ? new Date(Number(localYear), Number(localMonth), 0).getDate()
    : 31;

  const years: number[] = [];
  for (let y = endY; y >= startY; y--) years.push(y);

  const selectClass =
    "rounded-md border border-input bg-background px-2.5 py-2 text-sm outline-none transition-colors focus:border-brand-bronze focus:ring-1 focus:ring-brand-bronze/30 hover:border-brand-bronze/40 appearance-none cursor-pointer";

  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Day */}
      <select
        value={localDay}
        onChange={(e) => {
          setLocalDay(e.target.value);
          tryEmit(localYear, localMonth, e.target.value);
        }}
        className={selectClass}
      >
        <option value="">Day</option>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
          <option key={d} value={String(d).padStart(2, "0")}>
            {d}
          </option>
        ))}
      </select>

      {/* Month */}
      <select
        value={localMonth ? String(Number(localMonth)) : ""}
        onChange={(e) => {
          const m = e.target.value ? String(Number(e.target.value)).padStart(2, "0") : "";
          setLocalMonth(m);
          tryEmit(localYear, m, localDay);
        }}
        className={selectClass}
      >
        <option value="">Month</option>
        {months.map((name, i) => (
          <option key={i} value={String(i + 1)}>
            {name}
          </option>
        ))}
      </select>

      {/* Year */}
      <select
        value={localYear}
        onChange={(e) => {
          setLocalYear(e.target.value);
          tryEmit(e.target.value, localMonth, localDay);
        }}
        className={selectClass}
      >
        <option value="">Year</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Quick-pick suggestion chips for a textarea. Clicking appends the text. */
export function SuggestionChips({
  suggestions,
  onPick,
}: {
  suggestions: readonly string[];
  onPick: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onPick(s)}
          className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-brand-bronze/40 hover:bg-brand-bronze-soft hover:text-brand-bronze-dark"
        >
          {s}
        </button>
      ))}
    </div>
  );
}

/** File upload component with image preview. */
export function FileUpload({
  label,
  fileName,
  file,
  onChange,
  onFile,
  uploadedUrl,
}: {
  label: string;
  fileName: string;
  file?: File | null;
  onChange: (name: string) => void;
  onFile?: (file: File | null) => void;
  uploadedUrl?: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreview(uploadedUrl ?? null);
    }
  }, [file, uploadedUrl]);

  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3.5 transition-colors hover:border-brand-bronze/50 hover:bg-brand-bronze-soft/30">
      {preview ? (
        <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-black/5">
          <img src={preview} alt="Preview" className="h-full w-full object-cover" />
        </div>
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-bronze/15">
          <Upload className="h-4 w-4 text-brand-bronze" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {fileName || "Click to choose a file (JPG, PNG, WEBP, HEIC, AVIF or PDF)"}
        </span>
      </span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,application/pdf"
        className="hidden"
        onChange={(e) => {
          const selectedFile = e.target.files?.[0];
          onChange(selectedFile?.name ?? "");
          if (onFile) onFile(selectedFile ?? null);
        }}
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
