import type { TestCase } from "@code-compiler/shared";
import type { Problem } from "./types.js";
import { twoSum } from "./problems/two-sum.js";
import { reverseInteger } from "./problems/reverse-integer.js";
import { searchInsertPosition } from "./problems/search-insert-position.js";

export * from "./types.js";

export const PROBLEMS: readonly Problem[] = [
  twoSum,
  reverseInteger,
  searchInsertPosition,
];

export function getProblem(slug: string): Problem | undefined {
  return PROBLEMS.find((problem) => problem.slug === slug);
}

/**
 * Examples plus hidden cases, in that order.
 *
 * Grading runs both; only the examples are ever sent to the client.
 */
export function allTestCases(problem: Problem): TestCase[] {
  return [...problem.examples, ...problem.hiddenTests];
}
