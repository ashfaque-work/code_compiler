import { describe, expect, it } from "vitest";
import type { LanguageId } from "@code-compiler/shared";
import { PROBLEMS, allTestCases } from "@code-compiler/problems";
import { Sandbox } from "../src/sandbox.js";
import { Executor } from "../src/execute.js";
import { loadConfig } from "../src/config.js";

/**
 * Proves the stdin contract is real.
 *
 * Each problem states how input arrives and ships starter code that parses it.
 * These reference solutions follow that same contract and are graded through
 * the actual sandbox, so a contract that cannot be satisfied fails here rather
 * than in front of someone trying to solve it.
 *
 * The original's assessment page piped `"[2,7,11,15], 9"` at stdin with no
 * parsing guidance and no starter code, and nothing ever checked that a
 * solution could be written at all.
 */

const config = loadConfig();
const sandbox = new Sandbox(config.dockerSocket);
const executor = new Executor(sandbox, config);

const dockerAvailable = await sandbox.ping().then(
  () => true,
  () => false,
);

const SOLUTIONS: Record<string, Partial<Record<LanguageId, string>>> = {
  "two-sum": {
    python: `import sys


def solve(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
    return []


lines = sys.stdin.read().split("\\n")
nums = [int(x) for x in lines[0].split()]
target = int(lines[1])
print(" ".join(str(i) for i in solve(nums, target)))
`,
    javascript: `function solve(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [];
}

const lines = require("fs").readFileSync(0, "utf8").split("\\n");
const nums = lines[0].trim().split(/\\s+/).map(Number);
const target = Number(lines[1]);
console.log(solve(nums, target).join(" "));
`,
  },

  "reverse-integer": {
    python: `import sys


def solve(n):
    sign = -1 if n < 0 else 1
    rev = sign * int(str(abs(n))[::-1])
    if rev < -(2 ** 31) or rev > 2 ** 31 - 1:
        return 0
    return rev


print(solve(int(sys.stdin.read().strip())))
`,
    javascript: `function solve(n) {
  const sign = n < 0 ? -1 : 1;
  const digits = String(Math.abs(n)).split("").reverse().join("");
  const rev = sign * Number(digits);
  if (rev < -(2 ** 31) || rev > 2 ** 31 - 1) return 0;
  return rev;
}

const n = Number(require("fs").readFileSync(0, "utf8").trim());
console.log(solve(n));
`,
  },

  "search-insert-position": {
    python: `import bisect
import sys


def solve(nums, target):
    return bisect.bisect_left(nums, target)


lines = sys.stdin.read().split("\\n")
nums = [int(x) for x in lines[0].split()]
target = int(lines[1])
print(solve(nums, target))
`,
    javascript: `function solve(nums, target) {
  let lo = 0;
  let hi = nums.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

const lines = require("fs").readFileSync(0, "utf8").split("\\n");
const nums = lines[0].trim().split(/\\s+/).map(Number);
const target = Number(lines[1]);
console.log(solve(nums, target));
`,
  },
};

describe.runIf(dockerAvailable)("problem contracts", () => {
  for (const problem of PROBLEMS) {
    const solutions = SOLUTIONS[problem.slug] ?? {};

    describe(problem.slug, () => {
      for (const [language, code] of Object.entries(solutions)) {
        it(`is solvable in ${language}`, async () => {
          const result = await executor.execute({
            language: language as LanguageId,
            code,
            stdin: "",
            testcases: allTestCases(problem).map((test) => ({
              input: test.input,
              expectedOutput: test.expectedOutput,
            })),
          });

          expect(result.status).toBe("SUCCESS");

          const failures = (result.testResults ?? []).filter((t) => !t.passed);
          expect(
            failures.map((f) => ({
              input: f.input,
              expected: f.expectedOutput,
              actual: f.actualOutput,
              stderr: f.stderr.slice(0, 200),
            })),
          ).toEqual([]);
        });
      }
    });
  }

  it("covers every catalogued problem with at least one solution", () => {
    for (const problem of PROBLEMS) {
      expect(Object.keys(SOLUTIONS[problem.slug] ?? {}).length).toBeGreaterThan(
        0,
      );
    }
  });
});
