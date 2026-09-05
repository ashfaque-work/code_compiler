import { z } from "zod";

/**
 * The original collapsed unrelated failures into `COMPILE_ERROR` — an infinite
 * loop and a syntax error produced the same status. These are distinct.
 */
export const ExecutionStatusSchema = z.enum([
  "SUCCESS",
  "COMPILE_ERROR",
  "RUNTIME_ERROR",
  "TIME_LIMIT_EXCEEDED",
  "MEMORY_LIMIT_EXCEEDED",
  "INTERNAL_ERROR",
]);

export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

/**
 * Figures reported by the container runtime.
 *
 * `memoryBytes` is null when the runtime did not report it. The original
 * reported `process.memoryUsage().heapUsed`, which measured the Node worker
 * thread rather than the submitted program — hello-world claimed 7.7 MB.
 */
export const ResourceUsageSchema = z.object({
  wallTimeMs: z.number().nonnegative(),
  memoryBytes: z.number().nonnegative().nullable(),
});

export type ResourceUsage = z.infer<typeof ResourceUsageSchema>;

export const TestCaseResultSchema = z.object({
  index: z.number().int().nonnegative(),
  input: z.string(),
  expectedOutput: z.string(),
  actualOutput: z.string(),
  stderr: z.string(),
  passed: z.boolean(),
  status: ExecutionStatusSchema,
  wallTimeMs: z.number().nonnegative(),
});

export type TestCaseResult = z.infer<typeof TestCaseResultSchema>;

export const ExecutionResultSchema = z.object({
  status: ExecutionStatusSchema,
  stdout: z.string(),
  stderr: z.string(),
  /** Compiler diagnostics. Empty for interpreted languages. */
  compileOutput: z.string(),
  /** Null when the process was killed rather than exiting on its own. */
  exitCode: z.number().int().nullable(),
  timedOut: z.boolean(),
  usage: ResourceUsageSchema,
  /** Null when the submission was run as a plain playground execution. */
  testResults: z.array(TestCaseResultSchema).nullable(),
});

export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

/** True when every test case passed. Vacuously true for zero test cases. */
export function allTestsPassed(result: ExecutionResult): boolean {
  return result.testResults?.every((t) => t.passed) ?? false;
}
