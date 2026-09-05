import { z } from "zod";
import { LanguageIdSchema } from "./language.js";
import { LIMITS } from "./limits.js";
import { ExecutionResultSchema } from "./execution.js";

export const TestCaseSchema = z.object({
  input: z.string(),
  expectedOutput: z.string(),
});

export type TestCase = z.infer<typeof TestCaseSchema>;

/**
 * The single source of truth for what `POST /submissions` accepts.
 *
 * Both the API and the web client import this, so the two cannot drift. The
 * original hardcoded different API URLs on two pages and had no validation at
 * all on either side.
 */
export const SubmissionRequestSchema = z.object({
  language: LanguageIdSchema,
  code: z
    .string()
    .min(1, "Code cannot be empty")
    .max(LIMITS.maxCodeBytes, `Code exceeds ${LIMITS.maxCodeBytes} bytes`),
  stdin: z.string().max(LIMITS.maxStdinBytes).default(""),
  testcases: z.array(TestCaseSchema).max(LIMITS.maxTestcases).default([]),
});

export type SubmissionRequest = z.infer<typeof SubmissionRequestSchema>;

/**
 * A submission against a catalogued problem.
 *
 * Deliberately carries no test cases: the server attaches them, so hidden
 * cases never travel to the client and cannot be special-cased.
 */
export const ProblemSubmissionSchema = z.object({
  language: LanguageIdSchema,
  code: z
    .string()
    .min(1, "Code cannot be empty")
    .max(LIMITS.maxCodeBytes, `Code exceeds ${LIMITS.maxCodeBytes} bytes`),
});

export type ProblemSubmission = z.infer<typeof ProblemSubmissionSchema>;

export const JobStateSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
]);

export type JobState = z.infer<typeof JobStateSchema>;

/**
 * Returned immediately by `POST /submissions`.
 *
 * The original awaited `job.finished()` inside the request handler, holding the
 * HTTP connection open for the entire job and defeating the point of a queue.
 */
export const SubmissionAcceptedSchema = z.object({
  id: z.string().min(1),
  state: JobStateSchema,
});

export type SubmissionAccepted = z.infer<typeof SubmissionAcceptedSchema>;

export const SubmissionStatusSchema = z.object({
  id: z.string().min(1),
  state: JobStateSchema,
  result: ExecutionResultSchema.nullable(),
  error: z.string().nullable(),
});

export type SubmissionStatus = z.infer<typeof SubmissionStatusSchema>;

export const ApiErrorSchema = z.object({
  error: z.string(),
  details: z.unknown().nullable(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
