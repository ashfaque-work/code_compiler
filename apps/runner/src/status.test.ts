import { describe, expect, it } from "vitest";
import { classifyOutcome, normalizeOutput, outputsMatch } from "./status.js";

describe("classifyOutcome", () => {
  it("reports a clean exit as success", () => {
    expect(
      classifyOutcome({ exitCode: 0, timedOut: false, oomKilled: false }),
    ).toBe("SUCCESS");
  });

  it("reports a non-zero exit as a runtime error", () => {
    expect(
      classifyOutcome({ exitCode: 1, timedOut: false, oomKilled: false }),
    ).toBe("RUNTIME_ERROR");
  });

  // The original reported an infinite loop as COMPILE_ERROR.
  it("reports a timeout as TIME_LIMIT_EXCEEDED, not a compile error", () => {
    expect(
      classifyOutcome({ exitCode: null, timedOut: true, oomKilled: false }),
    ).toBe("TIME_LIMIT_EXCEEDED");
  });

  it("reports an OOM kill as MEMORY_LIMIT_EXCEEDED", () => {
    expect(
      classifyOutcome({ exitCode: 137, timedOut: false, oomKilled: true }),
    ).toBe("MEMORY_LIMIT_EXCEEDED");
  });

  // An OOM kill also produces a non-zero exit code and can race the timeout,
  // so the specific causes must win over the generic ones.
  it("prefers the memory cause when a kill looks like several things at once", () => {
    expect(
      classifyOutcome({ exitCode: 137, timedOut: true, oomKilled: true }),
    ).toBe("MEMORY_LIMIT_EXCEEDED");
  });

  it("prefers the timeout cause over a missing exit code", () => {
    expect(
      classifyOutcome({ exitCode: null, timedOut: true, oomKilled: false }),
    ).toBe("TIME_LIMIT_EXCEEDED");
  });

  it("treats a missing exit code with no known cause as internal", () => {
    expect(
      classifyOutcome({ exitCode: null, timedOut: false, oomKilled: false }),
    ).toBe("INTERNAL_ERROR");
  });
});

describe("normalizeOutput", () => {
  it("strips trailing newlines", () => {
    expect(normalizeOutput("42\n\n")).toBe("42");
  });

  it("strips trailing whitespace per line", () => {
    expect(normalizeOutput("a   \nb\t\n")).toBe("a\nb");
  });

  it("normalises Windows line endings", () => {
    expect(normalizeOutput("a\r\nb")).toBe("a\nb");
  });

  it("preserves interior blank lines", () => {
    expect(normalizeOutput("a\n\nb")).toBe("a\n\nb");
  });
});

describe("outputsMatch", () => {
  it("does not fail a correct answer over a trailing newline", () => {
    expect(outputsMatch("42\n", "42")).toBe(true);
  });

  it("still distinguishes different answers", () => {
    expect(outputsMatch("42", "43")).toBe(false);
  });
});
