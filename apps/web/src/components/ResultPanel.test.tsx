import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ExecutionResult, ExecutionStatus } from "@code-compiler/shared";
import { ResultPanel } from "./ResultPanel.js";
import { STATUS_META } from "../lib/status.js";

const result = (over: Partial<ExecutionResult> = {}): ExecutionResult => ({
  status: "SUCCESS",
  stdout: "hello",
  stderr: "",
  compileOutput: "",
  exitCode: 0,
  timedOut: false,
  usage: { wallTimeMs: 120, memoryBytes: 4 * 1024 * 1024 },
  testResults: null,
  ...over,
});

describe("ResultPanel", () => {
  it("invites the reader to act before anything has run", () => {
    render(<ResultPanel state={{ phase: "idle" }} />);
    expect(screen.getByText(/nothing has run yet/i)).toBeDefined();
  });

  // The empty panel is the largest surface before a run, so it carries the
  // constraints rather than a shrug.
  it("states what the sandbox enforces before anything has run", () => {
    render(<ResultPanel state={{ phase: "idle" }} />);

    for (const label of ["Network", "Wall clock", "Memory", "Processes"]) {
      expect(screen.getByText(label)).toBeDefined();
    }
    expect(screen.getByText("none")).toBeDefined();
    expect(screen.getByText("read-only")).toBeDefined();
    expect(screen.getByText("non-root")).toBeDefined();
  });

  it("distinguishes queued from running", () => {
    const { rerender } = render(
      <ResultPanel state={{ phase: "queued", id: "1" }} />,
    );
    expect(screen.getByText(/waiting for a free container/i)).toBeDefined();

    rerender(<ResultPanel state={{ phase: "running", id: "1" }} />);
    expect(screen.getByText(/^running$/i)).toBeDefined();
  });

  it("shows program output on success", () => {
    render(<ResultPanel state={{ phase: "done", result: result() }} />);
    expect(screen.getByText("hello")).toBeDefined();
    expect(screen.getByText(STATUS_META.SUCCESS.label)).toBeDefined();
  });

  it("says so plainly when the program printed nothing", () => {
    render(
      <ResultPanel state={{ phase: "done", result: result({ stdout: "" }) }} />,
    );
    expect(screen.getByText(/printed nothing/i)).toBeDefined();
  });

  it("falls back to compiler output when compilation failed", () => {
    render(
      <ResultPanel
        state={{
          phase: "done",
          result: result({
            status: "COMPILE_ERROR",
            stdout: "",
            compileOutput: "error: expected ';'",
            exitCode: null,
          }),
        }}
      />,
    );
    expect(screen.getByText(/expected ';'/)).toBeDefined();
  });

  // Every status carries a label and a sentence, so colour is never the only
  // channel carrying meaning.
  const statuses: ExecutionStatus[] = [
    "SUCCESS",
    "COMPILE_ERROR",
    "RUNTIME_ERROR",
    "TIME_LIMIT_EXCEEDED",
    "MEMORY_LIMIT_EXCEEDED",
    "INTERNAL_ERROR",
  ];

  it.each(statuses)("labels %s in words", (status) => {
    render(<ResultPanel state={{ phase: "done", result: result({ status }) }} />);
    expect(screen.getByText(STATUS_META[status].label)).toBeDefined();
    expect(screen.getByText(STATUS_META[status].detail)).toBeDefined();
  });

  it("draws each measurement against its ceiling", () => {
    render(<ResultPanel state={{ phase: "done", result: result() }} />);

    // A bare number is unreadable without its limit.
    expect(screen.getByText("5 s", { exact: false })).toBeDefined();
    expect(screen.getByText("256 MB", { exact: false })).toBeDefined();
  });

  it("explains an unmeasured memory reading instead of printing a number", () => {
    render(
      <ResultPanel
        state={{
          phase: "done",
          result: result({
            usage: { wallTimeMs: 3, memoryBytes: null },
          }),
        }}
      />,
    );
    expect(screen.getByText(/before a memory sample was taken/i)).toBeDefined();
  });

  it("reports a transport failure without blaming the code", () => {
    render(
      <ResultPanel
        state={{ phase: "error", message: "Lost connection to the runner." }}
      />,
    );
    expect(screen.getByText(/could not run/i)).toBeDefined();
    expect(screen.getByText(/lost connection/i)).toBeDefined();
  });
});
