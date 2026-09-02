import {
  ArrowLeftRight,
  Briefcase,
  CandlestickChart,
  FileSearch,
  LineChart,
  Users,
} from "lucide-react";

const SERVICES = [
  {
    icon: CandlestickChart,
    title: "Securities Trading",
    body: "Access to the Ghana Stock Exchange and other African markets with competitive commission rates for institutional, corporate and retail clients.",
  },
  {
    icon: LineChart,
    title: "Fixed Income & Treasury",
    body: "Invest in Ghanaian treasury bills and government bonds with live yields, maturity planning and reinvestment guidance.",
  },
  {
    icon: ArrowLeftRight,
    title: "FX Trading",
    body: "Licensed foreign exchange services with competitive rates, institutional trading and hedging solutions for businesses and institutions.",
  },
  {
    icon: FileSearch,
    title: "Investment Research",
    body: "Comprehensive market intelligence and analysis covering Ghana, West African markets and emerging African investment opportunities.",
  },
  {
    icon: Briefcase,
    title: "Financings & Capital Markets",
    body: "International capital raising through debt and equity offerings, connecting African companies with global investors.",
  },
  {
    icon: Users,
    title: "Investment Advisory",
    body: "Tailored investment strategies and portfolio management for institutions, family offices and high-net-worth clients.",
  },
];

export function Services() {
  return (
    <section id="services" className="bg-gradient-subtle py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-bronze">
            What we do
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-brand-navy dark:text-white sm:text-4xl">
            Delivering for Our{" "}
            <span className="text-gradient-brand">Global Clients</span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Connecting African opportunities with international capital through expert financial
            services and deep market knowledge.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <div
              key={s.title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-glow"
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-bronze/10 transition-transform duration-500 group-hover:scale-[2.2]" />
              <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-glow">
                <s.icon className="h-5 w-5" />
              </span>
              <h3 className="relative mt-5 font-display text-lg font-bold text-card-foreground">
                {s.title}
              </h3>
              <p className="relative mt-2.5 text-sm leading-relaxed text-muted-foreground">
                {s.body}
              </p>
              <p className="relative mt-4 text-xs font-semibold uppercase tracking-wider text-brand-bronze opacity-0 transition-opacity group-hover:opacity-100">
                Learn more
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
