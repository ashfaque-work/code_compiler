import { serve } from "@hono/node-server";
import { Redis } from "ioredis";
import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { createApp } from "./app.js";
import { BullSubmissionStore } from "./store.js";
import { RedisRateLimitBackend } from "./rate-limit.js";

const config = loadConfig();
const logger = createLogger(config.logLevel);

const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
const store = new BullSubmissionStore(connection);

const app = createApp({
  config,
  store,
  rateLimit: new RedisRateLimitBackend(connection),
  logger,
});

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  logger.info(
    { port: info.port, origins: config.corsOrigins },
    "api listening",
  );
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void (async () => {
      logger.info({ signal }, "shutting down");
      server.close();
      await store.close();
      await connection.quit();
      process.exit(0);
    })();
  });
}
