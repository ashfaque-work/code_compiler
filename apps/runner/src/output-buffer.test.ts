import { describe, expect, it } from "vitest";
import { OutputBuffer } from "./output-buffer.js";

describe("OutputBuffer", () => {
  it("passes through output below the limit", () => {
    const buffer = new OutputBuffer(100);
    buffer.write(Buffer.from("hello"));
    expect(buffer.toString()).toBe("hello");
    expect(buffer.truncated).toBe(false);
  });

  // A program printing in an infinite loop must not exhaust the runner's
  // memory before its wall-clock timeout fires.
  it("caps runaway output and flags the truncation", () => {
    const buffer = new OutputBuffer(10);
    buffer.write(Buffer.from("x".repeat(1000)));
    expect(buffer.truncated).toBe(true);
    expect(buffer.toString()).toBe(`${"x".repeat(10)}\n... output truncated`);
  });

  it("keeps draining after the limit is reached", () => {
    const buffer = new OutputBuffer(4);
    for (let i = 0; i < 50; i += 1) {
      // A refused write would stall the container's output pipe.
      expect(buffer.write(Buffer.from("abcdef"))).toBe(true);
    }
    expect(buffer.toString().startsWith("abcd")).toBe(true);
  });
});
