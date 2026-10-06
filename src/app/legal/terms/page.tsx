import Link from "next/link";
import { Scale, ShieldCheck, ArrowLeft } from "lucide-react";

export const metadata = { title: "Terms of Service — Constant Capital" };

const sections = [
  {
    title: "1. The Constant Trade Service",
    body: "Constant Trade is operated by Constant Capital (Ghana) Limited, a licensed broker-dealer regulated by the Securities and Exchange Commission (SEC) of Ghana. By creating an account you enter into a binding client agreement governed by the laws of the Republic of Ghana. The platform provides access to equities listed on the Ghana Stock Exchange (GSE) and Government of Ghana fixed-income securities.",
  },
  {
    title: "2. Investment Risk Disclosure",
    body: "All investments carry risk. The value of securities may rise or fall, and past performance is not a reliable indicator of future results. Equities are subject to market volatility; fixed-income instruments carry interest-rate, inflation, and issuer risk. You should only invest funds you can afford to commit for your chosen investment horizon. Market prices and analytics shown on the platform are for information only and do not constitute investment advice.",
  },
  {
    title: "3. Account Opening, KYC & AML",
    body: "In accordance with the Anti-Money Laundering Act, 2020 (Act 1044) and SEC-Ghana regulations, all customers must complete Know Your Customer (KYC) verification before trading. You agree to provide accurate, complete and current identity information, and to notify us of changes. Accounts may be restricted or closed where verification cannot be completed or maintained.",
  },
  {
    title: "4. Orders & Settlement",
    body: "Orders placed through the platform are executed on a best-efforts basis subject to market liquidity, exchange rules, and available cash or holdings in your account. Settlement follows the standard GSE settlement cycle. Bids submitted for Government of Ghana primary auctions are binding; successful allocations are determined by the Bank of Ghana's competitive bidding process and must be settled on the specified settlement date.",
  },
  {
    title: "5. CSD & Securities Accounts",
    body: "Securities you purchase are held in your name at the Central Securities Depository (CSD). Where you already hold a CSD account, you may provide its number during onboarding; otherwise we will open one on your behalf. You are responsible for the accuracy of the CSD details you supply.",
  },
  {
    title: "6. Fees & Charges",
    body: "Brokerage commissions, exchange levies, CSD charges and statutory fees apply to each transaction and are disclosed on the order ticket before you confirm. We may update our fee schedule with prior notice through the platform or by email.",
  },
  {
    title: "7. Electronic Signature & Communications",
    body: "Signatures drawn or uploaded within the platform constitute legally binding electronic signatures under the Electronic Transactions Act, 2008 (Act 772), and may be applied to account-opening and depository forms generated on your behalf. You consent to receiving statements, contract notes and regulatory communications electronically.",
  },
  {
    title: "8. Acceptable Use & Security",
    body: "You must keep your credentials and one-time PINs confidential and notify us immediately of any unauthorised access. We may suspend accounts exhibiting fraudulent, abusive or unlawful activity. The platform may not be used for market manipulation, money laundering or any purpose prohibited by Ghanaian law.",
  },
  {
    title: "9. Limitation of Liability",
    body: "Constant Capital shall not be liable for indirect, incidental or consequential damages arising from use of, or inability to use, the platform, including investment losses, market volatility, exchange outages, or third-party data feed interruptions.",
  },
  {
    title: "10. Contact",
    body: "Questions about these terms may be directed to our client services team via the Support section of the app, or by email at support@constantcap.com.gh.",
  },
];

export default function TermsOfServicePage() {
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
            <Scale className="h-5 w-5 text-brand-bronze" />
            <span className="text-xs font-bold uppercase tracking-widest text-brand-bronze">
              Legal
            </span>
          </div>
          <h1 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-3 text-muted-foreground">
            Last updated October 2026. These terms govern your use of the
            Constant Trade platform for Ghana equities and fixed income.
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="mb-2 text-lg font-bold text-card-foreground">
                {s.title}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {s.body}
              </p>
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
            href="/legal/privacy"
            className="text-sm font-semibold text-brand-bronze hover:underline"
          >
            Read our Privacy Policy →
          </Link>
        </div>
      </div>
    </main>
  );
}
