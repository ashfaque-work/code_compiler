/**
 * Hard ceilings applied at the API boundary.
 *
 * The original service accepted 50 MB JSON bodies and never checked that
 * `code` was even a string. These are the numbers that replace that.
 */
export const LIMITS = {
  maxCodeBytes: 64 * 1024,
  maxStdinBytes: 64 * 1024,
  maxTestcases: 25,
  /** Ceiling on captured stdout/stderr, so a noisy program cannot exhaust memory. */
  maxOutputBytes: 256 * 1024,
} as const;

export const DEFAULT_TIMEOUTS = {
  /**
   * Compilation was completely unbounded in the original implementation.
   *
   * Sized for the slowest toolchain: Go builds the standard library from
   * source on every run (~21s), because its cache lives in the per-job
   * directory and is discarded afterwards. See the README on why that cache is
   * deliberately not shared between submissions.
   */
  compileMs: 60_000,
  executionMs: 5_000,
} as const;

export const DEFAULT_SANDBOX = {
  memoryMb: 256,
  cpus: 0.5,
  /**
   * Compilation gets a fuller CPU share than execution.
   *
   * A compiler is bounded by the wall-clock compile budget regardless, so
   * throttling it to half a core buys no safety and roughly doubles the time
   * every submission waits. Kept at 1.0 rather than higher so the limit is
   * always satisfiable on a single-core host.
   */
  compileCpus: 1,
  pidsLimit: 64,
} as const;
