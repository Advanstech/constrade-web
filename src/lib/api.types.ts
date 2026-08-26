// ============================================================
// Typed contract between the frontend and the Constant Capital
// backend functions. Mirrors the shape of the real trading API
// so the backend team can swap the mock provider later without
// touching the frontend.
// ============================================================

export type AssetClass = "equity" | "fixed_income";
export type Side = "buy" | "sell";
export type OrderType = "market" | "limit";
export type OrderStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "filled"
  | "cancelled";

export type Role = "client" | "trader" | "compliance" | "admin";
export type KycStatus = "pending" | "submitted" | "approved" | "rejected";

export interface Quote {
  ticker: string;
  name: string;
  assetClass: AssetClass;
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

export interface FeedItem extends Quote {
  spark: number[];
}

export interface PerformanceSeries {
  label: string;
  color: string;
  points: number[];
}

export type PerformanceGroup = "gse" | "equities" | "fixed" | "eurobonds" | "fx";

export interface PerformanceData {
  updatedAt: string;
  labels: string[];
  series: Record<PerformanceGroup, PerformanceSeries[]>;
}

export interface Order {
  id: string;
  user_id: string;
  instrument: string;
  name: string;
  asset_class: AssetClass;
  side: Side;
  order_type: OrderType;
  quantity: number;
  price: number;
  status: OrderStatus;
  filled_price: number | null;
  created_at: string;
}

export interface Position {
  instrument: string;
  name: string;
  assetClass: AssetClass;
  quantity: number;
  avgPrice: number;
  marketPrice: number;
  marketValue: number;
  cost: number;
  pl: number;
  plPct: number;
  dayChangePct: number;
}

export interface AllocationSlice {
  label: string;
  value: number;
  color: string;
}

export interface Portfolio {
  cash: number;
  securitiesValue: number;
  totalValue: number;
  totalPl: number;
  totalPlPct: number;
  dayPl: number;
  holdings: Position[];
  allocation: AllocationSlice[];
}

export interface Transaction {
  id: string;
  user_id: string;
  type: "deposit" | "withdraw" | "trade_buy" | "trade_sell" | "dividend" | "fee";
  amount: number;
  reference: string | null;
  detail: string | null;
  created_at: string;
}

export interface OnboardingStatus {
  status: KycStatus;
  onboarded: boolean;
  csdAccount: string | null;
  fullName: string;
  phone: string | null;
}

export interface KycProgress {
  completedSteps: number;
  totalSteps: number;
  status: "in_progress" | "submitted" | "approved";
  data: Record<string, unknown>;
}

export interface OnboardingResult {
  message: string;
  application: {
    id: string;
    status: KycStatus;
    csdAccount: string;
    onboarded: boolean;
  };
}

export interface Profile {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: Role;
  kyc_status: KycStatus;
  csd_account: string | null;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUser extends Profile {
  cash: number;
  orderCount: number;
}

export interface AdminMetrics {
  aum: number;
  cashReserves: number;
  totalClients: number;
  newClients30d: number;
  totalOrders: number;
  pendingApprovals: number;
  filledOrders: number;
  revenue: number;
  turnover: number;
}

export interface AdminDashboardData {
  metrics: AdminMetrics;
  market: MarketSummary;
  chart: {
    clientGrowth: number[];
    monthLabels: string[];
    volumeByClass: { name: string; value: number }[];
  };
  latestOrders: Order[];
}

export interface AdminOrder extends Order {
  client: string;
}
