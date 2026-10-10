import { describe, expect, it } from "vitest";
import { clientKey } from "./app.js";

describe("clientKey", () => {
  it("uses the socket address when no proxy is trusted", () => {
    expect(clientKey("6.6.6.6", "192.0.2.10", 0)).toBe("192.0.2.10");
  });

  it("takes the entry the outermost trusted proxy appended", () => {
    expect(clientKey("6.6.6.6, 203.0.113.7", "10.0.0.2", 1)).toBe(
      "203.0.113.7",
    );
    expect(clientKey("6.6.6.6, 203.0.113.7, 10.0.0.5", "10.0.0.2", 2)).toBe(
      "203.0.113.7",
    );
  });

  it("uses the leftmost entry when the chain is shorter than the hop count", () => {
    expect(clientKey("203.0.113.7", "10.0.0.2", 2)).toBe("203.0.113.7");
  });

  it("falls back to the socket address when the header is missing or blank", () => {
    expect(clientKey(undefined, "192.0.2.10", 1)).toBe("192.0.2.10");
    expect(clientKey(" , ", "192.0.2.10", 1)).toBe("192.0.2.10");
  });

  it("returns a shared key when nothing identifies the caller", () => {
    expect(clientKey(undefined, undefined, 0)).toBe("unknown");
  });
});
