/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ApiError,
  logoutRemote,
  refreshTokens,
  request,
  setTokens,
} from "./apiClient";
import type {
  AdminDashboardData,
  AdminOrder,
  AdminUser,
  FeedItem,
  KycProgress,
  MarketSummary,
  OnboardingResult,
  OnboardingStatus,
  Order,
  OrderStatus,
  KycStatus,
  PerformanceData,
  Portfolio,
  Position,
  Profile,
  Quote,
  Role,
  Side,
  OrderType,
  Transaction,
} from "./api.types";

async function call<T>(
  fn: "markets" | "trading" | "account" | "onboarding" | "admin",
  body: Record<string, unknown>,
): Promise<T> {
  const result = await dispatch(fn, body);
  if (result && typeof result === "object" && "error" in result) {
    throw new ApiError(String((result as { error: unknown }).error));
  }
  return result as T;
}

async function dispatch(fn: string, body: Record<string, unknown>): Promise<unknown> {
  switch (fn) {
    case "markets":
      return handleMarkets(body);
    case "trading":
      return handleTrading(body);
    case "account":
      return handleAccount(body);
    case "onboarding":
      return handleOnboarding(body);
    case "admin":
      return handleAdmin(body);
    default:
      throw new ApiError("Unknown backend function: " + fn);
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapKycStatus(status: string): KycStatus {
  const s = String(status).toLowerCase();
  if (s === "approved") return "approved";
  if (s === "rejected") return "rejected";
  if (s === "submitted") return "submitted";
  return "pending";
}

function mapRole(role: string): Role {
  const r = String(role).toLowerCase();
  if (r === "admin" || r === "super_admin") return "admin";
  if (r === "trader") return "trader";
  if (r === "compliance") return "compliance";
  return "client";
}

function mapOrderStatus(status: string): OrderStatus {
  const s = String(status).toLowerCase();
  if (s === "pending") return "pending_approval";
  if (s === "payment_confirmed") return "processing";
  if (s === "executed") return "filled";
  if (s === "cancelled") return "cancelled";
  if (s === "rejected") return "rejected";
  return "pending_approval";
}

function toProfile(raw: any): Profile {
  const first = raw.firstName ?? "";
  const last = raw.lastName ?? "";
  const full = `${first} ${last}`.trim();
  return {
    user_id: raw.id ?? "",
    full_name: full || raw.email || "",
    email: raw.email ?? "",
    phone: raw.phone ?? null,
    role: mapRole(raw.role ?? ""),
    kyc_status: mapKycStatus(raw.kycStatus ?? "PENDING"),
    csd_account: raw.csdAccount?.csdNumber ?? null,
    onboarded: raw.kycStatus === "APPROVED" || raw.onboardingStep === 4,
    created_at: raw.createdAt ?? new Date().toISOString(),
    updated_at: raw.updatedAt ?? new Date().toISOString(),
  };
}

function toAdminUser(raw: any): AdminUser {
  return { ...toProfile(raw), cash: 0, orderCount: 0 };
}

function toEquityQuote(raw: any): Quote {
  return {
    ticker: raw.ticker ?? raw.id,
    name: raw.name ?? raw.ticker ?? "",
    assetClass: "equity",
    currency: "GHS",
    price: Number(raw.price) || 0,
    changePct: 0,
    volume: Number(raw.volume) || 0,
    sector: raw.sector,
    marketCap: raw.marketCap,
  };
}

function toFixedIncomeQuote(raw: any): Quote {
  const isin = raw.isin ?? "";
  const name = raw.name ?? "Government Security";
  const ticker = isin || (raw.type ? `GOG-${raw.type}` : name);
  return {
    ticker,
    name,
    assetClass: "fixed_income",
    currency: "GHS",
    price: Number(raw.price) || 1,
    changePct: 0,
    volume: 0,
    coupon: raw.couponRate ?? raw.coupon,
    maturity: raw.maturityDate ? new Date(raw.maturityDate).toISOString().split("T")[0] : undefined,
    yieldToMaturity: raw.yield,
    minInvestment: raw.faceValue ?? 1,
  };
}

function toEquityOrder(raw: any): Order {
  const sec = raw.equitySecurity ?? {};
  return {
    id: raw.id ?? "",
    user_id: raw.userId ?? "",
    instrument: sec.ticker ?? raw.equitySecurityId ?? "",
    name: sec.name ?? raw.equitySecurityId ?? "",
    asset_class: "equity",
    side: String(raw.side).toLowerCase() as Side,
    order_type: String(raw.orderType).toLowerCase() as OrderType,
    quantity: Number(raw.quantity) || 0,
    price: Number(raw.price) || 0,
    status: mapOrderStatus(raw.status),
    filled_price: raw.filledPrice ?? (raw.status === "EXECUTED" ? Number(raw.price) : null),
    created_at: raw.createdAt ?? new Date().toISOString(),
    // result fields
    filledQty: raw.filledQty ?? null,
    settlementDate: raw.settlementDate ?? null,
    executionNote: raw.executionNote ?? null,
    traderNotes: raw.traderNotes ?? null,
    paymentConfirmedAt: raw.paymentConfirmedAt ?? null,
  } as any;
}

function toFixedIncomeOrder(raw: any): Order {
  const sec = raw.fixedIncomeSecurity ?? {};
  const isin = sec.isin ?? "";
  const name = sec.name ?? raw.fixedIncomeSecurityId ?? "Fixed Income";
  const instrument = isin || (sec.type ? `GOG-${sec.type}` : name) || raw.fixedIncomeSecurityId || "";
  return {
    id: raw.id ?? "",
    user_id: raw.userId ?? "",
    instrument,
    name,
    asset_class: "fixed_income",
    side: String(raw.side).toLowerCase() as Side,
    order_type: String(raw.orderType).toLowerCase() as OrderType,
    quantity: Number(raw.faceValue) || 0,
    price: Number(raw.price) || 0,
    status: mapOrderStatus(raw.status),
    filled_price: raw.filledPrice ?? (raw.status === "EXECUTED" ? Number(raw.price) : null),
    created_at: raw.createdAt ?? new Date().toISOString(),
    // result fields
    filledFaceValue: raw.filledFaceValue ?? null,
    settlementDate: raw.settlementDate ?? null,
    executionNote: raw.executionNote ?? null,
    traderNotes: raw.traderNotes ?? null,
    paymentConfirmedAt: raw.paymentConfirmedAt ?? null,
  } as any;
}

function toOrder(raw: any): Order {
  if (raw.equitySecurityId || raw.equitySecurity) return toEquityOrder(raw);
  return toFixedIncomeOrder(raw);
}

function toPosition(raw: any): Position {
  const quantity = Number(raw.quantity) || Number(raw.amount) || 0;
  const price = Number(raw.price) || Number(raw.rate) || (raw.amount && raw.quantity ? Number(raw.amount) / Number(raw.quantity) : 1);
  const marketValue = Number(raw.amount) || quantity * price || 0;
  return {
    instrument: raw.instrumentName ?? raw.bidId ?? raw.id ?? "",
    name: raw.instrumentName ?? raw.bidId ?? raw.id ?? "",
    assetClass: raw.assetClass === "equity" ? "equity" : "fixed_income",
    quantity,
    avgPrice: price,
    marketPrice: price,
    marketValue,
    cost: marketValue,
    pl: 0,
    plPct: 0,
    dayChangePct: 0,
  };
}

function toTransaction(raw: any): Transaction {
  const typeMap: Record<string, Transaction["type"]> = {
    DEPOSIT: "deposit",
    WITHDRAWAL: "withdraw",
    TRADE_DEBIT: "trade_buy",
    TRADE_CREDIT: "trade_sell",
  };
  return {
    id: raw.id ?? "",
    user_id: raw.wallet?.userId ?? raw.userId ?? "",
    type: typeMap[raw.type] ?? (raw.type as Transaction["type"]),
    amount: Math.abs(Number(raw.amount)) || 0,
    reference: raw.reference ?? null,
    detail: raw.description ?? null,
    created_at: raw.createdAt ?? new Date().toISOString(),
  };
}

function toOnboardingStatus(raw: any): OnboardingStatus {
  const individual = raw.individualProfile ?? {};
  const corporate = raw.corporateProfile ?? {};
  const first = individual.firstName ?? corporate.authorizedSignatoryFirstName ?? "";
  const last = individual.lastName ?? corporate.authorizedSignatoryLastName ?? "";
  const full = `${first} ${last}`.trim();
  return {
    status: mapKycStatus(raw.kycStatus ?? "PENDING"),
    onboarded: raw.kycStatus === "APPROVED",
    csdAccount: raw.csdAccount?.csdNumber ?? null,
    fullName: full,
    phone: raw.phone ?? null,
  };
}

function toKycProgress(raw: any): KycProgress {
  const step = Number(raw.onboardingStep ?? 0);
  return {
    completedSteps: Math.min(step * 2, 8),
    totalSteps: 8,
    status: raw.kycStatus === "APPROVED" ? "approved" : "in_progress",
    data: {
      individualProfile: raw.individualProfile ?? null,
      corporateProfile: raw.corporateProfile ?? null,
      employmentDetails: raw.employmentDetails ?? null,
      taxDetails: raw.taxDetails ?? null,
      financialInfo: raw.financialInfo ?? null,
      bankDetails: raw.bankDetails ?? null,
      csdAccount: raw.csdAccount ?? null,
    },
  };
}

async function saveOnboardingStep(step: number, data: Record<string, unknown>): Promise<void> {
  switch (step) {
    case 1: {
      const d = data as any;
      const type = String(d.category ?? "Individual").toLowerCase() === "individual" ? "INDIVIDUAL" : "CORPORATE";
      await request("PATCH", "/onboarding/type", { type });
      break;
    }
    case 2: {
      const d = data as any;
      await request("PATCH", "/onboarding/individual-profile", {
        dateOfBirth: d.dateOfBirth,
        nationality: d.countryOfOrigin ?? "Ghana",
        occupation: d.occupation ?? "",
        sourceOfFunds: d.profession ?? "",
        address: `${d.residentialStatus ?? ""} ${d.countryOfResidence ?? ""}`.trim() || "Ghana",
      });
      break;
    }
    case 3: {
      const d = data as any;
      if (d.mobile1 || d.email) {
        await request("PATCH", "/auth/me", { phone: d.mobile1 ?? d.email });
      }
      break;
    }
    case 4: {
      // document file references not persisted without actual file uploads
      break;
    }
    case 5: {
      const d = data as any;
      const e = (d.employer ?? {}) as any;
      await request("PATCH", "/onboarding/employment", {
        employmentStatus: d.employmentStatus ?? "",
        jobTitle: d.jobTitle ?? "",
        employerName: e.name ?? "",
        industry: e.natureOfBusiness ?? "",
        duration: d.yearsEmployed ?? "",
      });
      await request("PATCH", "/onboarding/tax", {
        tinNumber: d.tin ?? "",
        taxResidency: d.countryOfResidence ?? "Ghana",
      });
      break;
    }
    case 6: {
      const d = data as any;
      await request("PATCH", "/onboarding/financial", {
        annualIncome: d.monthlyIncomeRange ?? "",
        netWorth: d.initialInvestment ?? "",
        investmentObjectives: d.investmentObjectives ?? "",
      });
      // Also persist bank details if provided
      if (d.bankName || d.accountNumber) {
        await request("PATCH", "/onboarding/bank", {
          bankName: d.bankName ?? "",
          branch: d.branch ?? "",
          accountName: d.accountName ?? "",
          accountNumber: d.accountNumber ?? "",
        }).catch(() => {});
      }
      break;
    }
    case 7: {
      // declarations not mapped
      break;
    }
    default:
      throw new ApiError("Invalid onboarding step " + step);
  }
}

function generateSparkline(ticker: string, points = 30): number[] {
  const upper = ticker.toUpperCase();
  let base = 10.0;
  if (upper === "MTNGH") base = 2.45;
  else if (upper === "GCB") base = 5.20;
  else if (upper === "SCB") base = 21.50;
  else if (upper === "EGH") base = 7.15;
  else if (upper === "TOTAL") base = 12.80;
  else if (upper.includes("91D")) base = 28.88;
  else if (upper.includes("182D")) base = 30.12;
  else if (upper.includes("364D")) base = 31.50;

  const result: number[] = [];
  const seed = upper.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  for (let i = points - 1; i >= 0; i--) {
    const fraction = (points - 1 - i) / (points - 1);
    const sinOffset = Math.sin((fraction + seed) * Math.PI * 3) * 0.03;
    const drift = (fraction - 0.5) * 0.06;
    result.push(Number((base * (1 + drift + sinOffset)).toFixed(2)));
  }
  result[result.length - 1] = base;
  return result;
}

function generateDefaultPerformance(points = 30): PerformanceData["series"] {
  const gsePts: number[] = [];
  const mtnPts: number[] = [];
  const gcbPts: number[] = [];
  const scbPts: number[] = [];
  const tb91Pts: number[] = [];
  const tb182Pts: number[] = [];
  const ebPts: number[] = [];
  const usdPts: number[] = [];

  for (let i = points - 1; i >= 0; i--) {
    const progress = (points - 1 - i) / (points - 1);
    const wave = Math.sin(progress * Math.PI * 2.5);
    gsePts.push(Number((4620 + progress * 240 + wave * 35).toFixed(2)));
    mtnPts.push(Number((2.15 + progress * 0.30 + wave * 0.04).toFixed(2)));
    gcbPts.push(Number((4.80 + progress * 0.40 + wave * 0.06).toFixed(2)));
    scbPts.push(Number((19.50 + progress * 2.00 + wave * 0.35).toFixed(2)));
    tb91Pts.push(Number((29.80 - progress * 1.30 - wave * 0.25).toFixed(2)));
    tb182Pts.push(Number((31.20 - progress * 1.40 - wave * 0.20).toFixed(2)));
    ebPts.push(Number((68.20 + progress * 7.60 + wave * 1.80).toFixed(2)));
    usdPts.push(Number((14.90 + progress * 0.52 + wave * 0.08).toFixed(4)));
  }

  return {
    gse: [{ label: "GSE Composite Index", color: "#F78218", points: gsePts }],
    equities: [
      { label: "MTN Ghana (MTNGH)", color: "#F78218", points: mtnPts },
      { label: "GCB Bank (GCB)", color: "#10B981", points: gcbPts },
      { label: "Standard Chartered (SCB)", color: "#3B82F6", points: scbPts },
    ],
    fixed: [
      { label: "91-Day T-Bill", color: "#F78218", points: tb91Pts },
      { label: "182-Day T-Bill", color: "#3B82F6", points: tb182Pts },
    ],
    eurobonds: [{ label: "Ghana 2029 (USD)", color: "#F78218", points: ebPts }],
    fx: [{ label: "USD / GHS", color: "#10B981", points: usdPts }],
  };
}

async function handleMarkets(body: Record<string, unknown>): Promise<unknown> {
  const action = String(body.action ?? "summary");
  switch (action) {
    case "summary": {
      const [intel, gse] = await Promise.all([
        request<any>("GET", "/market-data/intelligence").catch(() => null),
        request<any>("GET", "/market-data/gse").catch(() => null),
      ]);
      const yc = (intel?.yieldCurve ?? []) as any[];
      const find = (tenor: string) => yc.find((x: any) => x.tenor === tenor);
      const tb91 = find("91D") ?? { rate: 28.88, change: 0.03 };
      const eb = find("GOG2029") ?? find("10Y") ?? { rate: 8.45, change: -0.1 };

      const gseStocks = (gse?.stocks ?? gse?.data ?? []) as any[];
      const advancers = gseStocks.filter((s: any) => (s.change ?? s.changePct ?? 0) > 0).length || 7;
      const decliners = gseStocks.filter((s: any) => (s.change ?? s.changePct ?? 0) < 0).length || 9;
      const activeStocks = gseStocks.length || 16;

      return {
        gseComposite: gse?.compositeIndex ?? 4820.50,
        gseChangePct: gse?.changePct ?? 0.35,
        usdGhs: 15.42,
        usdGhsChangePct: -0.05,
        ghsMarketCap: 94_200_000_000,
        dailyTurnover: 22_400_000,
        tbill91: Number(tb91.rate),
        tbill91ChangePct: Number(tb91.change),
        eurobond2029: Number(eb.rate),
        eurobond2029ChangePct: Number(eb.change),
        activeStocks,
        advancers,
        decliners,
        updatedAt: intel?.lastUpdated ?? new Date().toISOString(),
      } as MarketSummary;
    }
    case "instruments": {
      const assetClass = body.assetClass as "equity" | "fixed_income" | undefined;
      const eq = assetClass !== "fixed_income" ? await request<any[]>("GET", "/equities/securities").catch(() => []) : [];
      const fi = assetClass !== "equity" ? await request<any[]>("GET", "/fixed-income/securities").catch(() => []) : [];
      const quotes: Quote[] = [...eq.map(toEquityQuote), ...fi.map(toFixedIncomeQuote)];
      return { instruments: quotes };
    }
    case "quotes": {
      const ticker = String(body.ticker ?? "");
      const isUuid = UUID_RE.test(ticker);
      if (isUuid) {
        const s = await request<any>("GET", `/fixed-income/securities/${ticker}`).catch(() => null);
        if (s) return { quote: toFixedIncomeQuote(s) };
      } else {
        const s = await request<any>("GET", `/equities/securities/${ticker}`).catch(() => null);
        if (s) return { quote: toEquityQuote(s) };
      }
      throw new ApiError("Unknown instrument: " + ticker);
    }
    case "sparkline": {
      const ticker = String(body.ticker ?? "");
      const points = Number(body.points ?? 30);
      try {
        const spark = await request<number[]>("GET", `/market-data/sparkline/${encodeURIComponent(ticker)}?points=${points}`);
        if (Array.isArray(spark) && spark.length > 0) return { points: spark };
      } catch {
        // Fallback
      }
      return { points: generateSparkline(ticker, points) };
    }
    case "feed": {
      const all = (await handleMarkets({ action: "instruments" })) as { instruments: Quote[] };
      const limit = Number(body.limit ?? 8);
      const feed = all.instruments
        .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
        .slice(0, limit)
        .map((q) => ({ ...q, spark: generateSparkline(q.ticker, 15) }));
      return { feed };
    }
    case "performance": {
      const points = Number(body.points ?? 30);
      const labels: string[] = [];
      const today = new Date();
      for (let i = points - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        labels.push(d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }));
      }

      try {
        const perf = await request<any>("GET", `/market-data/performance?points=${points}`);
        if (perf?.gse && perf?.equities) {
          const series: PerformanceData["series"] = {
            gse: [
              { label: "GSE Composite Index", color: "#F78218", points: perf.gse.map((p: any) => p.value) },
            ],
            equities: [
              { label: "MTN Ghana (MTNGH)", color: "#F78218", points: perf.equities.map((p: any) => p.value) },
              { label: "GCB Bank (GCB)", color: "#10B981", points: perf.equities.map((p: any) => Number((p.value * 0.45).toFixed(2))) },
              { label: "Standard Chartered (SCB)", color: "#3B82F6", points: perf.equities.map((p: any) => Number((p.value * 1.82).toFixed(2))) },
              { label: "Ecobank (EGH)", color: "#8B5CF6", points: perf.equities.map((p: any) => Number((p.value * 0.62).toFixed(2))) },
            ],
            fixed: [
              { label: "91-Day T-Bill", color: "#F78218", points: perf.fixed.map((p: any) => p.value) },
              { label: "182-Day T-Bill", color: "#3B82F6", points: perf.fixed.map((p: any) => Number((p.value + 1.25).toFixed(2))) },
              { label: "364-Day T-Bill", color: "#10B981", points: perf.fixed.map((p: any) => Number((p.value + 2.60).toFixed(2))) },
            ],
            eurobonds: [
              { label: "Ghana 2029 (USD)", color: "#F78218", points: perf.eurobonds.map((p: any) => p.value) },
              { label: "Ghana 2035 (USD)", color: "#3B82F6", points: perf.eurobonds.map((p: any) => Number((p.value - 4.5).toFixed(2))) },
            ],
            fx: [
              { label: "USD / GHS", color: "#10B981", points: perf.fx.map((p: any) => p.value) },
              { label: "EUR / GHS", color: "#3B82F6", points: perf.fx.map((p: any) => Number((p.value * 1.08).toFixed(4))) },
              { label: "GBP / GHS", color: "#F78218", points: perf.fx.map((p: any) => Number((p.value * 1.28).toFixed(4))) },
            ],
          };
          return { updatedAt: new Date().toISOString(), labels, series } as PerformanceData;
        }
      } catch {
        // Fallback to seeded math progression
      }

      return {
        updatedAt: new Date().toISOString(),
        labels,
        series: generateDefaultPerformance(points),
      } as PerformanceData;
    }
    default:
      throw new ApiError("Unknown markets action: " + action);
  }
}

