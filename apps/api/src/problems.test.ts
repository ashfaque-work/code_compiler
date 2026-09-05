import { describe, expect, it } from "vitest";
import type {
  SubmissionAccepted,
  SubmissionRequest,
  SubmissionStatus,
} from "@code-compiler/shared";
import { PROBLEMS, allTestCases } from "@code-compiler/problems";
import { createApp, type AppLogger } from "./app.js";
import type { SubmissionStore } from "./store.js";
import { MemoryRateLimitBackend } from "./rate-limit.js";
import { loadConfig } from "./config.js";

class FakeStore implements SubmissionStore {
  readonly seen: SubmissionRequest[] = [];

  enqueue(request: SubmissionRequest): Promise<SubmissionAccepted> {
    this.seen.push(request);
    return Promise.resolve({ id: "1", state: "queued" });
  }

  get(): Promise<SubmissionStatus | null> {
    return Promise.resolve(null);
  }

  healthy(): Promise<boolean> {
    return Promise.resolve(true);
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

function build() {
  const store = new FakeStore();
  const app = createApp({
    config: loadConfig({}),
    store,
    rateLimit: new MemoryRateLimitBackend(),
    logger: silentLogger,
  });
  return { app, store };
}

const solve = (slug: string, body: unknown) =>
  build().app.request(`/problems/${slug}/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("GET /problems", () => {
  it("lists the catalogue", async () => {
    const response = await build().app.request("/problems");
    const body = (await response.json()) as { slug: string }[];

    expect(response.status).toBe(200);
    expect(body).toHaveLength(PROBLEMS.length);
  });
});

describe("GET /problems/:slug", () => {
  it("returns the statement and its input contract", async () => {
    const response = await build().app.request("/problems/two-sum");
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body["title"]).toBe("Two Sum");
    expect(String(body["inputContract"]).length).toBeGreaterThan(0);
  });

  // Hidden cases exist only on the server; a solver must not be able to read
  // them and special-case the answers.
  it("never sends hidden test cases to the client", async () => {
    const response = await build().app.request("/problems/two-sum");
    const raw = await response.text();

    expect(raw).not.toContain("hiddenTests");

    const hidden = PROBLEMS.find((p) => p.slug === "two-sum")!.hiddenTests;
    for (const test of hidden) {
      expect(raw).not.toContain(test.input);
    }
  });

  it("still sends the worked examples", async () => {
    const response = await build().app.request("/problems/two-sum");
    const body = (await response.json()) as { examples: unknown[] };

    expect(body.examples.length).toBeGreaterThan(0);
  });

  // The original crashed the whole page on an unknown id.
  it("404s for an unknown slug", async () => {
    const response = await build().app.request("/problems/nope");
    expect(response.status).toBe(404);
  });
});

describe("POST /problems/:slug/submissions", () => {
  it("accepts a solution and returns a job id", async () => {
    const response = await solve("two-sum", {
      language: "python",
      code: "print(1)",
    });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({ state: "queued" });
  });

  it("attaches every test case server-side, hidden ones included", async () => {
    const { app, store } = build();
    await app.request("/problems/two-sum/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "python", code: "print(1)" }),
    });

    const problem = PROBLEMS.find((p) => p.slug === "two-sum")!;
    expect(store.seen[0]?.testcases).toHaveLength(allTestCases(problem).length);
  });

  it("ignores test cases supplied by the client", async () => {
    const { app, store } = build();
    await app.request("/problems/two-sum/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: "python",
        code: "print(1)",
        testcases: [{ input: "x", expectedOutput: "x" }],
      }),
    });

    const inputs = store.seen[0]?.testcases.map((t) => t.input) ?? [];
    expect(inputs).not.toContain("x");
  });

  it("rejects an unknown language", async () => {
    const response = await solve("two-sum", {
      language: "brainfuck",
      code: "+",
    });
    expect(response.status).toBe(400);
  });

  it("rejects empty code", async () => {
    const response = await solve("two-sum", { language: "python", code: "" });
    expect(response.status).toBe(400);
  });

  it("404s for an unknown problem", async () => {
    const response = await solve("nope", {
      language: "python",
      code: "print(1)",
    });
    expect(response.status).toBe(404);
  });
});
