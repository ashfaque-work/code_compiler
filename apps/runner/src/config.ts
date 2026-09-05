import { tmpdir } from "node:os";
import { z } from "zod";
import { DEFAULT_SANDBOX, DEFAULT_TIMEOUTS } from "@code-compiler/shared";

const numeric = (fallback: number) =>
  z.coerce.number().positive().default(fallback);

/**
 * Every knob comes from the environment. The original hardcoded the port, the
 * Redis host and the Redis password directly in source.
 */
const ConfigSchema = z.object({
  redisUrl: z.string().min(1).default("redis://localhost:6379"),
  dockerSocket: z.string().min(1).default("/var/run/docker.sock"),
  /**
   * Where per-job scratch directories are created.
   *
   * When the runner is itself containerised it creates *sibling* containers, so
   * the bind-mount source it names must be a path on the Docker host, not one
   * inside the runner's own filesystem. Mounting the same path at the same
   * location in the runner container keeps both views identical.
   */
  jobDirRoot: z.string().min(1).default(tmpdir()),
  concurrency: numeric(2),
  memoryMb: numeric(DEFAULT_SANDBOX.memoryMb),
  cpus: numeric(DEFAULT_SANDBOX.cpus),
  compileCpus: numeric(DEFAULT_SANDBOX.compileCpus),
  pidsLimit: numeric(DEFAULT_SANDBOX.pidsLimit),
  compileTimeoutMs: numeric(DEFAULT_TIMEOUTS.compileMs),
  executionTimeoutMs: numeric(DEFAULT_TIMEOUTS.executionMs),
  logLevel: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

export type RunnerConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): RunnerConfig {
  return ConfigSchema.parse({
    redisUrl: env["REDIS_URL"],
    dockerSocket: env["DOCKER_SOCKET"],
    jobDirRoot: env["JOB_DIR_ROOT"],
    concurrency: env["RUNNER_CONCURRENCY"],
    memoryMb: env["SANDBOX_MEMORY_MB"],
    cpus: env["SANDBOX_CPUS"],
    compileCpus: env["SANDBOX_COMPILE_CPUS"],
    pidsLimit: env["SANDBOX_PIDS_LIMIT"],
    compileTimeoutMs: env["COMPILE_TIMEOUT_MS"],
    executionTimeoutMs: env["EXECUTION_TIMEOUT_MS"],
    logLevel: env["LOG_LEVEL"],
  });
}