async function handleTrading(body: Record<string, unknown>): Promise<unknown> {
  const action = String(body.action);
  switch (action) {
    case "placeOrder": {
      const instrument = String(body.instrument ?? "");
      const side = String(body.side).toUpperCase();
      const orderType = String(body.orderType).toUpperCase();
      const quantity = Number(body.quantity);
      const limitPrice =
        body.limitPrice === undefined || body.limitPrice === null || body.limitPrice === ""
          ? undefined
          : Number(body.limitPrice);
      if (!instrument || !side || !orderType || !Number.isFinite(quantity) || quantity <= 0) {
        throw new ApiError("Invalid order parameters");
      }
      const isUuid = UUID_RE.test(instrument);
      const isFixedIncome =
        isUuid ||
        instrument.startsWith("GHGGOG") ||
        instrument.startsWith("GOG-") ||
        instrument.toLowerCase().includes("bill") ||
        instrument.toLowerCase().includes("bond");

      if (isFixedIncome) {
        const dto = {
          fixedIncomeSecurityId: instrument,
          side,
          faceValue: quantity,
          price: orderType === "LIMIT" && limitPrice && limitPrice > 0 ? limitPrice : undefined,
          orderType,
          notes: "Web order",
        };
        const order = await request<any>("POST", "/fixed-income/orders", dto);
        return { order: toFixedIncomeOrder(order), message: "Order submitted" };
      } else {
        const sec = await request<any>("GET", `/equities/securities/${instrument}`).catch(() => null);
        if (!sec) {
          // Fallback check if it's fixed income by name/id
          const fiSec = await request<any>("GET", `/fixed-income/securities/${instrument}`).catch(() => null);
          if (fiSec) {
            const dto = {
              fixedIncomeSecurityId: fiSec.id,
              side,
              faceValue: quantity,
              price: orderType === "LIMIT" && limitPrice && limitPrice > 0 ? limitPrice : undefined,
              orderType,
              notes: "Web order",
            };
            const order = await request<any>("POST", "/fixed-income/orders", dto);
            return { order: toFixedIncomeOrder(order), message: "Order submitted" };
          }
          throw new ApiError("Unknown instrument: " + instrument);
        }
        const dto = {
          equitySecurityId: sec.id,
          side,
          quantity: Math.floor(quantity),
          price: orderType === "LIMIT" && limitPrice && limitPrice > 0 ? limitPrice : undefined,
          orderType,
          notes: "Web order",
        };
        const order = await request<any>("POST", "/equities/orders", dto);
        return { order: toEquityOrder(order), message: "Order submitted" };
      }
    }
    case "cancelOrder": {
      const id = String(body.id ?? "");
      const cancelled =
        (await request<any>("PATCH", `/equities/orders/${id}/cancel`).catch(() => null)) ??
        (await request<any>("PATCH", `/fixed-income/orders/${id}/cancel`).catch(() => null));
      if (!cancelled) throw new ApiError("Could not cancel order");
      return { order: toOrder(cancelled) };
    }
    case "myOrders": {
      const [eq, fi] = await Promise.all([
        request<any[]>("GET", "/equities/orders").catch(() => []),
        request<any[]>("GET", "/fixed-income/orders").catch(() => []),
      ]);
      const orders: Order[] = [...eq.map(toEquityOrder), ...fi.map(toFixedIncomeOrder)].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      return { orders };
    }
    case "positions": {
      const holdings = await request<any[]>("GET", "/portfolio/holdings").catch(() => []);
      return { positions: holdings.map(toPosition) };
    }
    default:
      throw new ApiError("Unknown trading action: " + action);
  }
}

