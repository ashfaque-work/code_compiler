import { percentOfLimit } from "../lib/format.js";

interface GaugeProps {
  readonly label: string;
  readonly value: number | null;
  readonly limit: number;
  readonly formatted: string;
  readonly limitLabel: string;
  readonly barClass: string;
  readonly textClass: string;
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
  textClass,
}: GaugeProps) {
  const pct = percentOfLimit(value, limit);
  const unknown = value === null;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-muted">{label}</span>
        <span className="font-mono text-[13px] tabular-nums">
          <span className={unknown ? "text-muted" : textClass}>{formatted}</span>
          <span className="text-muted"> / {limitLabel}</span>
        </span>
      </div>

      <div
        className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-line-soft"
        role="meter"
        aria-label={`${label}: ${formatted} of ${limitLabel}`}
        aria-valuenow={unknown ? undefined : Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {unknown ? (
          // Not measured is a distinct state from measured-as-zero.
          <div className="h-full w-full bg-[repeating-linear-gradient(115deg,transparent,transparent_4px,var(--color-line)_4px,var(--color-line)_8px)]" />
        ) : (
          <div
            className={`gauge-bar h-full rounded-full ${barClass}`}
            style={{ width: `${Math.max(pct, 2)}%` }}
          />
        )}
      </div>

      {/* Quarter ticks, so a bar can be read as a proportion at a glance. */}
      <div className="mt-1 flex justify-between" aria-hidden>
        {[0, 1, 2, 3, 4].map((tick) => (
          <span key={tick} className="h-1 w-px bg-line-soft" />
        ))}
      </div>
    </div>
  );
}
