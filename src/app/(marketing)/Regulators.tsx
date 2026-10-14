const REGULATORS = [
  {
    code: "SEC",
    name: "Securities & Exchange Commission",
    role: "Broker-Dealer Licensing & Market Conduct Supervision",
  },
  {
    code: "GSE",
    name: "Ghana Stock Exchange",
    role: "Licensed Dealing Member — Secondary Equities Market",
  },
  {
    code: "GFIM",
    name: "Ghana Fixed Income Market",
    role: "Secondary Government & Corporate Debt Trading Venue",
  },
  {
    code: "CSD",
    name: "Central Securities Depository",
    role: "Depository Participant (CCL) — Custody & Settlement",
  },
  {
    code: "BoG",
    name: "Bank of Ghana",
    role: "Treasury Bill & Government Bond Tender Benchmarks",
  },
];

export function Regulators() {
  return (
    <section id="regulators" className="bg-background py-16 lg:py-24 border-t border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-bronze">
            Market Infrastructure &amp; Oversight
          </p>
          <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Built on Ghana&apos;s Regulated Capital Market Architecture
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Every order, custody account, and settlement instruction operates within the rules of
            Ghana&apos;s capital-market regulators, exchanges, and central depository.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {REGULATORS.map((r) => (
            <div
              key={r.code}
              className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-5 py-7 text-center shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brand-bronze/40"
            >
              <span className="font-display text-2xl font-extrabold tracking-tight text-brand-bronze">
                {r.code}
              </span>
              <p className="mt-2 text-xs font-bold text-foreground">{r.name}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{r.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
