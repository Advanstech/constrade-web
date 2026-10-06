import Link from "next/link";
import { Lock, ShieldCheck, ArrowLeft } from "lucide-react";

export const metadata = { title: "Privacy Policy — Constant Capital" };

const sections = [
  {
    title: "1. Information We Collect",
    intro: "To provide brokerage services we collect:",
    items: [
      "Identity and KYC documentation (Ghana Card, TIN, proof of address, photograph and signature)",
      "Financial profile, employment details and source-of-funds declarations",
      "CSD Ghana account details and bank account details for settlement",
      "Transaction, order and portfolio history",
      "Technical data (device identifiers, push-notification tokens, log data) for security and fraud prevention",
    ],
  },
  {
    title: "2. How We Use Your Information",
    intro: "Your data is used exclusively to:",
    items: [
      "Open and operate your brokerage and CSD securities accounts",
      "Verify your identity in line with Ghanaian AML/KYC regulations",
      "Execute and settle securities transactions on your behalf",
      "Send account statements, contract notes and service notifications",
      "Report required transaction data to the SEC, Bank of Ghana and the Ghana Stock Exchange",
      "Detect and prevent fraud and unauthorised access",
    ],
  },
  {
    title: "3. Sharing of Information",
    body: "We share your information only with the parties required to operate your account: the Central Securities Depository, the Ghana Stock Exchange, our regulators (SEC Ghana and, for fixed-income auctions, the Bank of Ghana), your bank or mobile-money provider for payments, and service providers under data-processing agreements. We never sell your personal or financial data to third parties.",
  },
  {
    title: "4. Data Security & Storage",
    body: "We employ encryption in transit and at rest for personal data. Identity documents, signatures and photographs are stored in access-controlled private storage and shared only as described above. Access is restricted to authorised compliance staff on a strict need-to-know basis, and administrative actions are audit-logged.",
  },
  {
    title: "5. Cookies & Local Storage",
    body: "The platform uses essential browser storage to maintain your secure login session and preferences. We do not use third-party advertising trackers or marketing pixels on the authenticated application. On mobile, push-notification tokens are stored to deliver order and account alerts; you can disable notifications in your device settings.",
  },
  {
    title: "6. Data Retention & Your Rights",
    body: "You have the right under the Data Protection Act, 2012 (Act 843) of Ghana to request a copy of the data we hold about you and to request correction of inaccuracies. For deletion requests, please note we are legally required to retain financial transaction and KYC records for the minimum period prescribed by Ghanaian securities law.",
  },
  {
    title: "7. Contact",
    body: "For privacy inquiries or data-access requests, contact our client services team via the Support section of the app or by email at support@constantcap.com.gh.",
  },
];

export default function PrivacyPolicyPage() {
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
            <Lock className="h-5 w-5 text-brand-bronze" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand-bronze">
              Data Protection
            </span>
          </div>
          <h1 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-muted-foreground">
            Last updated October 2026. Your information is protected under the
            Data Protection Act, 2012 (Act 843) of Ghana.
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="mb-2 text-lg font-bold text-card-foreground">
                {s.title}
              </h2>
              {s.intro && (
                <p className="mb-2 text-sm leading-relaxed text-muted-foreground">
                  {s.intro}
                </p>
              )}
              {s.items ? (
                <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                  {s.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              )}
            </section>
          ))}
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
                Constant Capital (Ghana) Limited
              </p>
            </div>
          </div>
          <Link
            href="/legal/terms"
            className="text-sm font-semibold text-brand-bronze hover:underline"
          >
            Read our Terms of Service →
          </Link>
        </div>
      </div>
    </main>
  );
}
