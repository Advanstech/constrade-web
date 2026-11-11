import Link from "next/link";
import { UserX, ShieldCheck, ArrowLeft, Smartphone, Mail, CheckCircle2, FileText } from "lucide-react";

export const metadata = {
  title: "Account & Data Deletion — Constant Capital",
  description:
    "Instructions for closing your Constant Capital (Constant Trade) brokerage account and how your personal and regulatory data is handled.",
};

const steps = [
  {
    step: "1",
    title: "Open the Constant Capital Mobile App",
    description:
      "Sign in to your account and tap the Profile tab in the bottom navigation bar.",
  },
  {
    step: "2",
    title: "Select 'Delete Account' under Support & Legal",
    description:
      "Scroll to the 'Support & Legal' section on your Profile screen and tap 'Delete Account'.",
  },
  {
    step: "3",
    title: "Confirm with Your Password",
    description:
      "Ensure any pending unsettled orders are completed or cancelled, enter your account password to verify ownership, and tap 'Permanently Close Account'.",
  },
];

const immediatelyDeleted = [
  "Your active login credentials, password hash, and authentication session tokens across all devices",
  "Mobile push-notification device tokens (FCM / APNs) and marketing or alert preferences",
  "Saved watchlists, app preferences, and unsubmitted KYC draft data",
  "Direct profile identifiers on the active login directory",
];

const statutoryRetained = [
  "Executed securities contract notes, order ledgers, and CSD settlement records",
  "Wallet deposit, withdrawal, and payment reconciliation records",
  "Identity verification (KYC/AML) and Central Securities Depository (CSD) audit logs as mandated by the Securities and Exchange Commission (SEC) of Ghana, Bank of Ghana (BoG), and the Anti-Money Laundering Act, 2020 (Act 1044) for the statutory minimum retention period (at least 6 years following account closure)",
];

export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Constant Capital
        </Link>

        <div className="mb-10">
          <div className="mb-3 flex items-center gap-2.5">
            <UserX className="h-5 w-5 text-brand-bronze" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand-bronze">
              Account &amp; Data Management
            </span>
          </div>
          <h1 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">
            Account &amp; Data Deletion
          </h1>
          <p className="mt-3 text-muted-foreground">
            Applies to the <strong>Constant Capital</strong> (Constant Trade) mobile
            application and web platform operated by{" "}
            <strong>Constant Capital (Ghana) Limited</strong>.
          </p>
        </div>

        {/* Option A: In-App Self-Service Deletion */}
        <section className="mb-10 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2.5">
            <Smartphone className="h-5 w-5 text-brand-orange" />
            <h2 className="text-lg font-bold text-card-foreground">
              Method 1: Instant In-App Account Deletion (Recommended)
            </h2>
          </div>
          <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
            You can permanently close your account directly inside the Constant Capital
            iOS or Android app at any time:
          </p>
          <div className="space-y-4">
            {steps.map((item) => (
              <div
                key={item.step}
                className="flex items-start gap-3.5 rounded-xl border border-border/60 bg-muted/20 p-4"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-navy font-mono text-xs font-bold text-white">
                  {item.step}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Option B: Web / Email Request (without logging into the app) */}
        <section className="mb-10 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2.5">
            <Mail className="h-5 w-5 text-brand-bronze" />
            <h2 className="text-lg font-bold text-card-foreground">
              Method 2: Request Deletion via Web / Support
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            If you have uninstalled the mobile app or cannot sign in, you may submit a
            verified account closure request by emailing our Compliance &amp; Client
            Services Desk at{" "}
            <a
              href="mailto:support@constantcap.com.gh?subject=Account%20Deletion%20Request%20%E2%80%94%20Constant%20Capital"
              className="font-semibold text-brand-orange underline"
            >
              support@constantcap.com.gh
            </a>{" "}
            from your registered email address with the subject line{" "}
            <span className="font-mono text-xs font-semibold text-foreground">
              &quot;Account Deletion Request&quot;
            </span>
            . Validated requests are processed within 2 business days.
          </p>
        </section>

        {/* Data Deleted vs Retained */}
        <div className="grid gap-6 sm:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <h2 className="text-base font-bold text-card-foreground">
                Data Deleted Immediately
              </h2>
            </div>
            <ul className="list-disc space-y-2 pl-5 text-xs leading-relaxed text-muted-foreground">
              {immediatelyDeleted.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-bronze" />
              <h2 className="text-base font-bold text-card-foreground">
                Statutory Regulatory Retention
              </h2>
            </div>
            <ul className="list-disc space-y-2 pl-5 text-xs leading-relaxed text-muted-foreground">
              {statutoryRetained.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-6 border-t border-border pt-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-navy text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">
                SEC-Regulated Broker-Dealer
              </p>
              <p className="text-xs text-muted-foreground">
                Constant Capital (Ghana) Limited · Heritage Tower, Ridge, Accra
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/legal/privacy"
              className="text-sm font-semibold text-brand-bronze hover:underline"
            >
              Privacy Policy
            </Link>
            <Link
              href="/legal/terms"
              className="text-sm font-semibold text-brand-bronze hover:underline"
            >
              Terms of Service →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