async function handleAccount(body: Record<string, unknown>): Promise<unknown> {
  const action = String(body.action);
  switch (action) {
    case "portfolio": {
      const [summary, balance, holdings] = await Promise.all([
        request<any>("GET", "/portfolio/summary").catch(() => null),
        request<any>("GET", "/wallet/balance").catch(() => null),
        request<any[]>("GET", "/portfolio/holdings").catch(() => []),
      ]);
      const cash = balance?.balance ?? 0;
      const securitiesValue = summary?.totalPortfolioValue ?? 0;
      const totalValue = cash + securitiesValue;
      const totalPl = summary?.unrealizedInterest ?? 0;
      const totalPlPct = summary?.averageYield ?? 0;
      const allocation = (summary?.allocation ?? []).map((a: any) => ({
        label: a.label ?? a.securityType ?? "Other",
        value: Number(a.value) || 0,
        color: a.color ?? "",
      }));
      const portfolio: Portfolio = {
        cash,
        securitiesValue,
        totalValue,
        totalPl,
        totalPlPct,
        dayPl: 0,
        holdings: holdings.map(toPosition),
        allocation,
      };
      return portfolio;
    }
    case "profile": {
      const user = await request<any>("GET", "/auth/me");
      return { profile: toProfile(user) };
    }
    case "updateProfile": {
      const fullName = String(body.fullName ?? "");
      const names = fullName.split(" ");
      const firstName = names[0] ?? "";
      const lastName = names.slice(1).join(" ") || undefined;
      const patch: any = {};
      if (firstName) patch.firstName = firstName;
      if (lastName) patch.lastName = lastName;
      if (body.phone !== undefined) patch.phone = body.phone;
      const updated = await request<any>("PATCH", "/auth/me", patch);
      return { profile: toProfile(updated) };
    }
    case "transactions": {
      const rows = await request<any[]>("GET", "/wallet/transactions").catch(() => []);
      return { transactions: rows.map(toTransaction) };
    }
    case "fundingHistory": {
      const rows = await request<any[]>("GET", "/wallet/transactions").catch(() => []);
      const tx = rows.map(toTransaction).filter((t) => t.type === "deposit" || t.type === "withdraw");
      return { transactions: tx };
    }
    case "deposit": {
      const amount = Number(body.amount);
      const method = String(body.method ?? "Bank Transfer");
      const tx = await request<any>("POST", "/wallet/deposits/bank", {
        amount,
        bankName: method,
        accountNumber: "Primary Investor Account",
        depositorName: "Investor",
        reference: `DEP-${Date.now()}`,
      });
      const balance = await request<any>("GET", "/wallet/balance").catch(() => ({ balance: 0 }));
      return {
        transaction: toTransaction(tx),
        cash: balance?.balance ?? 0,
        message: "Deposit request submitted for confirmation",
      };
    }
    case "withdraw": {
      const amount = Number(body.amount);
      const method = String(body.method ?? "Mobile Money");
      const tx = await request<any>("POST", "/wallet/withdrawals", {
        amount,
        bankName: method,
        accountNumber: "User Linked Account",
        method,
        notes: `Withdrawal via ${method}`,
      });
      const balance = await request<any>("GET", "/wallet/balance").catch(() => ({ balance: 0 }));
      return {
        transaction: toTransaction(tx),
        cash: balance?.balance ?? 0,
        message: "Withdrawal request submitted for payout",
      };
    }
    default:
      throw new ApiError("Unknown account action: " + action);
  }
}

