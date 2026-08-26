import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ChoiceChips,
  DeclarationRow,
  EMPTY_FORM,
  Field,
  FileUpload,
  MultiChips,
  type KycFormData,
} from "./steps";

type StepKey = keyof KycFormData;

/**
 * Renders the fields for a wizard step. Mutations flow through `patchStep`,
 * which keeps every step's data in the parent's single form object.
 */
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
    case 1:
      return <Step1 form={form} patchStep={patchStep} />;
    case 2:
      return <Step2 form={form} patchStep={patchStep} />;
    case 3:
      return <Step3 form={form} patchStep={patchStep} />;
    case 4:
      return <Step4 form={form} patchStep={patchStep} />;
    case 5:
      return <Step5 form={form} patchStep={patchStep} />;
    case 6:
      return <Step6 form={form} patchStep={patchStep} />;
    case 7:
      return <Step7 form={form} patchStep={patchStep} />;
    default:
      return null;
  }
}

function Step1({
  form,
  patchStep,
}: {
  form: KycFormData;
  patchStep: (key: StepKey, patch: Partial<NonNullable<KycFormData[StepKey]>>) => void;
}) {
  const d = { ...EMPTY_FORM["1"], ...(form["1"] ?? {}) };
  return (
    <div className="space-y-6">
      <Field label="Investment type">
        <MultiChips
          options={["Treasury Bills/Notes/Bonds", "Equities"]}
          value={d.investmentTypes}
          onChange={(investmentTypes) => patchStep("1", { investmentTypes } as never)}
        />
      </Field>
      <Field label="Category of investment">
        <ChoiceChips
          options={["Individual", "Joint", "ITF"]}
          value={d.category}
          onChange={(category) => patchStep("1", { category } as never)}
        />
      </Field>
      <div className="rounded-lg border border-brand-bronze/25 bg-brand-bronze-soft p-3 text-xs text-brand-bronze-dark">
        Your CSD account number will be issued automatically once your application is
        approved — no separate registration needed.
      </div>
    </div>
  );
}

