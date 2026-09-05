import { describe, expect, it } from "vitest";
import { formatBytes, formatDuration, percentOfLimit } from "./format.js";

describe("formatDuration", () => {
  it("shows sub-millisecond runs without claiming zero", () => {
    expect(formatDuration(0.4)).toBe("<1 ms");
  });

  it("rounds milliseconds", () => {
    expect(formatDuration(123.6)).toBe("124 ms");
  });

  it("switches to seconds past a thousand milliseconds", () => {
    expect(formatDuration(1500)).toBe("1.50 s");
  });

  it("renders nonsense as an em dash rather than NaN", () => {
    expect(formatDuration(Number.NaN)).toBe("—");
    expect(formatDuration(-1)).toBe("—");
  });
});

describe("formatBytes", () => {
  // Null means "no sample was taken", which is a real answer. The original
  // substituted the Node worker's own heap and presented it as the program's.
  it("renders an unmeasured value as an em dash", () => {
    expect(formatBytes(null)).toBe("—");
  });

  it("keeps bytes whole", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("scales to kilobytes and megabytes", () => {
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("drops the decimal once the number is large", () => {
    expect(formatBytes(150 * 1024)).toBe("150 KB");
  });
});

describe("percentOfLimit", () => {
  it("computes a share of the ceiling", () => {
    expect(percentOfLimit(2500, 5000)).toBe(50);
  });

  it("clamps a value that exceeded its ceiling", () => {
    expect(percentOfLimit(9000, 5000)).toBe(100);
  });

  it("treats an unmeasured value as empty", () => {
    expect(percentOfLimit(null, 5000)).toBe(0);
  });

  it("does not divide by a zero ceiling", () => {
    expect(percentOfLimit(10, 0)).toBe(0);
  });
});
