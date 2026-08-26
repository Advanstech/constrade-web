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
  let v = base * (1 + (seededUnit(ticker + "s0") - 0.5) * 0.04);
  for (let i = 0; i < points; i++) {
    const drift = (seededUnit(ticker + "s" + i) - 0.5) * 0.018;
    v = v * (1 + drift);
    out.push(Math.round(v * 10000) / 10000);
  }
  return out;
}


export interface Position {
  instrument: string;
  name: string;
  assetClass: string;
  quantity: number;
  avgPrice: number;
  marketPrice: number;
  marketValue: number;
  cost: number;
  pl: number;
  plPct: number;
  dayChangePct: number;
}

interface OrderRow {
  id: string;
  user_id: string;
  instrument: string;
  name: string;
  asset_class: string;
  side: "buy" | "sell";
  order_type: string;
  quantity: number;
  price: number;
  status: string;
  filled_price: number | null;
  created_at: string;
}

/** Aggregate filled orders into per-instrument positions with P/L. */
export async function computePositions(userId: string): Promise<Position[]> {
  const { data, error } = await serviceClient
    .schema("cc")
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "filled");

  if (error) return [];

  const filled = (data as OrderRow[]) ?? [];
  const acc = new Map<string, { qty: number; cost: number }>();

  for (const o of filled) {
    const entry = acc.get(o.instrument) ?? { qty: 0, cost: 0 };
    const filledPrice = o.filled_price ?? o.price;
    if (o.side === "buy") {
      entry.qty += o.quantity;
      entry.cost += o.quantity * filledPrice;
    } else {
      const rem = entry.qty - o.quantity;
      if (rem <= 0) {
        entry.qty = 0;
        entry.cost = 0;
      } else {
        const avg = entry.cost / entry.qty;
        entry.cost = avg * rem;
        entry.qty = rem;
      }
    }
    acc.set(o.instrument, entry);
  }

  const positions: Position[] = [];
  for (const [instrument, a] of acc) {
    if (a.qty <= 0.000001) continue;
    const quote = getQuote(instrument);
    const avgPrice = a.qty > 0 ? a.cost / a.qty : 0;
    const marketPrice = quote?.price ?? avgPrice;
    const marketValue = a.qty * marketPrice;
    const pl = marketValue - a.cost;
    positions.push({
      instrument,
      name: quote?.name ?? instrument,
      assetClass: quote?.assetClass ?? "equity",
      quantity: Math.round(a.qty * 10000) / 10000,
      avgPrice: Math.round(avgPrice * 10000) / 10000,
      marketPrice,
      marketValue: Math.round(marketValue * 100) / 100,
      cost: Math.round(a.cost * 100) / 100,
      pl: Math.round(pl * 100) / 100,
      plPct: a.cost > 0 ? Math.round((pl / a.cost) * 10000) / 100 : 0,
      dayChangePct: quote?.changePct ?? 0,
    });
  }

  return positions;
}


const VALID_ROLES = ["client", "trader", "compliance", "admin"];

