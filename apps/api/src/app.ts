import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import {
  SubmissionRequestSchema,
  ProblemSubmissionSchema,
  LANGUAGE_IDS,
  type SubmissionStatus,
} from "@code-compiler/shared";
import { getLanguage } from "@code-compiler/languages";
import {
  PROBLEMS,
  allTestCases,
  getProblem,
  toPublicProblem,
} from "@code-compiler/problems";
import type { ApiConfig } from "./config.js";
import { isTerminal, type SubmissionStore } from "./store.js";
import { checkRateLimit, type RateLimitBackend } from "./rate-limit.js";

export interface AppLogger {
  info(obj: unknown, msg?: string): void;
  warn(obj: unknown, msg?: string): void;
  error(obj: unknown, msg?: string): void;
}

export interface AppDeps {
  readonly config: ApiConfig;
  readonly store: SubmissionStore;
  readonly rateLimit: RateLimitBackend;
  readonly logger: AppLogger;
}

export function createApp(deps: AppDeps): Hono {
  const { config, store, rateLimit, logger } = deps;
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: config.corsOrigins,
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
      maxAge: 600,
    }),
  );

  app.use("/submissions", bodyLimit({ maxSize: config.maxBodyBytes }));
  app.use(
    "/problems/:slug/submissions",
    bodyLimit({ maxSize: config.maxBodyBytes }),
  );

  // Applied to every endpoint that costs a container.
  const rateLimitPosts = async (
    c: Parameters<Parameters<Hono["use"]>[1]>[0],
    next: () => Promise<void>,
  ) => {
    if (c.req.method !== "POST") return next();

    const decision = await checkRateLimit(
      rateLimit,
      clientKey(c.req.header("x-forwarded-for"), c.req.header("x-real-ip")),
      config.rateLimitMax,
      config.rateLimitWindowMs,
    );

    c.header("X-RateLimit-Limit", String(decision.limit));
    c.header("X-RateLimit-Remaining", String(decision.remaining));

    if (!decision.allowed) {
      c.header("Retry-After", String(decision.retryAfterSeconds));
      return c.json(
        { error: "Too many requests", details: null },
        429,
      );
    }

    return next();
  };

  app.use("/submissions", rateLimitPosts);
  app.use("/problems/:slug/submissions", rateLimitPosts);

  app.get("/healthz", async (c) => {
    const redisOk = await store.healthy();
    return c.json(
      { status: redisOk ? "ok" : "degraded", redis: redisOk },
      redisOk ? 200 : 503,
    );
  });

  app.get("/languages", (c) =>
    c.json(
      LANGUAGE_IDS.map((id) => {
        const language = getLanguage(id);
        return {
          id,
          displayName: language.displayName,
          starterCode: language.starterCode,
        };
      }),
    ),
  );

  app.post(
    "/submissions",
    zValidator("json", SubmissionRequestSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          { error: "Invalid submission", details: result.error.issues },
          400,
        );
      }
      return undefined;
    }),
    async (c) => {
      const request = c.req.valid("json");

      // Returns as soon as the job is queued. The original awaited
      // `job.finished()` inside the handler, holding the connection open for
      // the entire execution.
      const accepted = await store.enqueue(request);

      logger.info(
        { id: accepted.id, language: request.language },
        "submission queued",
      );

      return c.json(accepted, 202);
    },
  );

  app.get("/submissions/:id", async (c) => {
    const status = await store.get(c.req.param("id"));
    return status
      ? c.json(status)
      : c.json({ error: "Submission not found", details: null }, 404);
  });

  app.get("/submissions/:id/events", (c) => {
    const id = c.req.param("id");

    return streamSSE(c, async (stream) => {
      const deadline = Date.now() + config.streamTimeoutMs;
      let previous: string | null = null;

      while (!stream.aborted && Date.now() < deadline) {
        const status = await store.get(id);

        if (!status) {
          await stream.writeSSE({
            event: "error",
            data: JSON.stringify({ error: "Submission not found" }),
          });
          return;
        }

        // Only send when something actually changed, so a queued job does not
        // stream the same payload several times a second.
        const serialised = JSON.stringify(status);
        if (serialised !== previous) {
          previous = serialised;
          await stream.writeSSE({ event: "status", data: serialised });
        }

        if (isTerminal(status.state)) return;

        await stream.sleep(config.streamPollMs);
      }

      await stream.writeSSE({
        event: "timeout",
        data: JSON.stringify({ error: "Stream timed out" }),
      });
    });
  });

  app.get("/problems", (c) =>
    c.json(
      PROBLEMS.map((problem) => ({
        slug: problem.slug,
        title: problem.title,
        difficulty: problem.difficulty,
        summary: problem.summary,
      })),
    ),
  );

  app.get("/problems/:slug", (c) => {
    const problem = getProblem(c.req.param("slug"));

    // The original dereferenced an unknown id and crashed the page.
    if (!problem) {
      return c.json({ error: "Problem not found", details: null }, 404);
    }

    // Hidden tests are stripped here; they exist only on the server.
    return c.json(toPublicProblem(problem));
  });

  app.post(
    "/problems/:slug/submissions",
    zValidator("json", ProblemSubmissionSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          { error: "Invalid submission", details: result.error.issues },
          400,
        );
      }
      return undefined;
    }),
    async (c) => {
      const problem = getProblem(c.req.param("slug"));
      if (!problem) {
        return c.json({ error: "Problem not found", details: null }, 404);
      }

      const { language, code } = c.req.valid("json");

      // The server attaches the test cases, examples and hidden alike, so a
      // solution cannot be written against only what it was shown.
      const accepted = await store.enqueue({
        language,
        code,
        stdin: "",
        testcases: allTestCases(problem).map((test) => ({
          input: test.input,
          expectedOutput: test.expectedOutput,
        })),
      });

      logger.info(
        { id: accepted.id, problem: problem.slug, language },
        "problem submission queued",
      );

      return c.json(accepted, 202);
    },
  );

  app.notFound((c) =>
    c.json({ error: "Not found", details: null }, 404),
  );

  app.onError((error, c) => {
    logger.error({ err: error, path: c.req.path }, "unhandled error");

    // Never leak internals to the caller; the detail is in the logs.
    return c.json(
      {
        error: "Internal server error",
        details:
          config.nodeEnv === "production" ? null : String(error.message),
      },
      500,
    );
  });

  return app;
}

export type { SubmissionStatus };

/**
 * Identifies the caller for rate limiting.
 *
 * `x-forwarded-for` is only meaningful behind a proxy that sets it; deployments
 * must not expose the API directly if they rely on this.
 */
function clientKey(
  forwardedFor: string | undefined,
  realIp: string | undefined,
): string {
  const forwarded = forwardedFor?.split(",")[0]?.trim();
  return forwarded || realIp?.trim() || "unknown";
}
