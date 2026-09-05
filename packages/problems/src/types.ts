import type { LanguageId, TestCase } from "@code-compiler/shared";

export type Difficulty = "easy" | "medium";

export interface Problem {
  readonly slug: string;
  readonly title: string;
  readonly difficulty: Difficulty;
  /** One line, shown in the problem list. */
  readonly summary: string;
  /** The full statement. Plain prose; no markup to render. */
  readonly statement: string;
  /**
   * Exactly how stdin is formatted.
   *
   * The original supplied test cases like `"[2,7,11,15], 9"` with no
   * indication of how to parse them and no starter code, which made the
   * feature unusable. Stating the contract is the fix.
   */
  readonly inputContract: string;
  readonly outputContract: string;
  /** Worked example, shown alongside the statement. */
  readonly examples: readonly TestCase[];
  /** Held back until a run finishes, so solutions cannot be special-cased. */
  readonly hiddenTests: readonly TestCase[];
  /** Reads stdin per the contract and calls a stub the solver fills in. */
  readonly starterCode: Readonly<Record<LanguageId, string>>;
}

/** What the client is allowed to see. Hidden tests never cross the wire. */
export type PublicProblem = Omit<Problem, "hiddenTests">;

export function toPublicProblem(problem: Problem): PublicProblem {
  const { hiddenTests: _hidden, ...pub } = problem;
  return pub;
}
