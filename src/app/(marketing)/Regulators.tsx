const REGULATORS = [
  { code: "SEC", name: "Securities & Exchange Commission" },
  { code: "GSE", name: "Ghana Stock Exchange" },
  { code: "CSD", name: "Central Securities Depository" },
  { code: "GSIA", name: "Ghana Securities Industry Association" },
];

export function Regulators() {
  return (
    <section id="regulators" className="bg-background py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-bronze">
            Our Regulators
          </p>
          <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            We Work With Industry Partners
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Constant Capital collaborates with Ghana&apos;s regulatory and industry bodies,
            ensuring compliance and the highest standards of financial services.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {REGULATORS.map((r) => (
            <div
              key={r.code}
              className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-8 text-center shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-bronze/40"
            >
              <span className="font-display text-2xl font-extrabold tracking-tight text-brand-bronze">
                {r.code}
              </span>
              <p className="mt-2 text-xs font-medium text-muted-foreground">{r.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
