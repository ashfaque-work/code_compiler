import { percentOfLimit } from "../lib/format.js";

interface GaugeProps {
  readonly label: string;
  readonly value: number | null;
  readonly limit: number;
  readonly formatted: string;
  readonly limitLabel: string;
  readonly barClass: string;
}

/**
 * A measurement drawn against its ceiling.
 *
 * The ceiling is the point. "7.7 MB" means nothing on its own — the original
 * reported exactly that figure and it was the Node worker's heap, not the
 * submitted program's. Showing the cap makes the number checkable.
 */
export function Gauge({
  label,
  value,
  limit,
  formatted,
  limitLabel,
  barClass,
}: GaugeProps) {
  const pct = percentOfLimit(value, limit);
  const unknown = value === null;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-muted">{label}</span>
        <span className="font-mono text-sm tabular-nums text-ink">
          {formatted}
          <span className="text-muted"> / {limitLabel}</span>
        </span>
      </div>

      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"
        role="meter"
        aria-label={`${label}: ${formatted} of ${limitLabel}`}
        aria-valuenow={unknown ? undefined : Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {unknown ? (
          // Not measured is a distinct state from measured-as-zero.
          <div className="h-full w-full bg-[repeating-linear-gradient(115deg,transparent,transparent_5px,var(--color-line)_5px,var(--color-line)_10px)]" />
        ) : (
          <div
            className={`h-full rounded-full ${barClass}`}
            style={{ width: `${Math.max(pct, 1.5)}%` }}
          />
        )}
      </div>
    </div>
  );
}
