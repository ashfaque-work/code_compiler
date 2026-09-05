import type { Redis } from "ioredis";

export interface RateLimitBackend {
  /** Returns the request count within the current window for this key. */
  increment(key: string, windowMs: number): Promise<number>;
}

/**
 * Fixed-window counter held in Redis.
 *
 * Redis rather than process memory because the limit has to hold across API
 * replicas. The original used an in-process store, so its "100 requests per
 * IP" became 100 per replica.
 */
export class RedisRateLimitBackend implements RateLimitBackend {
  constructor(private readonly redis: Redis) {}

  async increment(key: string, windowMs: number): Promise<number> {
    const window = Math.floor(Date.now() / windowMs);
    const bucket = `ratelimit:${key}:${window}`;

    const [count] = await this.redis
      .multi()
      .incr(bucket)
      // NX so the window is not extended by later requests inside it.
      .pexpire(bucket, windowMs, "NX")
      .exec()
      .then((replies) => (replies ?? []).map(([, value]) => Number(value)));

    return count ?? 1;
  }
}

/** In-process backend. Correct for a single replica; used by the tests. */
export class MemoryRateLimitBackend implements RateLimitBackend {
  readonly #counts = new Map<string, number>();

  increment(key: string, windowMs: number): Promise<number> {
    const window = Math.floor(Date.now() / windowMs);
    const bucket = `${key}:${window}`;
    const next = (this.#counts.get(bucket) ?? 0) + 1;

    this.#counts.set(bucket, next);

    // Drop buckets from earlier windows so the map cannot grow without bound.
    for (const existing of this.#counts.keys()) {
      if (!existing.endsWith(`:${window}`)) this.#counts.delete(existing);
    }

    return Promise.resolve(next);
  }
}

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly retryAfterSeconds: number;
}

export async function checkRateLimit(
  backend: RateLimitBackend,
  key: string,
  max: number,
  windowMs: number,
): Promise<RateLimitDecision> {
  const count = await backend.increment(key, windowMs);
  const elapsed = Date.now() % windowMs;

  return {
    allowed: count <= max,
    limit: max,
    remaining: Math.max(0, max - count),
    retryAfterSeconds: Math.ceil((windowMs - elapsed) / 1000),
  };
}
