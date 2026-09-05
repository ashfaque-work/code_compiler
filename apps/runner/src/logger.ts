import { pino } from "pino";

export function createLogger(level: string) {
  return pino({
    level,
    base: { service: "runner" },
    redact: {
      // Never let a connection string with a password reach the logs.
      paths: ["redisUrl", "*.redisUrl", "config.redisUrl"],
      censor: "[redacted]",
    },
  });
}

export type Logger = ReturnType<typeof createLogger>;
