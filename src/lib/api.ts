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
  return {
    ticker: raw.id ?? raw.isin ?? "",
    name: raw.name ?? "",
    assetClass: "fixed_income",
    currency: "GHS",
    price: Number(raw.price) || 0,
    changePct: 0,
    volume: 0,
    coupon: raw.couponRate ?? raw.coupon,
    maturity: raw.maturityDate ? new Date(raw.maturityDate).toISOString().split("T")[0] : undefined,
    yieldToMaturity: raw.yield,
    minInvestment: raw.faceValue,
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
    filled_price: raw.status === "EXECUTED" ? Number(raw.price) : null,
    created_at: raw.createdAt ?? new Date().toISOString(),
  };
}

function toFixedIncomeOrder(raw: any): Order {
  const sec = raw.fixedIncomeSecurity ?? {};
  return {
    id: raw.id ?? "",
    user_id: raw.userId ?? "",
    instrument: sec.id ?? raw.fixedIncomeSecurityId ?? "",
    name: sec.name ?? raw.fixedIncomeSecurityId ?? "",
    asset_class: "fixed_income",
    side: String(raw.side).toLowerCase() as Side,
    order_type: String(raw.orderType).toLowerCase() as OrderType,
    quantity: Number(raw.faceValue) || 0,
    price: Number(raw.price) || 0,
    status: mapOrderStatus(raw.status),
    filled_price: raw.status === "EXECUTED" ? Number(raw.price) : null,
    created_at: raw.createdAt ?? new Date().toISOString(),
  };
}

function toOrder(raw: any): Order {
  if (raw.equitySecurityId || raw.equitySecurity) return toEquityOrder(raw);
  return toFixedIncomeOrder(raw);
}

function toPosition(raw: any): Position {
  return {
    instrument: raw.instrumentName ?? raw.bidId ?? raw.id ?? "",
    name: raw.instrumentName ?? raw.bidId ?? raw.id ?? "",
    assetClass: raw.assetClass === "equity" ? "equity" : "fixed_income",
    quantity: Number(raw.amount) || Number(raw.quantity) || 0,
    avgPrice: Number(raw.rate) || Number(raw.price) || 0,
    marketPrice: Number(raw.rate) || Number(raw.price) || 0,
    marketValue: Number(raw.amount) || Number(raw.quantity) || 0,
    cost: Number(raw.amount) || Number(raw.quantity) || 0,
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

async function handleMarkets(body: Record<string, unknown>): Promise<unknown> {
  const action = String(body.action ?? "summary");
  switch (action) {
    case "summary": {
      const data = await request<any>("GET", "/market-data/intelligence");
      const yc = (data.yieldCurve ?? []) as any[];
      const find = (tenor: string) => yc.find((x: any) => x.tenor === tenor);
      const tb91 = find("91D") ?? { rate: 25.94, change: 0 };
      const tb182 = find("182D") ?? { rate: 27.45, change: 0 };
      const eb = find("GOG2029") ?? { rate: 8.45, change: 0 };
      return {
        gseComposite: 4398.77,
        gseChangePct: 0,
        usdGhs: 12.07,
        usdGhsChangePct: 0,
        ghsMarketCap: 94_200_000_000,
        dailyTurnover: 22_400_000,
        tbill91: Number(tb91.rate),
        tbill91ChangePct: Number(tb91.change),
        eurobond2029: Number(eb.rate),
        eurobond2029ChangePct: Number(eb.change),
        activeStocks: 16,
        advancers: 7,
        decliners: 9,
        updatedAt: data.lastUpdated ?? new Date().toISOString(),
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
      return { points: [] };
    }
    case "feed": {
      const all = (await handleMarkets({ action: "instruments" })) as { instruments: Quote[] };
      const limit = Number(body.limit ?? 8);
      const feed = all.instruments
        .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
        .slice(0, limit)
        .map((q) => ({ ...q, spark: [] as number[] }));
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
      const series: PerformanceData["series"] = { gse: [], equities: [], fixed: [], eurobonds: [], fx: [] };
      return { updatedAt: new Date().toISOString(), labels, series } as PerformanceData;
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
      if (isUuid) {
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
        if (!sec) throw new ApiError("Unknown instrument: " + instrument);
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
        accountNumber: "N/A",
        depositorName: "Web user",
      });
      return {
        transaction: toTransaction(tx),
        cash: 0,
        message: "Deposit request submitted for admin approval",
      };
    }
    case "withdraw": {
      throw new ApiError("Withdrawals are not supported in the new API yet");
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
      const [stats, market, eqOrders, fiOrders] = await Promise.all([
        request<any>("GET", "/admin/stats").catch(() => null),
        handleMarkets({ action: "summary" }).catch(() => ({} as MarketSummary)),
        request<any[]>("GET", "/equities/admin/orders").catch(() => []),
        request<any[]>("GET", "/fixed-income/admin/orders").catch(() => []),
      ]);
      const data: AdminDashboardData = {
        metrics: {
          aum: stats?.aum ?? 0,
          cashReserves: 0,
          totalClients: stats?.totalUsers ?? 0,
          newClients30d: stats?.pendingEmailConfirmations ?? 0,
          totalOrders: (stats?.totalBids ?? 0) + eqOrders.length + fiOrders.length,
          pendingApprovals: stats?.pendingKyc ?? 0,
          filledOrders: stats?.approvedKyc ?? 0,
          revenue: 0,
          turnover: 0,
        },
        market: market as MarketSummary,
        chart: {
          clientGrowth: stats?.clientGrowth ?? [],
          monthLabels: stats?.monthLabels ?? [],
          volumeByClass: stats?.volumeByClass ?? [],
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
      const [eq, fi] = await Promise.all([
        request<any[]>("GET", "/equities/admin/orders").catch(() => []),
        request<any[]>("GET", "/fixed-income/admin/orders").catch(() => []),
      ]);
      return { orders: [...eq, ...fi].map(toOrder) as AdminOrder[] };
    }
    case "approveOrder": {
      const id = String(body.id ?? "");
      const order =
        (await request<any>("POST", `/equities/admin/orders/${id}/execute`).catch(() => null)) ??
        (await request<any>("POST", `/fixed-income/admin/orders/${id}/execute`).catch(() => null));
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
  approveOrder: (id: string) =>
    call<{ order: Order; message: string }>("admin", { action: "approveOrder", id }),
  rejectOrder: (id: string) =>
    call<{ order: Order; message: string }>("admin", { action: "rejectOrder", id }),
};
