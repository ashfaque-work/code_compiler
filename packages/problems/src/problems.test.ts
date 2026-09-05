import { describe, expect, it } from "vitest";
import { LANGUAGE_IDS } from "@code-compiler/shared";
import { PROBLEMS, allTestCases, getProblem, toPublicProblem } from "./index.js";

describe("problem catalogue", () => {
  it("has unique slugs", () => {
    const slugs = PROBLEMS.map((problem) => problem.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("looks a problem up by slug", () => {
    expect(getProblem("two-sum")?.title).toBe("Two Sum");
  });

  it("returns undefined for an unknown slug", () => {
    // The original dereferenced `problem.testCases` on undefined and crashed
    // the whole page.
    expect(getProblem("does-not-exist")).toBeUndefined();
  });

  it.each(PROBLEMS.map((p) => [p.slug, p] as const))(
    "%s ships starter code for every language",
    (_slug, problem) => {
      for (const language of LANGUAGE_IDS) {
        expect(problem.starterCode[language]?.trim().length ?? 0).toBeGreaterThan(0);
      }
    },
  );

  it.each(PROBLEMS.map((p) => [p.slug, p] as const))(
    "%s documents how stdin is formatted",
    (_slug, problem) => {
      // The whole point: the original gave solvers no way to know.
      expect(problem.inputContract.trim().length).toBeGreaterThan(0);
      expect(problem.outputContract.trim().length).toBeGreaterThan(0);
    },
  );

  it.each(PROBLEMS.map((p) => [p.slug, p] as const))(
    "%s has visible examples and hidden cases",
    (_slug, problem) => {
      expect(problem.examples.length).toBeGreaterThan(0);
      expect(problem.hiddenTests.length).toBeGreaterThan(0);
    },
  );

  it.each(PROBLEMS.map((p) => [p.slug, p] as const))(
    "%s has no blank expected output",
    (_slug, problem) => {
      for (const testcase of allTestCases(problem)) {
        expect(testcase.expectedOutput.trim().length).toBeGreaterThan(0);
      }
    },
  );
});

describe("toPublicProblem", () => {
  it("strips hidden tests so they never reach the client", () => {
    const pub = toPublicProblem(PROBLEMS[0]!);
    expect("hiddenTests" in pub).toBe(false);
    expect(pub.examples.length).toBeGreaterThan(0);
  });
});