function Step2({
  form,
  patchStep,
}: {
  form: KycFormData;
  patchStep: (key: StepKey, patch: Partial<NonNullable<KycFormData[StepKey]>>) => void;
}) {
  const d = { ...EMPTY_FORM["2"], ...(form["2"] ?? {}) };
  const p = (v: Partial<NonNullable<KycFormData["2"]>>) => patchStep("2", v as never);
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
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">
            Resident permit (foreign nationals)
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Resident permit number">
              <Input value={d.permitNumber} onChange={(e) => p({ permitNumber: e.target.value })} />
            </Field>
            <Field label="Permit issue date">
              <Input type="date" value={d.permitIssueDate} onChange={(e) => p({ permitIssueDate: e.target.value })} />
            </Field>
            <Field label="Permit expiring date">
              <Input type="date" value={d.permitExpiryDate} onChange={(e) => p({ permitExpiryDate: e.target.value })} />
            </Field>
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Occupation">
          <Input value={d.occupation} onChange={(e) => p({ occupation: e.target.value })} />
        </Field>
        <Field label="Profession">
          <Input value={d.profession} onChange={(e) => p({ profession: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

function Step3({
  form,
  patchStep,
}: {
  form: KycFormData;
  patchStep: (key: StepKey, patch: Partial<NonNullable<KycFormData[StepKey]>>) => void;
}) {
  const d = { ...EMPTY_FORM["3"], ...(form["3"] ?? {}) };
  const p = (v: Partial<NonNullable<KycFormData["3"]>>) => patchStep("3", v as never);
  return (
    <div className="space-y-6">
      <Field label="Residential address">
        <Textarea rows={3} value={d.residentialAddress} onChange={(e) => p({ residentialAddress: e.target.value })} placeholder="House number, street, area" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nearest landmark">
          <Input value={d.nearestLandmark} onChange={(e) => p({ nearestLandmark: e.target.value })} />
        </Field>
        <Field label="City/Town">
          <Input value={d.cityTown} onChange={(e) => p({ cityTown: e.target.value })} placeholder="Accra" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Digital address (GhanaPost GPS)">
          <Input value={d.digitalAddress} onChange={(e) => p({ digitalAddress: e.target.value })} placeholder="GA-123-4567" />
        </Field>
        <Field label="Postal address">
          <Input value={d.postalAddress} onChange={(e) => p({ postalAddress: e.target.value })} placeholder="P.O. Box ..." />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Email address">
          <Input type="email" value={d.email} onChange={(e) => p({ email: e.target.value })} />
        </Field>
        <Field label="Mobile number 1">
          <Input value={d.mobile1} onChange={(e) => p({ mobile1: e.target.value })} placeholder="+233 ..." />
        </Field>
        <Field label="Mobile number 2">
          <Input value={d.mobile2} onChange={(e) => p({ mobile2: e.target.value })} placeholder="+233 ..." />
        </Field>
      </div>
      {d.emergencyContacts.map((c, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">
            Emergency contact {i + 1}
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Contact name">
              <Input value={c.name} onChange={(e) => p({ emergencyContacts: d.emergencyContacts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
            </Field>
            <Field label="Relationship to client">
              <Input value={c.relationship} onChange={(e) => p({ emergencyContacts: d.emergencyContacts.map((x, j) => (j === i ? { ...x, relationship: e.target.value } : x)) })} />
            </Field>
            <Field label="Contact number">
              <Input value={c.number} onChange={(e) => p({ emergencyContacts: d.emergencyContacts.map((x, j) => (j === i ? { ...x, number: e.target.value } : x)) })} />
            </Field>
          </div>
        </div>
      ))}
    </div>
  );
}

function Step4({
  form,
  patchStep,
}: {
  form: KycFormData;
  patchStep: (key: StepKey, patch: Partial<NonNullable<KycFormData[StepKey]>>) => void;
}) {
  const d = { ...EMPTY_FORM["4"], ...(form["4"] ?? {}) };
  const p = (v: Partial<NonNullable<KycFormData["4"]>>) => patchStep("4", v as never);
  return (
    <div className="space-y-6">
      <Field label="Passport photo">
        <FileUpload label="Upload passport photo" fileName={d.passportPhoto} onChange={(passportPhoto) => p({ passportPhoto })} />
      </Field>
      {d.identityDocs.map((doc, i) => (
        <div key={i} className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">
            Proof of identity {i + 1}
          </p>
          <Field label="ID type">
            <ChoiceChips
              options={["Passport", "National ID"]}
              value={doc.type}
              onChange={(type) => p({ identityDocs: d.identityDocs.map((x, j) => (j === i ? { ...x, type } : x)) })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ID number">
              <Input value={doc.number} onChange={(e) => p({ identityDocs: d.identityDocs.map((x, j) => (j === i ? { ...x, number: e.target.value } : x)) })} />
            </Field>
            <Field label="Place of issue">
              <Input value={doc.placeOfIssue} onChange={(e) => p({ identityDocs: d.identityDocs.map((x, j) => (j === i ? { ...x, placeOfIssue: e.target.value } : x)) })} />
            </Field>
            <Field label="Issue date">
              <Input type="date" value={doc.issueDate} onChange={(e) => p({ identityDocs: d.identityDocs.map((x, j) => (j === i ? { ...x, issueDate: e.target.value } : x)) })} />
            </Field>
            <Field label="Expiring date">
              <Input type="date" value={doc.expiryDate} onChange={(e) => p({ identityDocs: d.identityDocs.map((x, j) => (j === i ? { ...x, expiryDate: e.target.value } : x)) })} />
            </Field>
          </div>
          <FileUpload
            label={`Upload ${doc.type || "ID"} document copy`}
            fileName={doc.fileName}
            onChange={(fileName) => p({ identityDocs: d.identityDocs.map((x, j) => (j === i ? { ...x, fileName } : x)) })}
          />
        </div>
      ))}
    </div>
  );
}

function Step5({
  form,
  patchStep,
}: {
  form: KycFormData;
  patchStep: (key: StepKey, patch: Partial<NonNullable<KycFormData[StepKey]>>) => void;
}) {
  const d = { ...EMPTY_FORM["5"], ...(form["5"] ?? {}) };
  const p = (v: Partial<NonNullable<KycFormData["5"]>>) => patchStep("5", v as never);
  const e = d.employer;
  return (
    <div className="space-y-6">
      <Field label="Employment status">
        <ChoiceChips options={["Employed", "Self-employed", "Retired", "Student", "Unemployed"]} value={d.employmentStatus} onChange={(employmentStatus) => p({ employmentStatus })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Years of employment">
          <Input value={d.yearsEmployed} onChange={(ev) => p({ yearsEmployed: ev.target.value })} />
        </Field>
        <Field label="Years of current employment">
          <Input value={d.yearsCurrent} onChange={(ev) => p({ yearsCurrent: ev.target.value })} />
        </Field>
        <Field label="Years of previous employment">
          <Input value={d.yearsPrevious} onChange={(ev) => p({ yearsPrevious: ev.target.value })} />
        </Field>
      </div>
      <Field label="Total monthly income range">
        <ChoiceChips options={["Below 1,000", "1,001 – 5,000", "5,001 – 10,000", "Above 10,000"]} value={d.monthlyIncomeRange} onChange={(monthlyIncomeRange) => p({ monthlyIncomeRange })} />
      </Field>
      <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-bronze">
          Employer / business / school information
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input value={e.name} onChange={(ev) => p({ employer: { ...e, name: ev.target.value } })} />
          </Field>
          <Field label="City/Town">
            <Input value={e.cityTown} onChange={(ev) => p({ employer: { ...e, cityTown: ev.target.value } })} />
          </Field>
        </div>
        <Field label="Address">
          <Textarea rows={2} value={e.address} onChange={(ev) => p({ employer: { ...e, address: ev.target.value } })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nearest landmark">
            <Input value={e.landmark} onChange={(ev) => p({ employer: { ...e, landmark: ev.target.value } })} />
          </Field>
          <Field label="Digital address">
            <Input value={e.digitalAddress} onChange={(ev) => p({ employer: { ...e, digitalAddress: ev.target.value } })} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nature of business">
            <Input value={e.natureOfBusiness} onChange={(ev) => p({ employer: { ...e, natureOfBusiness: ev.target.value } })} />
          </Field>
          <Field label="Office email">
            <Input type="email" value={e.officeEmail} onChange={(ev) => p({ employer: { ...e, officeEmail: ev.target.value } })} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact number 1">
            <Input value={e.contact1} onChange={(ev) => p({ employer: { ...e, contact1: ev.target.value } })} />
          </Field>
          <Field label="Contact number 2">
            <Input value={e.contact2} onChange={(ev) => p({ employer: { ...e, contact2: ev.target.value } })} />
          </Field>
        </div>
      </div>
    </div>
  );
}

function Step6({
  form,
  patchStep,
}: {
  form: KycFormData;
  patchStep: (key: StepKey, patch: Partial<NonNullable<KycFormData[StepKey]>>) => void;
}) {
  const d = { ...EMPTY_FORM["6"], ...(form["6"] ?? {}) };
  const p = (v: Partial<NonNullable<KycFormData["6"]>>) => patchStep("6", v as never);
  return (
    <div className="space-y-6">
      <Field label="Investment objectives">
        <Textarea rows={3} value={d.investmentObjectives} onChange={(e) => p({ investmentObjectives: e.target.value })} placeholder="e.g. Capital growth, income, retirement savings…" />
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

function Step7({
  form,
  patchStep,
}: {
  form: KycFormData;
  patchStep: (key: StepKey, patch: Partial<NonNullable<KycFormData[StepKey]>>) => void;
}) {
  const d = { ...EMPTY_FORM["7"], ...(form["7"] ?? {}) };
  const p = (v: Partial<NonNullable<KycFormData["7"]>>) => patchStep("7", v as never);
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
