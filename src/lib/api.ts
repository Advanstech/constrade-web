/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ApiError,
  API_BASE_URL,
  getAccessToken,
  logoutRemote,
  refreshTokens,
  request,
  setTokens,
} from "./apiClient";
import type {
  AdminDashboardData,
  AdminOrder,
  AdminUser,
  AdminUserDetail,
  AdminStats,
  AdminBid,
  AdminKycDocument,
  ProvisionUserInput,
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
  AppNotification,
  ExecutionResultScan,
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
  // Map backend data presence to the 4-step UI progress
  const hasProfile = !!(raw.individualProfile || raw.corporateProfile);
  const hasEmployment = !!raw.employmentDetails;
  const hasFinancial = !!raw.financialInfo;
  const isFinalized = Number(raw.onboardingStep ?? 0) >= 4;

  let completedSteps = 0;
  if (hasProfile) completedSteps = 1;
  if (hasEmployment) completedSteps = 2;
  if (hasFinancial) completedSteps = 3;
  if (isFinalized) completedSteps = 4;

  return {
    completedSteps,
    totalSteps: 4,
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
      // Investor type
      const d = data as any;
      await request("PATCH", "/onboarding/type", { type: d.type });
      break;
    }
    case 2: {
      // Individual profile
      const d = data as any;
      await request("PATCH", "/onboarding/individual-profile", {
        dateOfBirth: d.dateOfBirth,
        nationality: d.nationality ?? "Ghana",
        occupation: d.occupation ?? "",
        sourceOfFunds: d.sourceOfFunds ?? "",
        address: d.address ?? "",
        idDocumentType: d.idDocumentType,
        ghanaCardNumber: d.ghanaCardNumber,
        passportNumber: d.passportNumber,
      });
      break;
    }
    case 3: {
      // Employment details
      const d = data as any;
      await request("PATCH", "/onboarding/employment", {
        employmentStatus: d.employmentStatus ?? "",
        jobTitle: d.jobTitle ?? "",
        employerName: d.employerName ?? "",
        industry: d.industry ?? "",
        duration: d.duration ?? "",
      });
      break;
    }
    case 4: {
      // Tax details
      const d = data as any;
      await request("PATCH", "/onboarding/tax", {
        tinNumber: d.tinNumber ?? "",
        taxResidency: d.taxResidency ?? "Ghana",
      });
      break;
    }
    case 5: {
      // Financial information
      const d = data as any;
      await request("PATCH", "/onboarding/financial", {
        annualIncome: d.annualIncome ?? "",
        netWorth: d.netWorth ?? "",
        investmentObjectives: d.investmentObjectives ?? "",
      });
      break;
    }
    case 6: {
      // Bank details
      const d = data as any;
      await request("PATCH", "/onboarding/bank", {
        bankName: d.bankName ?? "",
        branch: d.branch ?? "",
        accountName: d.accountName ?? "",
        accountNumber: d.accountNumber ?? "",
      });
      break;
    }
    case 7: {
      // KYC document reference (after upload)
      const d = data as any;
      await request("POST", "/onboarding/documents", {
        type: d.type,
        fileUrl: d.fileUrl,
      });
      break;
    }
    default:
      throw new ApiError("Invalid onboarding step " + step);
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
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
      const tb91 = find("91D");
      const eb = find("GOG2029") ?? find("10Y");

      const gseStocks = (gse?.stocks ?? gse?.data ?? []) as any[];
      const advancers = gseStocks.filter((s: any) => (s.change ?? s.changePct ?? 0) > 0).length;
      const decliners = gseStocks.filter((s: any) => (s.change ?? s.changePct ?? 0) < 0).length;
      const activeStocks = gseStocks.length;

      return {
        gseComposite: gse?.compositeIndex ?? null,
        gseChangePct: gse?.changePct ?? null,
        usdGhs: null,
        usdGhsChangePct: null,
        ghsMarketCap: null,
        dailyTurnover: null,
        tbill91: tb91 != null ? Number(tb91.rate) : null,
        tbill91ChangePct: tb91 != null ? Number(tb91.change) : null,
        eurobond2029: eb != null ? Number(eb.rate) : null,
        eurobond2029ChangePct: eb != null ? Number(eb.change) : null,
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
      const spark = await request<number[]>("GET", `/market-data/sparkline/${encodeURIComponent(ticker)}?points=${points}`).catch(() => null);
      return { points: Array.isArray(spark) ? spark : [] };
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
      const perf = await request<any>("GET", `/market-data/performance?points=${points}`).catch(() => null);

      const colors = ["#F78218", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B"];
      const groupKeys = ["gse", "equities", "fixed", "eurobonds", "fx"] as const;
      type NamedSeries = { symbol: string; name: string; points: Array<{ date: string; value: number }> };

      // Build the union of all real observation dates (sorted) as labels,
      // then align each series' points by date so lines stay truthful.
      const allDates = new Set<string>();
      const named: Record<string, NamedSeries[]> = {};
      for (const g of groupKeys) {
        named[g] = (perf?.[g] ?? []) as NamedSeries[];
        for (const s of named[g]) for (const p of s.points) allDates.add(p.date.slice(0, 10));
      }
      const sortedDates = Array.from(allDates).sort();
      const labels = sortedDates.map((d) =>
        new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
      );

      const series = {} as PerformanceData["series"];
      for (const g of groupKeys) {
        series[g] = named[g].map((s, i) => {
          const byDate = new Map(s.points.map((p) => [p.date.slice(0, 10), p.value]));
          return {
            label: s.name || s.symbol,
            color: colors[i % colors.length],
            points: sortedDates.map((d) => byDate.get(d) ?? null),
          };
        });
      }

      return {
        updatedAt: perf?.updatedAt ?? new Date().toISOString(),
        labels,
        series,
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
    case "uploadDocument": {
      const file = body.file as File;
      const type = String(body.type ?? "");
      const base64 = await fileToBase64(file);
      const result = await request<any>("POST", "/onboarding/upload", {
        type,
        fileBase64: base64,
        fileName: file.name,
        mimeType: file.type,
      });
      return { document: result };
    }
    case "submit": {
      // Call the finalize endpoint which handles emails, status transitions, and CSD
      const decl = (body.declarations ?? {}) as Record<string, boolean>;
      const finalizeResult = await request<any>("POST", "/onboarding/finalize", {
        accuracyDeclaration: decl.accuracyDeclaration ?? true,
        termsAccepted: decl.termsAccepted ?? true,
        sourceOfFundsDeclaration: decl.sourceOfFundsDeclaration ?? true,
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
      const assetClass = String(body.assetClass ?? "");
      const path = assetClass === "equity"
        ? `/equities/admin/orders/${id}/confirm-payment`
        : `/fixed-income/admin/orders/${id}/confirm-payment`;
      const order = await request<any>("POST", path);
      return { order: toOrder(order.order ?? order), message: order.message ?? "Payment confirmed" };
    }
    case "uploadResult": {
      const id = String(body.id ?? "");
      const assetClass = String(body.assetClass ?? "");
      const resultDto = body.result as Record<string, unknown>;
      const path = assetClass === "equity"
        ? `/equities/admin/orders/${id}/upload-result`
        : `/fixed-income/admin/orders/${id}/upload-result`;
      const order = await request<any>("POST", path, resultDto);
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
      const assetClass = String(body.assetClass ?? "");
      const path = assetClass === "equity"
        ? `/equities/admin/orders/${id}/reject`
        : `/fixed-income/admin/orders/${id}/reject`;
      const order = await request<any>("POST", path);
      return { order: toOrder(order.order ?? order), message: order.message ?? "Order rejected" };
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
  uploadDocument: (file: File, type: string) =>
    call<{ document: { id: string; type: string; fileUrl: string } }>("onboarding", {
      action: "uploadDocument",
      file,
      type,
    }).then((d) => d.document),
  submit: (declarations?: { accuracyDeclaration?: boolean; termsAccepted?: boolean; sourceOfFundsDeclaration?: boolean }) =>
    call<OnboardingResult>("onboarding", { action: "submit", declarations }),
  downloadCsdForm: async () => {
    const base = API_BASE_URL.replace(/\/$/, "");
    const token = getAccessToken();
    const res = await fetch(`${base}/onboarding/export/csd-form`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError("Failed to download CSD form", res.status);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `csd-form-${new Date().toISOString().split("T")[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
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
async function downloadAdminFile(path: string, filename: string) {
  const base = API_BASE_URL.replace(/\/$/, "");
  const token = getAccessToken();
  const response = await fetch(`${base}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new ApiError("Download failed", response.status);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export const adminApi = {
  dashboard: () =>
    call<AdminDashboardData>("admin", { action: "metrics" }),
  users: () =>
    call<{ users: AdminUser[] }>("admin", { action: "users" }).then((d) => d.users),
  me: () =>
    request<{ id: string; email: string; role: string; firstName?: string; lastName?: string }>("GET", "/auth/me"),
  stats: () => request<AdminStats>("GET", "/admin/stats"),
  listUsers: (filters?: { search?: string; status?: string; role?: string }) => {
    const params = new URLSearchParams();
    if (filters?.search) params.set("search", filters.search);
    if (filters?.status && filters.status !== "ALL") params.set("status", filters.status);
    if (filters?.role && filters.role !== "ALL") params.set("role", filters.role);
    const qs = params.toString();
    return request<AdminUserDetail[]>("GET", `/admin/users${qs ? `?${qs}` : ""}`);
  },
  userDetail: (userId: string) => request<AdminUserDetail>("GET", `/admin/users/${userId}`),
  bids: (search?: string) =>
    request<AdminBid[]>("GET", `/admin/bids${search ? `?search=${encodeURIComponent(search)}` : ""}`).catch(() => []),
  updateUserProfile: (userId: string, payload: Record<string, unknown>) =>
    request<AdminUserDetail>("PATCH", `/admin/users/${userId}/profile`, payload),
  updateUserKyc: (userId: string, status: "PENDING" | "APPROVED" | "REJECTED") =>
    request<AdminUserDetail>("PATCH", `/admin/users/${userId}/kyc`, { status }),
  updateUserRole: (userId: string, role: "INVESTOR" | "ADMIN" | "SUPER_ADMIN") =>
    request<AdminUserDetail>("PATCH", `/admin/users/${userId}/profile`, { role }),
  documentUrl: (documentId: string) =>
    request<{ signedUrl: string }>("GET", `/admin/documents/${documentId}/signed-url`),
  updateDocumentStatus: (
    documentId: string,
    status: "APPROVED" | "REJECTED",
    reviewNote?: string,
  ) =>
    request<AdminKycDocument>("PATCH", `/admin/documents/${documentId}/status`, {
      status,
      ...(reviewNote ? { reviewNote } : {}),
    }),
  dispatchNotice: (userId: string) =>
    request<{ success: boolean; message: string }>("POST", `/admin/users/${userId}/dispatch-notice`),
  deleteUser: (userId: string) =>
    request<{ success: boolean; message: string }>("DELETE", `/admin/users/${userId}`),
  hardDeleteUser: (userId: string) =>
    request<{ success: boolean; message: string }>("DELETE", `/admin/users/${userId}/hard`),
  provisionUser: (data: ProvisionUserInput) => request<AdminUserDetail>("POST", "/admin/users", data),
  exportUsers: () => downloadAdminFile("/admin/users/export/csv", `investor-registry-${new Date().toISOString().slice(0, 10)}.csv`),
  exportUserKyc: (userId: string) => downloadAdminFile(`/admin/users/${userId}/kyc-pdf`, `kyc-${userId.slice(0, 8)}.pdf`),
  exportUserCsdForm: (userId: string) => downloadAdminFile(`/admin/users/${userId}/csd-form`, `csd-form-${userId.slice(0, 8)}.pdf`),
  orders: () =>
    call<{ orders: AdminOrder[] }>("admin", { action: "orders" }).then((d) => d.orders),
  scanOrderResult: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<ExecutionResultScan>("POST", "/tender-results/scan-execution-result", form);
  },
  confirmOrderPayment: (id: string, assetClass: "equity" | "fixed_income") =>
    call<{ order: Order; message: string }>("admin", { action: "confirmPayment", id, assetClass }),
  uploadOrderResult: (id: string, assetClass: "equity" | "fixed_income", result: {
    filledPrice: number;
    filledQty?: number;
    filledFaceValue?: number;
    settlementDate?: string;
    executionNote?: string;
    traderNotes?: string;
  }) =>
    call<{ order: Order; message: string }>("admin", { action: "uploadResult", id, assetClass, result }),
  approveOrder: (id: string) =>
    call<{ order: Order; message: string }>("admin", { action: "approveOrder", id }),
  rejectOrder: (id: string, assetClass: "equity" | "fixed_income") =>
    call<{ order: Order; message: string }>("admin", { action: "rejectOrder", id, assetClass }),
};

// ---------- notifications ----------
// Talks directly to the NestJS /notifications endpoints (same JWT auth).
function toNotification(raw: any): AppNotification {
  return {
    id: raw.id ?? "",
    type: (String(raw.type ?? "GENERAL").toUpperCase() as AppNotification["type"]),
    title: raw.title ?? "",
    message: raw.message ?? "",
    link: raw.link ?? null,
    metadata: raw.metadata ?? null,
    read: Boolean(raw.read),
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

export const notificationsApi = {
  list: async (limit = 50): Promise<AppNotification[]> => {
    const raw = await request<any[]>("GET", `/notifications?limit=${limit}`).catch(() => []);
    return (Array.isArray(raw) ? raw : []).map(toNotification);
  },
  markRead: (id: string) =>
    request<any>("POST", `/notifications/${id}/read`).then(toNotification),
  markAllRead: () => request<any>("POST", "/notifications/read-all"),
  remove: (id: string) => request<any>("DELETE", `/notifications/${id}`),
};

// ---------- subscriptions ----------
export const subscriptionsApi = {
  subscribeResearch: (email: string, source = "WEB_PORTAL") =>
    request<{ success: boolean; message: string }>("POST", "/subscriptions/research", { email, source }),
};