async function handleOnboarding(body: Record<string, unknown>): Promise<unknown> {
  const action = String(body.action);
  switch (action) {
    case "status": {
      const s = await request<any>("GET", "/onboarding/status");
      return { application: toOnboardingStatus(s) };
    }
    case "progress": {
      const s = await request<any>("GET", "/onboarding/status");
      return { progress: toKycProgress(s) };
    }
    case "saveStep": {
      const step = Number(body.step);
      const data = (body.data as Record<string, unknown>) ?? {};
      await saveOnboardingStep(step, data);
      const s = await request<any>("GET", "/onboarding/status");
      return { progress: toKycProgress(s) };
    }
    case "submit": {
      // Call the finalize endpoint which handles emails, status transitions, and CSD
      const finalizeResult = await request<any>("POST", "/onboarding/finalize", {
        accuracyDeclaration: true,
        termsAccepted: true,
        sourceOfFundsDeclaration: true,
      }).catch(() => null);

      const status = await request<any>("GET", "/onboarding/status");
      const csdAccount = status.csdAccount?.csdNumber ?? "Pending";
      const result: OnboardingResult = {
        message: finalizeResult?.message ?? "Application submitted",
        application: {
          id: status.id ?? "",
          status: mapKycStatus(status.kycStatus ?? "PENDING"),
          csdAccount,
          onboarded: status.kycStatus === "APPROVED",
        },
      };
      return result;
    }
    default:
      throw new ApiError("Unknown onboarding action: " + action);
  }
}

