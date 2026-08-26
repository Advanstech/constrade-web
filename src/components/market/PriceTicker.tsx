"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { marketsApi } from "@/lib/api";
import type { FeedItem, MarketSummary } from "@/lib/api.types";
import { changeClass } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Scrolling strip of market indices + movers. Fetches from the markets backend. */
export function PriceTicker({ dark = false }: { dark?: boolean }) {
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    let alive = true;
    void Promise.all([marketsApi.summary(), marketsApi.feed(10)])
      .then(([s, f]) => {
        if (!alive) return;
        setSummary(s);
        setFeed(f);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!summary) {
    return (
      <div
        className={cn(
          "flex h-9 items-center overflow-hidden border-b px-4",
          dark ? "border-border bg-sidebar" : "border-border bg-muted/50",
        )}
      >
        <span className="text-xs text-muted-foreground">Loading market data…</span>
      </div>
    );
  }

  const items = [
    { label: "GSE Composite", value: summary.gseComposite.toFixed(2), change: summary.gseChangePct },
    { label: "USD/GHS", value: summary.usdGhs.toFixed(4), change: summary.usdGhsChangePct },
    { label: "91-Day T-Bill", value: `${summary.tbill91.toFixed(2)}%`, change: summary.tbill91ChangePct },
    { label: "Eurobond 2029", value: `${summary.eurobond2029.toFixed(2)}%`, change: summary.eurobond2029ChangePct },
    ...feed.map((f) => ({
      label: f.ticker,
      value: f.price.toLocaleString("en-GH"),
      change: f.changePct,
    })),
  ];

  return (
    <div
      className={cn(
        "relative flex h-9 items-center overflow-hidden border-b",
        dark ? "border-border bg-sidebar" : "border-border bg-muted/50",
      )}
    >
      <div className="animate-ticker flex w-max items-center gap-8 whitespace-nowrap px-4">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="flex items-center gap-1.5 text-xs">
            <span className={dark ? "text-white/60" : "text-muted-foreground"}>{item.label}</span>
            <span className={dark ? "text-white/90" : "text-foreground"}>{item.value}</span>
            <span className={cn("flex items-center gap-0.5", changeClass(item.change))}>
              {item.change >= 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {item.change.toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
