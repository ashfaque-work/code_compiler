import { Queue, QueueEvents } from "bullmq";
import type { Redis } from "ioredis";
import {
  SUBMISSION_QUEUE,
  RESULT_TTL_SECONDS,
  ExecutionResultSchema,
  type JobState,
  type SubmissionAccepted,
  type SubmissionRequest,
  type SubmissionStatus,
} from "@code-compiler/shared";

/**
 * Everything the HTTP layer needs from the queue.
 *
 * The routes depend on this interface rather than on BullMQ directly, so they
 * can be tested without a Redis instance.
 */
export interface SubmissionStore {
  enqueue(request: SubmissionRequest): Promise<SubmissionAccepted>;
  get(id: string): Promise<SubmissionStatus | null>;
  healthy(): Promise<boolean>;
  close(): Promise<void>;
}

export function isTerminal(state: JobState): boolean {
  return state === "completed" || state === "failed";
}

export class BullSubmissionStore implements SubmissionStore {
  readonly #queue: Queue;
  readonly #events: QueueEvents;

  constructor(private readonly connection: Redis) {
    this.#queue = new Queue(SUBMISSION_QUEUE, { connection });
    this.#events = new QueueEvents(SUBMISSION_QUEUE, { connection });
  }

  async enqueue(request: SubmissionRequest): Promise<SubmissionAccepted> {
    const job = await this.#queue.add(SUBMISSION_QUEUE, request, {
      // Submitted code is not idempotent and retrying it wastes a container.
      attempts: 1,
      removeOnComplete: { age: RESULT_TTL_SECONDS },
      removeOnFail: { age: RESULT_TTL_SECONDS },
    });

    return { id: String(job.id), state: "queued" };
  }

  async get(id: string): Promise<SubmissionStatus | null> {
    const job = await this.#queue.getJob(id);
    if (!job) return null;

    const state = toJobState(await job.getState());

    if (state === "completed") {
      // The worker's return value crosses a process boundary as JSON, so it is
      // validated rather than trusted on the way back in.
      let parsed = ExecutionResultSchema.safeParse(job.returnvalue);

      if (!parsed.success) {
        // `getJob` snapshots the job; `getState` queries fresh. A job that
        // finishes between those two calls yields a "completed" state paired
        // with a snapshot taken before the result was written. Re-read once
        // before treating it as corrupt.
        const fresh = await this.#queue.getJob(id);
        parsed = ExecutionResultSchema.safeParse(fresh?.returnvalue);
      }

      return parsed.success
        ? { id, state, result: parsed.data, error: null }
        : { id, state: "failed", result: null, error: "Malformed job result" };
    }

    if (state === "failed") {
      return {
        id,
        state,
        result: null,
        error: job.failedReason ?? "Execution failed",
      };
    }

    return { id, state, result: null, error: null };
  }

  async healthy(): Promise<boolean> {
    try {
      await this.connection.ping();
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.#events.close();
    await this.#queue.close();
  }
}

/**
 * BullMQ reports several in-flight states that mean the same thing to a caller
 * polling for a result.
 */
function toJobState(raw: string): JobState {
  switch (raw) {
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "active":
      return "running";
    default:
      return "queued";
  }
}