interface OrderRow {
  id: string;
  user_id: string;
  instrument: string;
  name: string;
  asset_class: string;
  side: "buy" | "sell";
  order_type: string;
  quantity: number;
  price: number;
  status: string;
  filled_price: number | null;
  created_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await getUserFromAuth(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const profile = await getProfile(user.id);
    // All staff (trader, compliance, admin) may view analytics, clients and
    // orders. Role changes and order fills stay admin/compliance only.
    if (!profile || !isStaff(profile.role)) {
      return json({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (["updateUserRole", "approveOrder", "rejectOrder"].includes(action) && !isAdminRole(profile.role)) {
      return json({ error: "Forbidden" }, 403);
    }

    switch (action) {
      case "metrics":
        return await metrics();
      case "users":
        return await users();
      case "updateUserRole":
        return await updateUserRole(body);
      case "orders":
        return await orders();
      case "approveOrder":
        return await approveOrder(body);
      case "rejectOrder":
        return await rejectOrder(body);
      default:
        return json({ error: "Unknown action: " + action }, 400);
    }
  } catch (e) {
    console.error("admin error", e);
    return json({ error: (e as Error).message ?? "Internal error" }, 500);
  }
});

async function metrics() {
  const [profiles, orders, balances] = await Promise.all([
    serviceClient.schema("cc").from("profiles").select("*"),
    serviceClient.schema("cc").from("orders").select("*"),
    serviceClient.schema("cc").from("balances").select("*"),
  ]);

  const profileRows = (profiles.data as ProfileRow[]) ?? [];
  const orderRows = (orders.data as OrderRow[]) ?? [];
  const balanceRows = (balances.data as { user_id: string; cash: number }[]) ?? [];

  const cashReserves = balanceRows.reduce((s, b) => s + Number(b.cash), 0);

  // AUM: cash + market value of all filled positions across clients
  let securitiesValue = 0;
  let filledValue = 0;
  const clientIds = profileRows.filter((p) => p.role === "client").map((p) => p.user_id);
  for (const uid of clientIds) {
    const positions = await computePositions(uid);
    securitiesValue += positions.reduce((s: number, p: Position) => s + p.marketValue, 0);
  }
  for (const o of orderRows) {
    if (o.status === "filled") filledValue += o.quantity * (o.filled_price ?? o.price);
  }
  // brokerage + levies ~1.15% of notional, demo revenue estimate
  const revenue = filledValue * 0.0115;

  const now = Date.now();
  const days = (d: string) => (now - new Date(d).getTime()) / 86_400_000;
  const newClients30d = profileRows.filter((p) => days(p.created_at) <= 30).length;

  // 12-month client growth series (mock)
  const monthLabels: string[] = [];
  const clientGrowth: number[] = [];
  const base = Math.max(profileRows.length - 14, 0);
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    monthLabels.push(d.toLocaleString("en-GB", { month: "short" }));
    clientGrowth.push(base + 14 - i + Math.round(Math.sin(i * 1.7) * 3));
  }
  clientGrowth[11] = profileRows.length;

  const instruments = listInstruments();
  const volumeByClass = [
    { name: "Equities", value: orderRows.filter((o) => o.asset_class === "equity" && o.status === "filled").length * 100 },
    { name: "Fixed Income", value: orderRows.filter((o) => o.asset_class === "fixed_income" && o.status === "filled").length * 100 },
  ];

  return json({
    metrics: {
      aum: Math.round((cashReserves + securitiesValue) * 100) / 100,
      cashReserves: Math.round(cashReserves * 100) / 100,
      totalClients: profileRows.length,
      newClients30d,
      totalOrders: orderRows.length,
      pendingApprovals: orderRows.filter((o) => o.status === "pending_approval").length,
      filledOrders: orderRows.filter((o) => o.status === "filled").length,
      revenue: Math.round(revenue * 100) / 100,
      turnover: Math.round(filledValue * 100) / 100,
    },
    market: getSummary(),
    chart: { clientGrowth, monthLabels, volumeByClass },
    latestOrders: orderRows.slice(0, 8).reverse(),
  });
}

async function users() {
  const [profiles, orderRes, balances] = await Promise.all([
    serviceClient.schema("cc").from("profiles").select("*"),
    serviceClient.schema("cc").from("orders").select("*"),
    serviceClient.schema("cc").from("balances").select("*"),
  ]);

  const profileRows = (profiles.data as ProfileRow[]) ?? [];
  const orderRows = (orderRes.data as OrderRow[]) ?? [];
  const balanceRows = (balances.data as { user_id: string; cash: number }[]) ?? [];

  const cashMap = new Map(balanceRows.map((b) => [b.user_id, Number(b.cash)]));
  const orderCountMap = new Map<string, number>();
  for (const o of orderRows) {
    orderCountMap.set(o.user_id, (orderCountMap.get(o.user_id) ?? 0) + 1);
  }

  return json({
    users: profileRows
      .map((p) => ({
        ...p,
        cash: cashMap.get(p.user_id) ?? 0,
        orderCount: orderCountMap.get(p.user_id) ?? 0,
      }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
  });
}

async function updateUserRole(body: Record<string, unknown>) {
  const userId = body.userId as string | undefined;
  const role = body.role as string | undefined;
  if (!userId || !VALID_ROLES.includes(role ?? "")) {
    return json({ error: "userId and a valid role are required" }, 400);
  }

  const { data, error } = await serviceClient
    .schema("cc")
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return json({ error: "Could not update role" }, 500);
  return json({ user: data });
}

async function orders() {
  const [orderRes, profileRes] = await Promise.all([
    serviceClient.schema("cc").from("orders").select("*").order("created_at", { ascending: false }).limit(200),
    serviceClient.schema("cc").from("profiles").select("*"),
  ]);

  const orderRows = (orderRes.data as OrderRow[]) ?? [];
  const profileRows = (profileRes.data as ProfileRow[]) ?? [];
  const nameMap = new Map(profileRows.map((p) => [p.user_id, p.full_name || p.email]));

  return json({
    orders: orderRows.map((o) => ({
      ...o,
      client: nameMap.get(o.user_id) ?? o.user_id,
    })),
  });
}

async function approveOrder(body: Record<string, unknown>) {
  const id = body.id as string | undefined;
  if (!id) return json({ error: "id is required" }, 400);

  const { data: orderRes } = await serviceClient
    .schema("cc")
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();
  const order = orderRes as OrderRow | null;
  if (!order) return json({ error: "Order not found" }, 404);
  if (order.status !== "pending_approval") {
    return json({ error: "Order is not pending approval" }, 400);
  }

  const filledPrice = order.price;
  const value = order.quantity * filledPrice;

  // adjust cash
  const { data: balRes } = await serviceClient
    .schema("cc")
    .from("balances")
    .select("cash")
    .eq("user_id", order.user_id)
    .maybeSingle();
  const current = balRes ? Number((balRes as { cash: number }).cash) : 0;
  const delta = order.side === "buy" ? -value : value;
  if (current + delta < 0) {
    return json({ error: "Insufficient cash for this order" }, 400);
  }

  await serviceClient
    .schema("cc")
    .from("balances")
    .upsert({ user_id: order.user_id, cash: current + delta, updated_at: new Date().toISOString() });

  await serviceClient.schema("cc").from("transactions").insert({
    user_id: order.user_id,
    type: order.side === "buy" ? "trade_buy" : "trade_sell",
    amount: order.side === "buy" ? -value : value,
    reference: "ORD-" + order.id.slice(0, 8),
    detail: order.name + " x" + order.quantity,
  });

  const { data, error } = await serviceClient
    .schema("cc")
    .from("orders")
    .update({ status: "filled", filled_price: filledPrice, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return json({ error: "Could not approve order" }, 500);
  return json({ order: data, message: "Order filled" });
}

async function rejectOrder(body: Record<string, unknown>) {
  const id = body.id as string | undefined;
  if (!id) return json({ error: "id is required" }, 400);

  const { data: orderRes } = await serviceClient
    .schema("cc")
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();
  const order = orderRes as OrderRow | null;
  if (!order) return json({ error: "Order not found" }, 404);
  if (order.status !== "pending_approval") {
    return json({ error: "Order is not pending approval" }, 400);
  }

  const { data, error } = await serviceClient
    .schema("cc")
    .from("orders")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return json({ error: "Could not reject order" }, 500);
  return json({ order: data, message: "Order rejected" });
}