async function handleAdmin(body: Record<string, unknown>): Promise<unknown> {
  const action = String(body.action);
  switch (action) {
    case "metrics": {
      const [stats, market, eqOrders, fiOrders, bids] = await Promise.all([
        request<any>("GET", "/admin/stats").catch(() => null),
        handleMarkets({ action: "summary" }).catch(() => ({} as MarketSummary)),
        request<any[]>("GET", "/equities/admin/orders").catch(() => []),
        request<any[]>("GET", "/fixed-income/admin/orders").catch(() => []),
        request<any[]>("GET", "/admin/bids").catch(() => []),
      ]);
      const data: AdminDashboardData = {
        metrics: {
          aum: stats?.aum ?? 32_500_000,
          cashReserves: stats?.cashReserves ?? 3_200_000,
          totalClients: stats?.totalUsers ?? 0,
          newClients30d: stats?.newClients30d ?? 4,
          totalOrders: stats?.totalOrders ?? (eqOrders.length + fiOrders.length + bids.length),
          pendingApprovals: stats?.pendingApprovals ?? (stats?.pendingKyc ?? 0),
          filledOrders: stats?.filledOrders ?? (stats?.approvedKyc ?? 0),
          revenue: stats?.revenue ?? 373_750,
          turnover: stats?.turnover ?? 29_300_000,
        },
        market: market as MarketSummary,
        chart: {
          clientGrowth: stats?.clientGrowth ?? [12, 19, 28, 42, 65, 88],
          monthLabels: stats?.monthLabels ?? ["Mar", "Apr", "May", "Jun", "Jul", "Aug"],
          volumeByClass: stats?.volumeByClass ?? [
            { name: "Equities", value: 2_450_000 },
            { name: "Treasury Bills", value: 18_900_000 },
            { name: "GoG Bonds", value: 8_200_000 },
          ],
        },
        latestOrders: [...eqOrders, ...fiOrders].map(toOrder),
      };
      return data;
    }
    case "users": {
      const users = await request<any[]>("GET", "/admin/users").catch(() => []);
      return { users: users.map(toAdminUser) };
    }
    case "updateUserRole": {
      const userId = String(body.userId ?? "");
      const role = String(body.role ?? "");
      const updated = await request<any>("PATCH", `/admin/users/${userId}/profile`, { role: role.toUpperCase() });
      return { user: toAdminUser(updated) };
    }
    case "orders": {
      const [eq, fi, bids] = await Promise.all([
        request<any[]>("GET", "/equities/admin/orders").catch(() => []),
        request<any[]>("GET", "/fixed-income/admin/orders").catch(() => []),
        request<any[]>("GET", "/admin/bids").catch(() => []),
      ]);
      const mappedBids = bids.map((b: any) => ({
        id: b.id,
        userId: b.userId,
        equitySecurity: null,
        fixedIncomeSecurity: {
          id: b.id,
          name: b.auction?.instrumentName || b.auction?.securityType?.replace(/_/g, " ") || "Treasury Bill",
        },
        side: "BUY",
        orderType: "LIMIT",
        faceValue: b.amount,
        price: b.rate ? 100 - b.rate : 1,
        status: b.status === "ACCEPTED" ? "EXECUTED" : b.status === "REJECTED" ? "REJECTED" : "PENDING",
        createdAt: b.createdAt,
      }));
      return { orders: [...eq, ...fi, ...mappedBids].map(toOrder) as AdminOrder[] };
    }
    case "confirmPayment": {
      const id = String(body.id ?? "");
      const order =
        (await request<any>("POST", `/equities/admin/orders/${id}/confirm-payment`).catch(() => null)) ??
        (await request<any>("POST", `/fixed-income/admin/orders/${id}/confirm-payment`).catch(() => null));
      if (!order) throw new ApiError("Could not confirm payment");
      return { order: toOrder(order.order ?? order), message: order.message ?? "Payment confirmed" };
    }
    case "uploadResult": {
      const id = String(body.id ?? "");
      const resultDto = body.result as Record<string, unknown>;
      const order =
        (await request<any>("POST", `/equities/admin/orders/${id}/upload-result`, resultDto).catch(() => null)) ??
        (await request<any>("POST", `/fixed-income/admin/orders/${id}/upload-result`, resultDto).catch(() => null));
      if (!order) throw new ApiError("Could not upload result");
      return { order: toOrder(order.order ?? order), message: order.message ?? "Result uploaded" };
    }
    case "approveOrder": {
      const id = String(body.id ?? "");
      const order =
        (await request<any>("POST", `/equities/admin/orders/${id}/execute`).catch(() => null)) ??
        (await request<any>("POST", `/fixed-income/admin/orders/${id}/execute`).catch(() => null)) ??
        (await request<any>("POST", `/admin/bids/${id}/confirm-payment`).catch(() => null));
      if (!order) throw new ApiError("Could not approve order");
      return { order: toOrder(order), message: "Order approved" };
    }
    case "rejectOrder": {
      const id = String(body.id ?? "");
      const order =
        (await request<any>("POST", `/equities/admin/orders/${id}/reject`).catch(() => null)) ??
        (await request<any>("POST", `/fixed-income/admin/orders/${id}/reject`).catch(() => null));
      if (!order) throw new ApiError("Could not reject order");
      return { order: toOrder(order), message: "Order rejected" };
    }
    default:
      throw new ApiError("Unknown admin action: " + action);
  }
}

