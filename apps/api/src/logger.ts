import { pino } from "pino";

export function createLogger(level: string) {
  return pino({
    level,
    base: { service: "api" },
    redact: {
      paths: ["redisUrl", "*.redisUrl", "req.headers.authorization"],
      censor: "[redacted]",
    },
  });
}
