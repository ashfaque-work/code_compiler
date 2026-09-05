import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ExecutionResult,
  SubmissionAccepted,
} from "@code-compiler/shared";
import { ApiError, streamStatus } from "../lib/api.js";

export type RunState =
  | { readonly phase: "idle" }
  | { readonly phase: "submitting" }
  | { readonly phase: "queued"; readonly id: string }
  | { readonly phase: "running"; readonly id: string }
  | { readonly phase: "done"; readonly result: ExecutionResult }
  | { readonly phase: "error"; readonly message: string };

export function isBusy(state: RunState): boolean {
  return (
    state.phase === "submitting" ||
    state.phase === "queued" ||
    state.phase === "running"
  );
}

/**
 * Submits code and follows the job to a terminal state.
 *
 * The POST returns as soon as the job is queued; progress arrives over SSE.
 * The UI therefore shows "queued" and "running" as distinct states instead of
 * one indefinite spinner.
 */
export function useSubmission() {
  const [state, setState] = useState<RunState>({ phase: "idle" });
  const closeStream = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    closeStream.current?.();
    closeStream.current = null;
  }, []);

  // A second run must not leave the first stream open.
  useEffect(() => stop, [stop]);

  /**
   * Takes a submitter rather than a payload, so the playground and the problem
   * pages share one piece of progress-tracking logic.
   */
  const run = useCallback(
    async (submit: () => Promise<SubmissionAccepted>) => {
      stop();
      setState({ phase: "submitting" });

      try {
        const accepted = await submit();
        setState({ phase: "queued", id: accepted.id });

        closeStream.current = streamStatus(accepted.id, {
          onStatus: (status) => {
            if (status.state === "completed" && status.result) {
              setState({ phase: "done", result: status.result });
              stop();
            } else if (status.state === "failed") {
              setState({
                phase: "error",
                message: status.error ?? "The run failed.",
              });
              stop();
            } else if (
              status.state === "queued" ||
              status.state === "running"
            ) {
              setState({ phase: status.state, id: status.id });
            } else {
              // Completed, but carrying no result payload.
              setState({
                phase: "error",
                message: "The run finished without returning a result.",
              });
              stop();
            }
          },
          onError: (message) => {
            setState({ phase: "error", message });
            stop();
          },
        });
      } catch (error) {
        setState({
          phase: "error",
          message:
            error instanceof ApiError
              ? error.message
              : "Could not reach the runner. Is the API running?",
        });
      }
    },
    [stop],
  );

  const reset = useCallback(() => {
    stop();
    setState({ phase: "idle" });
  }, [stop]);

  return { state, run, reset };
}
