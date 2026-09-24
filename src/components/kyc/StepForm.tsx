/* eslint-disable @typescript-eslint/no-explicit-any */

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import {
  ChoiceChips,
  DeclarationRow,
  EMPTY_FORM,
  Field,
  FileUpload,
  MultiChips,
  type KycFormData,
} from "./steps";
import { GHANA_BANKS, GHANA_BANK_NAMES } from "./ghana-banks";

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
  const d = { ...EMPTY_FORM["1"], ...(form["1"] ?? {}) };
  const p = (v: any) => patchStep("1", v);
  const isForeign = !!d.countryOfOrigin && d.countryOfOrigin !== "Ghana";
  
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <ChoiceChips columns={3} options={["Dr.", "Prof.", "Mr.", "Mrs.", "Ms.", "Other"]} value={d.title} onChange={(title) => p({ title })} />
        </Field>
        <Field label="Gender">
          <ChoiceChips options={["Male", "Female"]} value={d.gender} onChange={(gender) => p({ gender })} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Surname">
          <Input value={d.surname} onChange={(e) => p({ surname: e.target.value })} placeholder="Mensah" />
        </Field>
        <Field label="First name">
          <Input value={d.firstName} onChange={(e) => p({ firstName: e.target.value })} placeholder="Kwame" />
        </Field>
        <Field label="Other names">
          <Input value={d.otherNames} onChange={(e) => p({ otherNames: e.target.value })} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Maiden name (if applicable)">
          <Input value={d.maidenName} onChange={(e) => p({ maidenName: e.target.value })} />
        </Field>
        <Field label="Marital status">
          <ChoiceChips options={["Single", "Married", "Divorced", "Widowed", "Separated"]} value={d.maritalStatus} onChange={(maritalStatus) => p({ maritalStatus })} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date of birth">
          <Input type="date" value={d.dateOfBirth} onChange={(e) => p({ dateOfBirth: e.target.value })} />
        </Field>
        <Field label="Place of birth">
          <Input value={d.placeOfBirth} onChange={(e) => p({ placeOfBirth: e.target.value })} placeholder="Accra" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mother's maiden name">
          <Input value={d.mothersMaidenName} onChange={(e) => p({ mothersMaidenName: e.target.value })} />
        </Field>
        <Field label="TIN (Tax Identification Number)">
          <Input value={d.tin} onChange={(e) => p({ tin: e.target.value })} />
        </Field>
      </div>
      <Field label="Residential status">
        <ChoiceChips columns={3} options={["Resident Ghanaian", "Non-Resident Ghanaian", "Resident Foreigner", "Non-Resident Foreigner"]} value={d.residentialStatus} onChange={(residentialStatus) => p({ residentialStatus })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Country of origin">
          <Input value={d.countryOfOrigin} onChange={(e) => p({ countryOfOrigin: e.target.value })} placeholder="Ghana" />
        </Field>
        <Field label="Country of residence">
          <Input value={d.countryOfResidence} onChange={(e) => p({ countryOfResidence: e.target.value })} placeholder="Ghana" />
        </Field>
      </div>
      {isForeign && (
        <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">Resident permit (foreign nationals)</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Resident permit number"><Input value={d.permitNumber} onChange={(e) => p({ permitNumber: e.target.value })} /></Field>
            <Field label="Permit issue date"><Input type="date" value={d.permitIssueDate} onChange={(e) => p({ permitIssueDate: e.target.value })} /></Field>
            <Field label="Permit expiring date"><Input type="date" value={d.permitExpiryDate} onChange={(e) => p({ permitExpiryDate: e.target.value })} /></Field>
          </div>
        </div>
      )}
      
      <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex items-center space-x-3">
          <Checkbox id="csd" checked={d.hasExistingCsd} onCheckedChange={(c) => p({ hasExistingCsd: !!c })} />
          <Label htmlFor="csd" className="font-semibold cursor-pointer">Do you have an existing CSD Account Number?</Label>
        </div>
        {d.hasExistingCsd && (
          <div className="grid gap-4 sm:grid-cols-2">
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
  const d = { ...EMPTY_FORM["2"], ...(form["2"] ?? {}) };
  const p = (v: any) => patchStep("2", v);
  const e = d.employer;

  const defaultAccountName = `${form["1"]?.firstName ?? ""} ${form["1"]?.surname ?? ""}`.trim();
  const accountNameValue = d.accountName || defaultAccountName;

  const branches = GHANA_BANKS[d.bankName] ?? [];
  const hasBranches = branches.length > 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Mobile number 1">
          <Input value={d.mobile1} onChange={(ev) => p({ mobile1: ev.target.value })} placeholder="+233 ..." />
        </Field>
        <Field label="Mobile number 2">
          <Input value={d.mobile2} onChange={(ev) => p({ mobile2: ev.target.value })} placeholder="+233 ..." />
        </Field>
        <Field label="Email address">
          <Input type="email" value={d.email} onChange={(ev) => p({ email: ev.target.value })} />
        </Field>
      </div>

      <Field label="Residential address">
        <Textarea rows={2} value={d.residentialAddress} onChange={(ev) => p({ residentialAddress: ev.target.value })} placeholder="House number, street, area" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nearest landmark"><Input value={d.nearestLandmark} onChange={(ev) => p({ nearestLandmark: ev.target.value })} /></Field>
        <Field label="City/Town"><Input value={d.cityTown} onChange={(ev) => p({ cityTown: ev.target.value })} placeholder="Accra" /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Digital address (GhanaPost GPS)"><Input value={d.digitalAddress} onChange={(ev) => p({ digitalAddress: ev.target.value })} placeholder="GA-123-4567" /></Field>
        <Field label="Postal address"><Input value={d.postalAddress} onChange={(ev) => p({ postalAddress: ev.target.value })} placeholder="P.O. Box ..." /></Field>
      </div>

      {d.emergencyContacts.map((c: any, i: number) => (
        <div key={i} className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">Emergency contact {i + 1}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Contact name"><Input value={c.name} onChange={(ev) => p({ emergencyContacts: d.emergencyContacts.map((x: any, j: number) => (j === i ? { ...x, name: ev.target.value } : x)) })} /></Field>
            <Field label="Relationship"><Input value={c.relationship} onChange={(ev) => p({ emergencyContacts: d.emergencyContacts.map((x: any, j: number) => (j === i ? { ...x, relationship: ev.target.value } : x)) })} /></Field>
            <Field label="Contact number"><Input value={c.number} onChange={(ev) => p({ emergencyContacts: d.emergencyContacts.map((x: any, j: number) => (j === i ? { ...x, number: ev.target.value } : x)) })} /></Field>
          </div>
        </div>
      ))}

      <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4 mt-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">Employment Information</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Occupation"><Input value={d.occupation} onChange={(ev) => p({ occupation: ev.target.value })} /></Field>
          <Field label="Profession"><Input value={d.profession} onChange={(ev) => p({ profession: ev.target.value })} /></Field>
        </div>
        <Field label="Employment status">
          <ChoiceChips options={["Employed", "Self-employed", "Retired", "Student", "Unemployed"]} value={d.employmentStatus} onChange={(employmentStatus) => p({ employmentStatus })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Years of employment"><Input value={d.yearsEmployed} onChange={(ev) => p({ yearsEmployed: ev.target.value })} /></Field>
          <Field label="Years at current"><Input value={d.yearsCurrent} onChange={(ev) => p({ yearsCurrent: ev.target.value })} /></Field>
          <Field label="Years at previous"><Input value={d.yearsPrevious} onChange={(ev) => p({ yearsPrevious: ev.target.value })} /></Field>
        </div>
        <Field label="Total monthly income range">
          <ChoiceChips options={["Below 1,000", "1,001 – 5,000", "5,001 – 10,000", "Above 10,000"]} value={d.monthlyIncomeRange} onChange={(monthlyIncomeRange) => p({ monthlyIncomeRange })} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <Field label="Employer Name"><Input value={e.name} onChange={(ev) => p({ employer: { ...e, name: ev.target.value } })} /></Field>
          <Field label="Nature of business (Industry)"><Input value={e.natureOfBusiness} onChange={(ev) => p({ employer: { ...e, natureOfBusiness: ev.target.value } })} /></Field>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4 mt-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">Bank Account Details</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bank name">
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
          <Field label="Branch (optional)">
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Account name">
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
          <Field label="Account number"><Input value={d.accountNumber} onChange={(ev) => p({ accountNumber: ev.target.value })} placeholder="1234567890123" /></Field>
        </div>
      </div>
    </div>
  );
}

function Step3({ form, patchStep }: { form: KycFormData; patchStep: any }) {
  const d = { ...EMPTY_FORM["3"], ...(form["3"] ?? {}) };
  const p = (v: any) => patchStep("3", v);
  return (
    <div className="space-y-6">
      <Field label="Account Type">
        <ChoiceChips
          options={["Individual Investor", "Corporate Client", "Institutional Customer", "Financial Professional"]}
          value={d.category}
          onChange={(category) => p({ category })}
        />
      </Field>
      <Field label="Investment type">
        <MultiChips
          options={["Treasury Bills/Notes/Bonds", "Equities"]}
          value={d.investmentTypes}
          onChange={(investmentTypes) => p({ investmentTypes })}
        />
      </Field>
      <Field label="Additional Information (Investment Objectives)">
        <Textarea rows={3} value={d.investmentObjectives} onChange={(e) => p({ investmentObjectives: e.target.value })} placeholder="Tell us more about your investment goals, experience..." />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
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
      <Field label="Source of funds">
        <ChoiceChips options={["Salary", "Personal Savings", "Proceeds from Business", "Inheritance/Gift", "Others"]} value={d.sourceOfFunds} onChange={(sourceOfFunds) => p({ sourceOfFunds })} />
      </Field>
      <Field label="Initial investment amount (GHS)">
        <Input type="number" min="0" value={d.initialInvestment} onChange={(e) => p({ initialInvestment: e.target.value })} placeholder="e.g. 10000" />
      </Field>
    </div>
  );
}

function Step6({ form, patchStep }: { form: KycFormData; patchStep: any }) {
  const d = { ...EMPTY_FORM["6"], ...(form["6"] ?? {}) };
  const p = (v: any) => patchStep("6", v);
  return (
    <div className="space-y-4">
      <DeclarationRow checked={d.accuracy} onChange={(accuracy) => p({ accuracy })}>
        I confirm that the information provided in this application is true, accurate and
        complete, and I will notify Constant Capital of any changes.
      </DeclarationRow>
      <DeclarationRow checked={d.sourceOfFundsDeclaration} onChange={(sourceOfFundsDeclaration) => p({ sourceOfFundsDeclaration })}>
        I confirm that my source of funds is legitimate and derived from lawful activities,
        and that I am not acting on behalf of any undisclosed third party.
      </DeclarationRow>
      <DeclarationRow checked={d.terms} onChange={(terms) => p({ terms })}>
        I have read and agree to the Constant Capital client agreement, terms &amp; conditions
        and the SEC-Ghana investor rights and obligations.
      </DeclarationRow>
    </div>
  );
}

import SignatureCanvas from 'react-signature-canvas';
import { useRef, useEffect } from 'react';

function Step4({ form, patchStep }: { form: KycFormData; patchStep: any }) {
  const d = { ...EMPTY_FORM["4"], ...(form["4"] ?? {}) };
  const p = (v: any) => patchStep("4", v);
  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">Standard Passport Picture</p>
        <Field label="Upload a standard passport picture">
          <FileUpload label="Upload passport photo" fileName={d.passportPhoto} onChange={(passportPhoto) => p({ passportPhoto })} onFile={(passportFile) => p({ passportFile })} />
        </Field>
      </div>
      
      <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">Ghana Card or International Passport</p>
        {d.identityDocs.map((doc: any, i: number) => {
          const isBack = i === 1;
          const frontDoc: any = d.identityDocs[0] || {};
          
          if (isBack && frontDoc.type === "Passport") {
            return null; // Passports do not require a back upload
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="ID number"><Input value={doc.number} onChange={(e) => p({ identityDocs: d.identityDocs.map((x: any, j: number) => (j === i ? { ...x, number: e.target.value } : x)) })} /></Field>
                    <Field label="Place of issue"><Input value={doc.placeOfIssue} onChange={(e) => p({ identityDocs: d.identityDocs.map((x: any, j: number) => (j === i ? { ...x, placeOfIssue: e.target.value } : x)) })} /></Field>
                    <Field label="Issue date"><Input type="date" value={doc.issueDate} onChange={(e) => p({ identityDocs: d.identityDocs.map((x: any, j: number) => (j === i ? { ...x, issueDate: e.target.value } : x)) })} /></Field>
                    <Field label="Expiring date"><Input type="date" value={doc.expiryDate} onChange={(e) => p({ identityDocs: d.identityDocs.map((x: any, j: number) => (j === i ? { ...x, expiryDate: e.target.value } : x)) })} /></Field>
                  </div>
                </>
              )}
              <FileUpload 
                label={`Upload ${isBack ? (frontDoc.type || "ID") : (doc.type || "ID")} ${isBack ? "Back" : "Front"} copy`} 
                fileName={doc.fileName} 
                onChange={(fileName) => {
                  p({ 
                    identityDocs: d.identityDocs.map((x: any, j: number) => {
                      if (j === i) {
                        return isBack 
                          ? { ...x, fileName, type: frontDoc.type, number: frontDoc.number, placeOfIssue: frontDoc.placeOfIssue, issueDate: frontDoc.issueDate, expiryDate: frontDoc.expiryDate } 
                          : { ...x, fileName };
                      }
                      return x;
                    }) 
                  });
                }} 
                onFile={(file) => {
                  p({ 
                    identityDocs: d.identityDocs.map((x: any, j: number) => {
                      if (j === i) {
                        return isBack 
                          ? { ...x, file, type: frontDoc.type, number: frontDoc.number, placeOfIssue: frontDoc.placeOfIssue, issueDate: frontDoc.issueDate, expiryDate: frontDoc.expiryDate } 
                          : { ...x, file };
                      }
                      return x;
                    }) 
                  });
                }} 
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Step5({ form, patchStep }: { form: KycFormData; patchStep: any }) {
  const d = { ...EMPTY_FORM["5"], ...(form["5"] ?? {}) };
  const p = (v: any) => patchStep("5", v);
  const sigCanvas = useRef<any>(null);

  useEffect(() => {
    if (d.signature && sigCanvas.current) {
      if (sigCanvas.current.isEmpty()) {
        sigCanvas.current.fromDataURL(d.signature);
      }
    }
  }, [d.signature]);

  const handleEnd = () => {
    if (sigCanvas.current) {
      p({ signature: sigCanvas.current.toDataURL() });
    }
  };

  const clearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      p({ signature: "" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">Digital Signature</p>
        <p className="text-sm text-muted-foreground mb-4">Please draw your signature in the box below to complete your KYC application.</p>
        
        <div className="border border-dashed border-brand-bronze/50 rounded-lg bg-background overflow-hidden">
          <SignatureCanvas
            ref={sigCanvas}
            canvasProps={{ className: 'w-full h-48 cursor-crosshair' }}
            onEnd={handleEnd}
            penColor="black"
          />
        </div>
        
        <div className="flex justify-end mt-2">
          <button type="button" onClick={clearSignature} className="text-xs font-medium text-destructive hover:underline">
            Clear Signature
          </button>
        </div>
      </div>
    </div>
  );
}
