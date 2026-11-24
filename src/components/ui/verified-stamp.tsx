import { cn } from "@/lib/utils";

interface VerifiedStampProps {
  /** What was stamped, e.g. `NIA verified` or `Account verified`. */
  label: string;
  /** ISO timestamp of the pass. The date line is dropped when absent. */
  date?: string | null;
  className?: string;
}

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

/** `2026-11-24T…` becomes `24 NOV 2026`. */
export function formatStampDate(iso: string): string | null {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${day} ${MONTHS[parsed.getUTCMonth()]} ${parsed.getUTCFullYear()}`;
}

/**
 * An ink-stamp mark for something that has actually passed.
 *
 * Reads like the stamp pressed onto a passport page: an oval double ring,
 * rotated slightly off the baseline, with the authority under the date. It is a
 * record of an outcome, not a status chip — render it only once the check has
 * succeeded, never for a pending state.
 */
export function VerifiedStamp({ label, date, className }: VerifiedStampProps) {
  const stamped = date ? formatStampDate(date) : null;
  return (
    <span
      aria-label={`${label.toLowerCase()}${stamped ? ` on ${stamped}` : ""}`}
      className={cn(
        "inline-flex -rotate-3 select-none flex-col items-center rounded-full border-[2.5px] border-emerald-700/70 px-[3px] py-[3px] text-emerald-800 dark:border-emerald-300/70 dark:text-emerald-200",
        className,
      )}
    >
      <span className="flex flex-col items-center rounded-full border border-emerald-700/40 px-4 py-2 dark:border-emerald-300/40">
        <span
          aria-hidden
          className="text-[10px] font-extrabold uppercase leading-none tracking-[0.17em]"
        >
          {label}
        </span>
        <span
          aria-hidden
          className="my-1 h-px w-10 bg-emerald-700/50 dark:bg-emerald-300/50"
        />
        {stamped && (
          <span
            aria-hidden
            className="text-[9px] font-semibold uppercase leading-none tracking-[0.14em]"
          >
            {stamped}
          </span>
        )}
        <span
          aria-hidden
          className="mt-1 text-[6.5px] font-bold uppercase leading-none tracking-[0.2em] opacity-70"
        >
          Constant Capital
        </span>
      </span>
    </span>
  );
}
