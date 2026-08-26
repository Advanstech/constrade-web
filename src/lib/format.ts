const fmt = (value: number, decimals: number): string =>
  new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

/** Format a number as Ghanaian cedi (₵). */
export function formatGHS(value: number, opts: { compact?: boolean; cents?: boolean } = {}): string {
  const abs = Math.abs(value);
  if (opts.compact) {
    if (abs >= 1_000_000_000) return `₵${fmt(value / 1_000_000_000, 2)}B`;
    if (abs >= 1_000_000) return `₵${fmt(value / 1_000_000, 2)}M`;
    if (abs >= 1_000) return `₵${fmt(value / 1_000, 2)}K`;
  }
  const digits = opts.cents === false ? 0 : 2;
  return `₵${fmt(value, digits)}`;
}

/** Format a plain number. */
export function formatNumber(value: number, decimals = 2): string {
  return fmt(value, decimals);
}

/** Format a signed percentage. */
export function formatPercent(value: number, signed = true): string {
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

/** Colour class helpers for market moves. */
export function changeClass(value: number): string {
  if (value > 0) return "text-success";
  if (value < 0) return "text-danger";
  return "text-muted-foreground";
}

export function changeBgClass(value: number): string {
  if (value > 0) return "bg-success/10 text-success";
  if (value < 0) return "bg-danger/10 text-danger";
  return "bg-muted text-muted-foreground";
}

export function statusLabel(status: string): string {
  switch (status) {
    case "pending_approval":
      return "Pending approval";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "filled":
      return "Filled";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function statusClass(status: string): string {
  switch (status) {
    case "filled":
      return "bg-success/10 text-success";
    case "pending_approval":
    case "approved":
      return "bg-brand-bronze/15 text-brand-bronze";
    case "rejected":
    case "cancelled":
      return "bg-danger/10 text-danger";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Shorten a long id for display. */
export function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}
