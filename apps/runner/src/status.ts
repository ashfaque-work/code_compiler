import type { ExecutionStatus } from "@code-compiler/shared";

export interface ClassifiableOutcome {
  readonly exitCode: number | null;
  readonly timedOut: boolean;
  readonly oomKilled: boolean;
}

/**
 * Maps a container outcome onto the execution status taxonomy.
 *
 * Order matters. A container killed for exceeding its memory cap also reports a
 * non-zero exit code, and one killed on timeout reports no exit code at all —
 * so the specific causes have to be checked before the generic failure.
 *
 * The original had none of this: every one of these cases surfaced as
 * `COMPILE_ERROR`, including infinite loops.
 */
export function classifyOutcome(
  outcome: ClassifiableOutcome,
): ExecutionStatus {
  if (outcome.oomKilled) return "MEMORY_LIMIT_EXCEEDED";
  if (outcome.timedOut) return "TIME_LIMIT_EXCEEDED";
  if (outcome.exitCode === null) return "INTERNAL_ERROR";
  if (outcome.exitCode !== 0) return "RUNTIME_ERROR";
  return "SUCCESS";
}

/**
 * Normalises program output before comparison against expected output.
 *
 * Trailing whitespace on each line and trailing blank lines are stripped, so a
 * correct solution is not failed for printing "42\n" instead of "42". Windows
 * line endings are normalised too.
 */
export function normalizeOutput(raw: string): string {
  return raw
    .replaceAll("\r\n", "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/u, ""))
    .join("\n")
    .replace(/\n+$/u, "")
    .trim();
}

export function outputsMatch(actual: string, expected: string): boolean {
  return normalizeOutput(actual) === normalizeOutput(expected);
}
