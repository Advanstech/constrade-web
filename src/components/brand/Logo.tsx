import { cn } from "@/lib/utils";

/**
 * Constant Capital wordmark: stacked CONSTANT / CAPITAL caps framed by
 * thin rules with a bronze "BROKER DEALER" tagline — mirrors constantcap.com.gh.
 */
export function Logo({
  tone = "navy",
  compact = false,
  className,
}: {
  tone?: "navy" | "white" | "bronze";
  compact?: boolean;
  className?: string;
}) {
  const main = tone === "white" ? "text-white" : tone === "bronze" ? "text-brand-bronze" : "text-brand-navy dark:text-white";
  const tag = tone === "bronze" ? "text-brand-bronze-dark" : "text-brand-bronze";
  const rule = tone === "white" ? "bg-white/40" : "bg-brand-navy/30 dark:bg-white/30";

  return (
    <div className={cn("flex select-none flex-col items-center justify-center", className)}>
      <div className={cn("h-px w-9", rule)} />
      <span
        className={cn(
          "font-display text-[13px] font-extrabold uppercase leading-tight tracking-[0.22em] sm:text-sm",
          main,
        )}
      >
        Constant
      </span>
      <span
        className={cn(
          "font-display text-[13px] font-extrabold uppercase leading-tight tracking-[0.22em] sm:text-sm",
          main,
        )}
      >
        Capital
      </span>
      {!compact && (
        <>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={cn("h-px w-5", tag)} />
            <span className={cn("text-[7px] font-bold uppercase tracking-[0.3em] sm:text-[8px]", tag)}>
              Broker Dealer
            </span>
            <span className={cn("h-px w-5", tag)} />
          </div>
          <div className={cn("mt-1 h-px w-9", rule)} />
        </>
      )}
    </div>
  );
}
