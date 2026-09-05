import { Worker } from "bullmq";
import { Redis } from "ioredis";
import {
  SubmissionRequestSchema,
  SUBMISSION_QUEUE,
  type ExecutionResult,
} from "@code-compiler/shared";
import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { Sandbox } from "./sandbox.js";
import { Executor } from "./execute.js";

const config = loadConfig();
const log = createLogger(config.logLevel);

const sandbox = new Sandbox(config.dockerSocket);
const executor = new Executor(sandbox, config);

// Fail loudly at startup rather than on the first submission.
await sandbox.ping().catch((error: unknown) => {
  log.fatal(
    { err: error, socket: config.dockerSocket },
    "Cannot reach the Docker daemon",
  );
  process.exit(1);
});

// Clear anything a previous process left behind before taking new work.
const reaped = await sandbox.reapOrphans().catch(() => 0);
if (reaped > 0) {
  log.warn({ reaped }, "removed orphaned containers from a previous run");
}

const connection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

const worker = new Worker<unknown, ExecutionResult>(
  SUBMISSION_QUEUE,
  async (job) => {
    // The API validates too, but the runner does not trust the queue payload.
    const request = SubmissionRequestSchema.parse(job.data);
    log.info({ jobId: job.id, language: request.language }, "executing");

    const result = await executor.execute(request);
    log.info({ jobId: job.id, status: result.status }, "finished");
    return result;
  },
  { connection, concurrency: config.concurrency },
);

worker.on("failed", (job, error) => {
  log.error({ jobId: job?.id, err: error }, "job failed");
});

log.info(
  { concurrency: config.concurrency, queue: SUBMISSION_QUEUE },
  "runner ready",
);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void (async () => {
      log.info({ signal }, "shutting down");
      await worker.close();
      await connection.quit();
      process.exit(0);
    })();
  });
}
