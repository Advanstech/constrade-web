"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { marketsApi } from "@/lib/api";
import type { FeedItem, MarketSummary } from "@/lib/api.types";
import { changeClass } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Scrolling strip of market indices + movers. Fetches from the markets backend. */
export function PriceTicker({ dark }: { dark?: boolean }) {
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
          "flex h-11 items-center overflow-hidden border-b border-border/80 bg-muted/40 px-4",
          dark && "bg-sidebar border-sidebar-border"
        )}
      >
        <span className="text-sm text-muted-foreground">Loading market data…</span>
      </div>
    );
  }

  const benchmarkItems = [
    summary.gseComposite != null
      ? {
          venue: "GSE",
          label: "GSE-CI",
          value: summary.gseComposite.toLocaleString("en-GH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          change: summary.gseChangePct,
        }
      : null,
    summary.tbill91 != null
      ? {
          venue: "BoG",
          label: "91D T-Bill",
          value: `${summary.tbill91.toFixed(2)}%`,
          change: summary.tbill91ChangePct,
        }
      : null,
    summary.tbill182 != null
      ? {
          venue: "BoG",
          label: "182D T-Bill",
          value: `${summary.tbill182.toFixed(2)}%`,
          change: summary.tbill182ChangePct ?? null,
        }
      : null,
    summary.tbill364 != null
      ? {
          venue: "BoG",
          label: "364D T-Bill",
          value: `${summary.tbill364.toFixed(2)}%`,
          change: summary.tbill364ChangePct ?? null,
        }
      : null,
    summary.usdGhs != null
      ? {
          venue: "FX",
          label: "USD / GHS",
          value: `₵${summary.usdGhs.toFixed(4)}`,
          change: summary.usdGhsChangePct,
        }
      : null,
  ].filter((x): x is NonNullable<typeof x> => x !== null);

  const items = [
    ...benchmarkItems,
    ...feed.map((f) => ({
      venue: f.assetClass === "equity" ? "GSE" : "GFIM",
      label: f.assetClass === "equity" ? f.ticker : f.name,
      value:
        f.assetClass === "equity"
          ? `₵${Number(f.price || 0).toFixed(2)}`
          : f.yieldToMaturity
            ? `${Number(f.yieldToMaturity).toFixed(2)}%`
            : `₵${Number(f.price || 0).toFixed(2)}`,
      change: f.changePct as number | null,
    })),
  ];

  return (
    <div
      className={cn(
        "relative flex h-11 items-center overflow-hidden border-y border-border/80 bg-card/75 backdrop-blur-md",
        dark && "bg-sidebar border-sidebar-border"
      )}
    >
      <div className="animate-ticker flex w-max items-center gap-8 whitespace-nowrap px-4">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="rounded bg-brand-bronze/12 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-brand-bronze">
              {item.venue}
            </span>
            <span className="font-semibold text-foreground/85">{item.label}</span>
            <span className="font-mono text-foreground font-semibold">{item.value}</span>
            {item.change != null && item.change !== 0 && (
              <span className={cn("flex items-center gap-0.5 font-medium", changeClass(item.change))}>
                {item.change >= 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {Math.abs(item.change).toFixed(2)}%
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
