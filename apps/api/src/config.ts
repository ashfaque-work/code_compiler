import { z } from "zod";
import { LIMITS } from "@code-compiler/shared";

const numeric = (fallback: number) =>
  z.coerce.number().positive().default(fallback);

/**
 * A comma-separated allowlist.
 *
 * The original set `origin: "*"` together with `credentials: true` — a
 * combination browsers reject outright — and left a comment conceding it was
 * "for testing purposes". A wildcard is not representable here.
 */
const OriginsSchema = z
  .string()
  .default("http://localhost:5173")
  .transform((raw) =>
    raw
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
  )
  .refine((origins) => origins.length > 0, "At least one origin is required")
  .refine(
    (origins) => !origins.includes("*"),
    'Wildcard origins are not permitted; list origins explicitly',
  );

const ConfigSchema = z.object({
  port: numeric(8080),
  nodeEnv: z.enum(["development", "test", "production"]).default("development"),
  corsOrigins: OriginsSchema,
  redisUrl: z.string().min(1).default("redis://localhost:6379"),

  /** Requests per window, per client IP. */
  rateLimitMax: numeric(60),
  rateLimitWindowMs: numeric(60_000),

  /**
   * Hard ceiling on request bodies. The original accepted 50 MB, which made
   * the per-field code-size limit meaningless.
   */
  maxBodyBytes: numeric(LIMITS.maxCodeBytes * 4),

  /** How often an open SSE stream re-reads job state. */
  streamPollMs: numeric(300),
  /** Streams are closed after this long regardless of job state. */
  streamTimeoutMs: numeric(120_000),

  logLevel: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

export type ApiConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  return ConfigSchema.parse({
    port: env["PORT"],
    nodeEnv: env["NODE_ENV"],
    corsOrigins: env["CORS_ORIGINS"],
    redisUrl: env["REDIS_URL"],
    rateLimitMax: env["RATE_LIMIT_MAX"],
    rateLimitWindowMs: env["RATE_LIMIT_WINDOW_MS"],
    maxBodyBytes: env["MAX_BODY_BYTES"],
    streamPollMs: env["STREAM_POLL_MS"],
    streamTimeoutMs: env["STREAM_TIMEOUT_MS"],
    logLevel: env["LOG_LEVEL"],
  });
}
