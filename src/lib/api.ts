import { supabase } from "@/integrations/supabase/client";
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
  PerformanceData,
  Portfolio,
  Position,
  Profile,
  Quote,
  Role,
  Transaction,
} from "./api.types";

export class ApiError extends Error {}

/**
 * Call a Constant Capital backend function.
 * The Supabase client automatically attaches the session JWT.
 */
async function call<T>(
  fn: "markets" | "trading" | "account" | "onboarding" | "admin",
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, {
    body: { ...body },
  });
  if (error) {
    throw new ApiError(error.message || `Backend ${fn} failed`);
  }
  if (data && typeof data === "object" && "error" in data) {
    throw new ApiError(String((data as { error: unknown }).error));
  }
  return data as T;
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