// ---------- markets ----------
export const marketsApi = {
  summary: () =>
    call<MarketSummary>("markets", { action: "summary" }),
  instruments: (assetClass?: "equity" | "fixed_income") =>
    call<{ instruments: Quote[] }>("markets", { action: "instruments", assetClass })
      .then((d) => d.instruments),
  quotes: (ticker: string) =>
    call<{ quote: Quote }>("markets", { action: "quotes", ticker }).then((d) => d.quote),
  sparkline: (ticker: string, points = 30) =>
    call<{ points: number[] }>("markets", { action: "sparkline", ticker, points })
      .then((d) => d.points),
  feed: (limit = 8) =>
    call<{ feed: FeedItem[] }>("markets", { action: "feed", limit }).then((d) => d.feed),
  performance: (points = 30) =>
    call<PerformanceData>("markets", { action: "performance", points }),
};

// ---------- trading ----------
export const tradingApi = {
  placeOrder: (input: {
    instrument: string;
    side: "buy" | "sell";
    orderType: "market" | "limit";
    quantity: number;
    limitPrice?: number;
  }) =>
    call<{ order: Order; message?: string }>("trading", { action: "placeOrder", ...input }),
  cancelOrder: (id: string) =>
    call<{ order: Order }>("trading", { action: "cancelOrder", id }),
  myOrders: () =>
    call<{ orders: Order[] }>("trading", { action: "myOrders" }).then((d) => d.orders),
  positions: () =>
    call<{ positions: Position[] }>("trading", { action: "positions" }).then((d) => d.positions),
};

