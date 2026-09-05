import { describe, expect, it } from "vitest";
import { SubmissionRequestSchema } from "./submission.js";
import { LIMITS } from "./limits.js";

const valid = { language: "python", code: "print(1)" };

describe("SubmissionRequestSchema", () => {
  it("accepts a minimal submission and fills in defaults", () => {
    const parsed = SubmissionRequestSchema.parse(valid);
    expect(parsed.stdin).toBe("");
    expect(parsed.testcases).toEqual([]);
  });

  it("rejects an unknown language", () => {
    expect(() =>
      SubmissionRequestSchema.parse({ ...valid, language: "brainfuck" }),
    ).toThrow();
  });

  // The original never checked that `code` was a string, let alone bounded it,
  // and accepted 50 MB request bodies.
  it("rejects a non-string body", () => {
    expect(() =>
      SubmissionRequestSchema.parse({ ...valid, code: { evil: true } }),
    ).toThrow();
  });

  it("rejects empty code", () => {
    expect(() => SubmissionRequestSchema.parse({ ...valid, code: "" })).toThrow();
  });

  it("rejects code beyond the size ceiling", () => {
    expect(() =>
      SubmissionRequestSchema.parse({
        ...valid,
        code: "x".repeat(LIMITS.maxCodeBytes + 1),
      }),
    ).toThrow();
  });

  it("rejects more test cases than the ceiling allows", () => {
    const testcases = Array.from(
      { length: LIMITS.maxTestcases + 1 },
      () => ({ input: "1", expectedOutput: "1" }),
    );
    expect(() =>
      SubmissionRequestSchema.parse({ ...valid, testcases }),
    ).toThrow();
  });

  it("accepts test cases up to the ceiling", () => {
    const testcases = Array.from({ length: LIMITS.maxTestcases }, () => ({
      input: "1",
      expectedOutput: "1",
    }));
    expect(
      SubmissionRequestSchema.parse({ ...valid, testcases }).testcases,
    ).toHaveLength(LIMITS.maxTestcases);
  });
});
