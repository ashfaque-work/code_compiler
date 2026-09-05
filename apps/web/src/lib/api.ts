import { z } from "zod";
import type { LanguageId } from "@code-compiler/shared";
import {
  LanguageIdSchema,
  SubmissionAcceptedSchema,
  SubmissionStatusSchema,
  type SubmissionAccepted,
  type SubmissionRequest,
  type SubmissionStatus,
} from "@code-compiler/shared";

/**
 * One base URL, supplied at build time.
 *
 * The original hardcoded two different API hosts on two different pages, so
 * one of them was always broken.
 */
export const API_URL: string =
  import.meta.env["VITE_API_URL"] ?? "http://localhost:8080";

export const LanguageInfoSchema = z.object({
  id: LanguageIdSchema,
  displayName: z.string(),
  starterCode: z.string(),
});

export type LanguageInfo = z.infer<typeof LanguageInfoSchema>;

export const ProblemSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  difficulty: z.string(),
  summary: z.string(),
});

export type ProblemSummary = z.infer<typeof ProblemSummarySchema>;

export const ProblemTestCaseSchema = z.object({
  input: z.string(),
  expectedOutput: z.string(),
});

/** Mirrors the server's public view — hidden tests are absent by design. */
export const PublicProblemSchema = ProblemSummarySchema.extend({
  statement: z.string(),
  inputContract: z.string(),
  outputContract: z.string(),
  examples: z.array(ProblemTestCaseSchema),
  starterCode: z.record(z.string(), z.string()),
});

export type PublicProblem = z.infer<typeof PublicProblemSchema>;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body
        ? String((body as { error: unknown }).error)
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }

  // Responses are validated against the same schemas the server uses, so a
  // contract change surfaces here rather than as a blank panel.
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("The server returned an unexpected response", 500);
  }

  return parsed.data;
}

export function fetchLanguages(): Promise<LanguageInfo[]> {
  return request("/languages", z.array(LanguageInfoSchema));
}

export function submitCode(
  submission: SubmissionRequest,
): Promise<SubmissionAccepted> {
  return request("/submissions", SubmissionAcceptedSchema, {
    method: "POST",
    body: JSON.stringify(submission),
  });
}

export function fetchProblems(): Promise<ProblemSummary[]> {
  return request("/problems", z.array(ProblemSummarySchema));
}

export function fetchProblem(slug: string): Promise<PublicProblem> {
  return request(
    `/problems/${encodeURIComponent(slug)}`,
    PublicProblemSchema,
  );
}

export function submitSolution(
  slug: string,
  solution: { language: LanguageId; code: string },
): Promise<SubmissionAccepted> {
  // No test cases are sent: the server attaches them, hidden ones included.
  return request(
    `/problems/${encodeURIComponent(slug)}/submissions`,
    SubmissionAcceptedSchema,
    { method: "POST", body: JSON.stringify(solution) },
  );
}

export function fetchStatus(id: string): Promise<SubmissionStatus> {
  return request(`/submissions/${encodeURIComponent(id)}`, SubmissionStatusSchema);
}

export interface StreamHandlers {
  onStatus(status: SubmissionStatus): void;
  onError(message: string): void;
}

/**
 * Subscribes to a submission's progress. Returns a function that closes it.
 *
 * The caller always gets a way to stop listening, so navigating away or
 * starting a second run cannot leave a stream open.
 */
export function streamStatus(id: string, handlers: StreamHandlers): () => void {
  const source = new EventSource(
    `${API_URL}/submissions/${encodeURIComponent(id)}/events`,
  );

  source.addEventListener("status", (event) => {
    const parsed = SubmissionStatusSchema.safeParse(
      JSON.parse((event as MessageEvent<string>).data),
    );

    if (parsed.success) {
      handlers.onStatus(parsed.data);
      if (parsed.data.state === "completed" || parsed.data.state === "failed") {
        source.close();
      }
    }
  });

  source.addEventListener("timeout", () => {
    handlers.onError("The run took longer than expected. Try again.");
    source.close();
  });

  source.addEventListener("error", () => {
    // EventSource retries on its own; only a closed stream is terminal.
    if (source.readyState === EventSource.CLOSED) {
      handlers.onError("Lost connection to the runner.");
    }
  });

  return () => source.close();
}