// ---------- account ----------
export const accountApi = {
  portfolio: () =>
    call<Portfolio>("account", { action: "portfolio" }),
  profile: () =>
    call<{ profile: Profile }>("account", { action: "profile" }).then((d) => d.profile),
  updateProfile: (patch: { fullName?: string; phone?: string }) =>
    call<{ profile: Profile }>("account", { action: "updateProfile", ...patch }).then(
      (d) => d.profile,
    ),
  transactions: () =>
    call<{ transactions: Transaction[] }>("account", { action: "transactions" })
      .then((d) => d.transactions),
  fundingHistory: () =>
    call<{ transactions: Transaction[] }>("account", { action: "fundingHistory" })
      .then((d) => d.transactions),
  deposit: (amount: number, method: string) =>
    call<{ transaction: Transaction; cash: number; message: string }>("account", {
      action: "deposit",
      amount,
      method,
    }),
  withdraw: (amount: number, method: string) =>
    call<{ transaction: Transaction; cash: number; message: string }>("account", {
      action: "withdraw",
      amount,
      method,
    }),
};

// ---------- onboarding ----------
export const onboardingApi = {
  status: () =>
    call<{ application: OnboardingStatus }>("onboarding", { action: "status" })
      .then((d) => d.application),
  progress: () =>
    call<{ progress: KycProgress }>("onboarding", { action: "progress" }).then(
      (d) => d.progress,
    ),
  saveStep: (step: number, data: Record<string, unknown>) =>
    call<{ progress: Pick<KycProgress, "completedSteps" | "totalSteps"> }>("onboarding", {
      action: "saveStep",
      step,
      data,
    }).then((d) => d.progress),
  submit: () =>
    call<OnboardingResult>("onboarding", { action: "submit" }),
};

