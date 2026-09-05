import { describe, expect, it } from "vitest";
import type {
  SubmissionAccepted,
  SubmissionRequest,
  SubmissionStatus,
} from "@code-compiler/shared";
import { LIMITS } from "@code-compiler/shared";
import { createApp, type AppLogger } from "./app.js";
import type { SubmissionStore } from "./store.js";
import { MemoryRateLimitBackend } from "./rate-limit.js";
import { loadConfig, type ApiConfig } from "./config.js";

/** Stands in for BullMQ so the routes can be tested without Redis. */
class FakeStore implements SubmissionStore {
  readonly seen: SubmissionRequest[] = [];
  readonly statuses = new Map<string, SubmissionStatus>();
  redisUp = true;
  #next = 1;

  enqueue(request: SubmissionRequest): Promise<SubmissionAccepted> {
    this.seen.push(request);

    const id = String(this.#next);
    this.#next += 1;
    this.statuses.set(id, { id, state: "queued", result: null, error: null });

    return Promise.resolve({ id, state: "queued" });
  }

  get(id: string): Promise<SubmissionStatus | null> {
    return Promise.resolve(this.statuses.get(id) ?? null);
  }

  healthy(): Promise<boolean> {
    return Promise.resolve(this.redisUp);
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}

const silentLogger: AppLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

interface Harness {
  readonly app: ReturnType<typeof createApp>;
  readonly store: FakeStore;
}

function build(overrides: Partial<ApiConfig> = {}): Harness {
  const config: ApiConfig = { ...loadConfig({}), ...overrides };
  const store = new FakeStore();

  const app = createApp({
    config,
    store,
    rateLimit: new MemoryRateLimitBackend(),
    logger: silentLogger,
  });

  return { app, store };
}

const post = (harness: Harness, body: unknown) =>
  harness.app.request("/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const validBody = { language: "python", code: "print(1)" };

describe("POST /submissions", () => {
  // The original awaited `job.finished()` inside the handler, holding the
  // connection open for the whole execution.
  it("accepts a submission and returns immediately with a job id", async () => {
    const response = await post(build(), validBody);

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      id: "1",
      state: "queued",
    });
  });

  it("rejects an unknown language", async () => {
    const response = await post(build(), { language: "brainfuck", code: "+" });
    expect(response.status).toBe(400);
  });

  it("rejects a non-string code field", async () => {
    const response = await post(build(), {
      language: "python",
      code: { evil: true },
    });
    expect(response.status).toBe(400);
  });

  it("rejects code beyond the size ceiling", async () => {
    const response = await post(build(), {
      language: "python",
      code: "x".repeat(LIMITS.maxCodeBytes + 1),
    });
    expect(response.status).toBe(400);
  });

  it("does not enqueue anything when validation fails", async () => {
    const harness = build();
    await post(harness, { language: "python", code: "" });

    expect(harness.store.seen).toHaveLength(0);
  });

  it("reports which field failed", async () => {
    const response = await post(build(), { language: "python" });
    const body = (await response.json()) as { error: string; details: unknown };

    expect(body.error).toBe("Invalid submission");
    expect(Array.isArray(body.details)).toBe(true);
  });

  it("applies schema defaults before queueing", async () => {
    const harness = build();
    await post(harness, validBody);

    expect(harness.store.seen[0]).toMatchObject({ stdin: "", testcases: [] });
  });
});

describe("GET /submissions/:id", () => {
  it("returns the current status", async () => {
    const harness = build();
    await post(harness, validBody);

    const response = await harness.app.request("/submissions/1");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: "1",
      state: "queued",
    });
  });

  it("404s for an unknown id", async () => {
    const response = await build().app.request("/submissions/nope");
    expect(response.status).toBe(404);
  });
});

describe("GET /healthz", () => {
  it("reports ok when Redis answers", async () => {
    const response = await build().app.request("/healthz");
    expect(response.status).toBe(200);
  });

  it("reports 503 when Redis does not", async () => {
    const harness = build();
    harness.store.redisUp = false;

    const response = await harness.app.request("/healthz");
    expect(response.status).toBe(503);
  });
});

describe("GET /languages", () => {
  it("lists every language with runnable starter code", async () => {
    const response = await build().app.request("/languages");
    const body = (await response.json()) as {
      id: string;
      starterCode: string;
    }[];

    expect(body).toHaveLength(7);
    for (const language of body) {
      expect(language.starterCode.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("CORS", () => {
  it("allows a configured origin", async () => {
    const harness = build({ corsOrigins: ["https://app.example"] });
    const response = await harness.app.request("/languages", {
      headers: { Origin: "https://app.example" },
    });

    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://app.example",
    );
  });

  // The original sent `origin: "*"` together with `credentials: true`.
  it("does not echo an origin that is not on the allowlist", async () => {
    const harness = build({ corsOrigins: ["https://app.example"] });
    const response = await harness.app.request("/languages", {
      headers: { Origin: "https://evil.example" },
    });

    expect(response.headers.get("access-control-allow-origin")).not.toBe(
      "https://evil.example",
    );
  });
});

describe("rate limiting", () => {
  it("rejects once the window limit is exceeded", async () => {
    const harness = build({ rateLimitMax: 3, rateLimitWindowMs: 60_000 });

    for (let i = 0; i < 3; i += 1) {
      expect((await post(harness, validBody)).status).toBe(202);
    }

    const blocked = await post(harness, validBody);

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
  });

  it("advertises the remaining allowance", async () => {
    const harness = build({ rateLimitMax: 5, rateLimitWindowMs: 60_000 });
    const response = await post(harness, validBody);

    expect(response.headers.get("x-ratelimit-remaining")).toBe("4");
  });

  // Only the endpoint that costs a container is limited.
  it("does not rate limit reads", async () => {
    const harness = build({ rateLimitMax: 1, rateLimitWindowMs: 60_000 });

    for (let i = 0; i < 5; i += 1) {
      expect((await harness.app.request("/languages")).status).toBe(200);
    }
  });
});

describe("unknown routes", () => {
  it("returns a JSON 404 rather than HTML", async () => {
    const response = await build().app.request("/nope");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: "Not found",
    });
  });
});
