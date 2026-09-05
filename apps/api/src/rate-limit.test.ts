import { describe, expect, it } from "vitest";
import { MemoryRateLimitBackend, checkRateLimit } from "./rate-limit.js";

describe("checkRateLimit", () => {
  it("allows requests up to the limit and blocks the next one", async () => {
    const backend = new MemoryRateLimitBackend();
    const call = () => checkRateLimit(backend, "ip", 3, 60_000);

    expect((await call()).allowed).toBe(true);
    expect((await call()).allowed).toBe(true);
    expect((await call()).allowed).toBe(true);
    expect((await call()).allowed).toBe(false);
  });

  it("counts each key separately", async () => {
    const backend = new MemoryRateLimitBackend();

    await checkRateLimit(backend, "a", 1, 60_000);
    const other = await checkRateLimit(backend, "b", 1, 60_000);

    expect(other.allowed).toBe(true);
  });

  it("reports the remaining allowance", async () => {
    const backend = new MemoryRateLimitBackend();
    const first = await checkRateLimit(backend, "ip", 5, 60_000);

    expect(first.remaining).toBe(4);
  });

  it("never reports a negative allowance", async () => {
    const backend = new MemoryRateLimitBackend();
    for (let i = 0; i < 5; i += 1) {
      await checkRateLimit(backend, "ip", 1, 60_000);
    }

    const decision = await checkRateLimit(backend, "ip", 1, 60_000);
    expect(decision.remaining).toBe(0);
  });

  it("supplies a positive retry-after within the window", async () => {
    const backend = new MemoryRateLimitBackend();
    const decision = await checkRateLimit(backend, "ip", 1, 60_000);

    expect(decision.retryAfterSeconds).toBeGreaterThan(0);
    expect(decision.retryAfterSeconds).toBeLessThanOrEqual(60);
  });
});