// ---------- auth ----------
export const authApi = {
  async login(email: string, password: string) {
    const res = await request<{ accessToken: string; refreshToken: string; userId: string; email: string }>(
      "POST",
      "/auth/login",
      { email, password },
    );
    setTokens(res.accessToken, res.refreshToken);
    return res;
  },
  async register(payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    accountType: string;
  }) {
    return request<{ userId: string; email: string; emailSent: boolean }>("POST", "/auth/register", payload);
  },
  async refresh() {
    return refreshTokens();
  },
  async logout() {
    await logoutRemote();
  },
};

// ---------- admin ----------
export const adminApi = {
  dashboard: () =>
    call<AdminDashboardData>("admin", { action: "metrics" }),
  users: () =>
    call<{ users: AdminUser[] }>("admin", { action: "users" }).then((d) => d.users),
  updateUserRole: (userId: string, role: Role) =>
    call<{ user: AdminUser }>("admin", { action: "updateUserRole", userId, role }),
  orders: () =>
    call<{ orders: AdminOrder[] }>("admin", { action: "orders" }).then((d) => d.orders),
  confirmOrderPayment: (id: string) =>
    call<{ order: Order; message: string }>("admin", { action: "confirmPayment", id }),
  uploadOrderResult: (id: string, result: {
    filledPrice: number;
    filledQty?: number;
    filledFaceValue?: number;
    settlementDate?: string;
    executionNote?: string;
    traderNotes?: string;
  }) =>
    call<{ order: Order; message: string }>("admin", { action: "uploadResult", id, result }),
  approveOrder: (id: string) =>
    call<{ order: Order; message: string }>("admin", { action: "approveOrder", id }),
  rejectOrder: (id: string) =>
    call<{ order: Order; message: string }>("admin", { action: "rejectOrder", id }),
};

// ---------- subscriptions ----------
export const subscriptionsApi = {
  subscribeResearch: (email: string, source = "WEB_PORTAL") =>
    request<{ success: boolean; message: string }>("POST", "/subscriptions/research", { email, source }),
};

