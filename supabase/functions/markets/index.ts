export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// Full-privilege client (bypasses RLS). Used for all data ops inside functions.
export const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export interface CcUser {
  id: string;
  email?: string;
}

/**
 * Resolve the caller from the Authorization header (the session JWT sent
 * automatically by supabase.functions.invoke). Returns null when unauthenticated.
 */
export async function getUserFromAuth(req: Request): Promise<CcUser | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email };
}

export interface ProfileRow {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  kyc_status: string;
  csd_account: string | null;
  onboarded: boolean;
  created_at: string;
}

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await serviceClient
    .schema("cc")
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return null;
  return (data as ProfileRow) ?? null;
}

export const STAFF_ROLES = ["admin", "compliance", "trader"] as const;
export const ADMIN_ROLES = ["admin", "compliance"] as const;

export function isStaff(role: string): boolean {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

export function isAdminRole(role: string): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

// ============================================================
// DEMO market data for Constant Capital.
// Deterministic per-day variation so the UI feels alive without
// a real feed. The backend team will replace these mocks with
// calls to the real Constant Capital trading API.
// ============================================================

export interface MockInstrument {
  ticker: string;
  name: string;
  assetClass: "equity" | "fixed_income";
  currency: string;
  sector?: string;
  marketCap?: number;
  coupon?: number;
  maturity?: string;
  yieldToMaturity?: number;
  minInvestment?: number;
}

interface EquitySpec extends MockInstrument {
  basePrice: number;
  sector: string;
  marketCap: number;
}

interface FISpec extends MockInstrument {
  basePrice: number;
  coupon: number;
  maturity: string;
  yieldToMaturity: number;
  minInvestment: number;
}

const EQUITIES: EquitySpec[] = [
  { ticker: "MTNGH", name: "MTN Ghana", assetClass: "equity", currency: "GHS", basePrice: 2.38, sector: "Telecommunications", marketCap: 30_200_000_000 },
  { ticker: "SCB", name: "Standard Chartered Bank GH", assetClass: "equity", currency: "GHS", basePrice: 27.0, sector: "Banking", marketCap: 3_640_000_000 },
  { ticker: "BOPP", name: "Benso Oil Palm Plantation", assetClass: "equity", currency: "GHS", basePrice: 22.0, sector: "Agriculture", marketCap: 770_000_000 },
  { ticker: "TOTAL", name: "TotalEnergies Marketing GH", assetClass: "equity", currency: "GHS", basePrice: 16.7, sector: "Energy", marketCap: 2_820_000_000 },
  { ticker: "UNIL", name: "Unilever Ghana", assetClass: "equity", currency: "GHS", basePrice: 12.85, sector: "Consumer Staples", marketCap: 820_000_000 },
  { ticker: "ACCESS", name: "Access Bank Ghana", assetClass: "equity", currency: "GHS", basePrice: 8.2, sector: "Banking", marketCap: 2_950_000_000 },
  { ticker: "EGH", name: "Ecobank Ghana", assetClass: "equity", currency: "GHS", basePrice: 6.85, sector: "Banking", marketCap: 1_870_000_000 },
  { ticker: "GCB", name: "GCB Bank", assetClass: "equity", currency: "GHS", basePrice: 5.6, sector: "Banking", marketCap: 1_510_000_000 },
  { ticker: "EBG", name: "Enterprise Group", assetClass: "equity", currency: "GHS", basePrice: 5.45, sector: "Insurance", marketCap: 690_000_000 },
  { ticker: "GGBL", name: "Guinness Ghana Breweries", assetClass: "equity", currency: "GHS", basePrice: 4.32, sector: "Consumer Staples", marketCap: 940_000_000 },
  { ticker: "FML", name: "Fan Milk", assetClass: "equity", currency: "GHS", basePrice: 4.08, sector: "Consumer Staples", marketCap: 310_000_000 },
  { ticker: "GOIL", name: "GOIL", assetClass: "equity", currency: "GHS", basePrice: 2.05, sector: "Energy", marketCap: 780_000_000 },
  { ticker: "SOGEGH", name: "Société Générale Ghana", assetClass: "equity", currency: "GHS", basePrice: 1.9, sector: "Banking", marketCap: 760_000_000 },
  { ticker: "ARRB", name: "ARB Apex Bank", assetClass: "equity", currency: "GHS", basePrice: 0.5, sector: "Financials", marketCap: 310_000_000 },
  { ticker: "CAL", name: "CalBank", assetClass: "equity", currency: "GHS", basePrice: 0.36, sector: "Banking", marketCap: 880_000_000 },
  { ticker: "CPC", name: "Cocoa Processing Company", assetClass: "equity", currency: "GHS", basePrice: 0.06, sector: "Agriculture", marketCap: 240_000_000 },
];

const FIXED_INCOME: FISpec[] = [
  { ticker: "TB91", name: "91-Day Treasury Bill", assetClass: "fixed_income", currency: "GHS", basePrice: 100, coupon: 0, maturity: "2026-11-20", yieldToMaturity: 25.94, minInvestment: 1000 },
  { ticker: "TB182", name: "182-Day Treasury Bill", assetClass: "fixed_income", currency: "GHS", basePrice: 100, coupon: 0, maturity: "2027-02-19", yieldToMaturity: 27.45, minInvestment: 1000 },
  { ticker: "TB364", name: "364-Day Treasury Bill", assetClass: "fixed_income", currency: "GHS", basePrice: 100, coupon: 0, maturity: "2027-08-20", yieldToMaturity: 29.3, minInvestment: 1000 },
  { ticker: "GOG2029", name: "Ghana Government Bond 2029", assetClass: "fixed_income", currency: "GHS", basePrice: 100, coupon: 8.35, maturity: "2029-01-26", yieldToMaturity: 21.4, minInvestment: 5000 },
  { ticker: "GOG2032", name: "Ghana Government Bond 2032", assetClass: "fixed_income", currency: "GHS", basePrice: 100, coupon: 9.25, maturity: "2032-01-26", yieldToMaturity: 22.5, minInvestment: 5000 },
  { ticker: "GHSEB2029", name: "Ghana Eurobond 2029", assetClass: "fixed_income", currency: "USD", basePrice: 100, coupon: 8.45, maturity: "2029-07-01", yieldToMaturity: 12.8, minInvestment: 10000 },
  { ticker: "GHSEB2032", name: "Ghana Eurobond 2032", assetClass: "fixed_income", currency: "USD", basePrice: 100, coupon: 7.75, maturity: "2032-07-01", yieldToMaturity: 13.9, minInvestment: 10000 },
];

function fnv(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededUnit(seed: string): number {
  return (fnv(seed) % 100000) / 100000;
}

function daySeed(ticker: string): string {
  return ticker + ":" + new Date().toISOString().slice(0, 10);
}

export function dailyChangePct(ticker: string): number {
  const r = seededUnit(daySeed(ticker));
  return Math.round((r * 10 - 5) * 100) / 100;
}

export function livePrice(ticker: string, basePrice: number): number {
  const pct = dailyChangePct(ticker);
  const price = basePrice * (1 + pct / 100);
  return Math.round(price * 10000) / 10000;
}

function clampChange(pct: number, maxAbs = 5): number {
  return Math.max(-maxAbs, Math.min(maxAbs, pct));
}

export function getInstrument(ticker: string): MockInstrument | null {
  const eq = EQUITIES.find((i) => i.ticker === ticker);
  if (eq) return eq;
  return FIXED_INCOME.find((i) => i.ticker === ticker) ?? null;
}

export interface Quote {
  ticker: string;
  name: string;
  assetClass: "equity" | "fixed_income";
  currency: string;
  price: number;
  changePct: number;
  volume: number;
  marketCap?: number;
  sector?: string;
  coupon?: number;
  maturity?: string;
  yieldToMaturity?: number;
  minInvestment?: number;
}

function toQuote(spec: EquitySpec | FISpec): Quote {
  const q: Quote = {
    ticker: spec.ticker,
    name: spec.name,
    assetClass: spec.assetClass,
    currency: spec.currency,
    price: livePrice(spec.ticker, spec.basePrice),
    changePct: dailyChangePct(spec.ticker),
    volume: spec.assetClass === "equity"
      ? Math.round((seededUnit(spec.ticker + "vol") * 1_500_000 + 20_000) / 100) * 100
      : Math.round(seededUnit(spec.ticker + "vol") * 8_000_000 + 500_000),
  };
  if (spec.assetClass === "equity") {
    q.sector = spec.sector;
    q.marketCap = spec.marketCap;
  } else {
    q.coupon = spec.coupon;
    q.maturity = spec.maturity;
    q.yieldToMaturity = spec.yieldToMaturity;
    q.minInvestment = spec.minInvestment;
  }
  return q;
}

export function listInstruments(assetClass?: string): Quote[] {
  const all: (EquitySpec | FISpec)[] = assetClass === "equity"
    ? EQUITIES
    : assetClass === "fixed_income"
    ? FIXED_INCOME
    : [...EQUITIES, ...FIXED_INCOME];
  return all.map(toQuote);
}

export function getQuote(ticker: string): Quote | null {
  const spec = getInstrument(ticker);
  if (!spec) return null;
  return toQuote(spec);
}

export interface MarketSummary {
  gseComposite: number;
  gseChangePct: number;
  usdGhs: number;
  usdGhsChangePct: number;
  ghsMarketCap: number;
  dailyTurnover: number;
  tbill91: number;
  tbill91ChangePct: number;
  eurobond2029: number;
  eurobond2029ChangePct: number;
  activeStocks: number;
  advancers: number;
  decliners: number;
  updatedAt: string;
}

export function getSummary(): MarketSummary {
  const gseChange = clampChange(dailyChangePct("GSE-CI"), 2.5);
  return {
    gseComposite: Math.round(4398.77 * (1 + gseChange / 100) * 100) / 100,
    gseChangePct: gseChange,
    usdGhs: Math.round(12.07 * (1 + clampChange(dailyChangePct("USDGHS"), 1.5) / 100) * 10000) / 10000,
    usdGhsChangePct: clampChange(dailyChangePct("USDGHS"), 1.5),
    ghsMarketCap: 94_200_000_000,
    dailyTurnover: 22_400_000,
    tbill91: 25.94 + clampChange(dailyChangePct("TB91"), 0.5),
    tbill91ChangePct: clampChange(dailyChangePct("TB91"), 0.5),
    eurobond2029: 8.45 + clampChange(dailyChangePct("GHSEB2029"), 0.4),
    eurobond2029ChangePct: clampChange(dailyChangePct("GHSEB2029"), 0.4),
    activeStocks: 16,
    advancers: 7,
    decliners: 9,
    updatedAt: new Date().toISOString(),
  };
}

export interface FeedItem extends Quote {
  spark: number[];
}

export function getFeed(limit = 8): FeedItem[] {
  const quotes = [...EQUITIES.map(toQuote), ...FIXED_INCOME.map(toQuote)];
  return quotes
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, limit)
    .map((q) => ({ ...q, spark: getSparkline(q.ticker, 12) }));
}

export function getSparkline(ticker: string, points = 30): number[] {
  const spec = getInstrument(ticker);
  if (!spec) return [];
  const base = livePrice(ticker, spec.basePrice);
  const out: number[] = [];
  const period = Math.max(points / 2.2, 3);
  for (let i = 0; i < points; i++) {
    const wave = Math.sin((i / period) * Math.PI) * 0.055;
    const noise = (seededUnit(ticker + "w" + i) - 0.5) * 0.028;
    out.push(Math.round(base * (1 + wave + noise) * 10000) / 10000);
  }
  return out;
}

// ============================================================
// Market Performance — multi-series time series for the chart
// module (GSE Composite, Equities, Fixed Income Yields,
// SSA Eurobonds, Foreign Exchange).
// ============================================================

export interface PerformanceSeries {
  label: string;
  color: string;
  points: number[];
}

function seriesFor(
  seedKey: string,
  endValue: number,
  points: number,
  volatility: number,
): number[] {
  // Generate backwards from the current value so the series always
  // terminates at the latest quote, then reverse it for display.
  const out: number[] = [];
  let v = endValue;
  for (let i = 0; i < points; i++) {
    out.unshift(Math.round(v * 10000) / 10000);
    const step = (seededUnit(seedKey + ":" + i) - 0.5) * 2 * volatility;
    v = v / (1 + step);
  }
  return out;
}

const PALETTE = [
  "#E06A24", // bronze
  "#0B5D8A", // deep teal-blue
  "#7C5BD5", // slate violet
  "#F59E0B", // amber
  "#E5484D", // crimson
  "#0E9F8A", // teal green
];

export function getPerformance(points = 30): {
  updatedAt: string;
  labels: string[];
  series: Record<string, PerformanceSeries[]>;
} {
  const labels: string[] = [];
  const today = new Date();
  for (let i = points - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    labels.push(
      d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    );
  }

  return {
    updatedAt: new Date().toISOString(),
    labels,
    series: {
      gse: [
        { label: "GSE Composite Index", color: PALETTE[0], points: seriesFor("perf-gse", 4398.77, points, 0.006) },
      ],
      equities: [
        { label: "MTN Ghana", color: PALETTE[1], points: seriesFor("perf-mtng", livePrice("MTNGH", 2.38), points, 0.016) },
        { label: "Standard Chartered", color: PALETTE[2], points: seriesFor("perf-scb", livePrice("SCB", 27), points, 0.014) },
        { label: "Ecobank Ghana", color: PALETTE[3], points: seriesFor("perf-eghe", livePrice("EGH", 6.85), points, 0.018) },
        { label: "GCB Bank", color: PALETTE[4], points: seriesFor("perf-gcb", livePrice("GCB", 5.6), points, 0.016) },
        { label: "TotalEnergies Ghana", color: PALETTE[5], points: seriesFor("perf-tot", livePrice("TOTAL", 16.7), points, 0.017) },
      ],
      fixed: [
        { label: "91-Day T-Bill", color: PALETTE[3], points: seriesFor("perf-tb91", 25.94, points, 0.004) },
        { label: "182-Day T-Bill", color: PALETTE[1], points: seriesFor("perf-tb182", 27.45, points, 0.004) },
        { label: "364-Day Note", color: PALETTE[0], points: seriesFor("perf-tb364", 29.3, points, 0.005) },
      ],
      eurobonds: [
        { label: "Ghana 2029", color: PALETTE[0], points: seriesFor("perf-gh2029", 8.45, points, 0.012) },
        { label: "Nigeria 2031", color: PALETTE[5], points: seriesFor("perf-ng2031", 9.85, points, 0.012) },
        { label: "Kenya 2032", color: PALETTE[3], points: seriesFor("perf-ke2032", 10.2, points, 0.013) },
        { label: "Côte d'Ivoire 2032", color: PALETTE[2], points: seriesFor("perf-ci2032", 8.0, points, 0.011) },
      ],
      fx: [
        { label: "USD/GHS", color: PALETTE[0], points: seriesFor("perf-usdghs", 12.07, points, 0.004) },
        { label: "GBP/GHS", color: PALETTE[2], points: seriesFor("perf-gbpghs", 15.62, points, 0.005) },
        { label: "EUR/GHS", color: PALETTE[1], points: seriesFor("perf-eurghs", 13.18, points, 0.005) },
        { label: "CNY/GHS", color: PALETTE[4], points: seriesFor("perf-cnyghs", 1.69, points, 0.005) },
      ],
    },
  };
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Public read-only market data: resolve the caller for logging but allow
    // anonymous visitors so the marketing site can render live feeds.
    await getUserFromAuth(req).catch(() => null);

    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "summary";

    switch (action) {
      case "summary":
        return json(getSummary());

      case "instruments": {
        const assetClass = typeof body.assetClass === "string"
          ? body.assetClass
          : undefined;
        return json({ instruments: listInstruments(assetClass) });
      }

      case "quotes": {
        const ticker = body.ticker as string | undefined;
        if (!ticker) return json({ error: "ticker is required" }, 400);
        const quote = getQuote(ticker.toUpperCase());
        if (!quote) return json({ error: "Unknown instrument" }, 404);
        return json({ quote });
      }

      case "sparkline": {
        const ticker = body.ticker as string | undefined;
        if (!ticker) return json({ error: "ticker is required" }, 400);
        return json({ points: getSparkline(ticker, body.points ?? 30) });
      }

      case "feed":
        return json({ feed: getFeed(body.limit ?? 8) });

      case "performance":
        return json(getPerformance(body.points ?? 30));

      default:
        return json({ error: "Unknown action: " + action }, 400);
    }
  } catch (e) {
    console.error("markets error", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});
