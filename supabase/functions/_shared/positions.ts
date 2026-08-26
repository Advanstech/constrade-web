import { serviceClient } from "./db.ts";
import { getQuote } from "./markets.ts";

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
