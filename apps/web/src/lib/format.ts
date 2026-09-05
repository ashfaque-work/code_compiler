/** Formats a millisecond duration for a reader, not for a log line. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1) return "<1 ms";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

const UNITS = ["B", "KB", "MB", "GB"] as const;

export function formatBytes(bytes: number | null): string {
  // Null is a real answer: the run finished before a memory sample landed.
  // Saying so beats inventing a number, which is what the original did.
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) return "—";

  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }

  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${UNITS[unit]}`;
}

/**
 * A measurement's share of its ceiling, clamped to 0–100.
 *
 * Every figure in the result panel is drawn against its limit. A bare number
 * tells you nothing about whether a run was close to being killed.
 */
export function percentOfLimit(value: number | null, limit: number): number {
  if (value === null || !Number.isFinite(value) || limit <= 0) return 0;
  return Math.max(0, Math.min(100, (value / limit) * 100));
}
