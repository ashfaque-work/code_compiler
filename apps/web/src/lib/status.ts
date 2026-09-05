import type { ExecutionStatus } from "@code-compiler/shared";

export interface StatusMeta {
  /** Written for someone reading their own result, not for the API. */
  readonly label: string;
  /** What happened, and where to look next. */
  readonly detail: string;
  readonly dotClass: string;
  readonly textClass: string;
  readonly borderClass: string;
}

/**
 * Status never signals by colour alone — every state carries a label and a
 * sentence, so the six hues are reinforcement rather than the only channel.
 */
export const STATUS_META: Record<ExecutionStatus, StatusMeta> = {
  SUCCESS: {
    label: "Finished",
    detail: "The program ran to completion and exited cleanly.",
    dotClass: "bg-status-success",
    textClass: "text-status-success",
    borderClass: "border-status-success/40",
  },
  COMPILE_ERROR: {
    label: "Did not compile",
    detail: "The compiler rejected the source. Its output is below.",
    dotClass: "bg-status-compile",
    textClass: "text-status-compile",
    borderClass: "border-status-compile/40",
  },
  RUNTIME_ERROR: {
    label: "Crashed",
    detail: "The program started but exited with an error.",
    dotClass: "bg-status-runtime",
    textClass: "text-status-runtime",
    borderClass: "border-status-runtime/40",
  },
  TIME_LIMIT_EXCEEDED: {
    label: "Ran out of time",
    detail: "Execution hit the time limit and was stopped.",
    dotClass: "bg-status-time",
    textClass: "text-status-time",
    borderClass: "border-status-time/40",
  },
  MEMORY_LIMIT_EXCEEDED: {
    label: "Ran out of memory",
    detail: "The program asked for more memory than the sandbox allows.",
    dotClass: "bg-status-memory",
    textClass: "text-status-memory",
    borderClass: "border-status-memory/40",
  },
  INTERNAL_ERROR: {
    label: "Runner failed",
    detail: "Something went wrong on our side, not in your code.",
    dotClass: "bg-status-internal",
    textClass: "text-status-internal",
    borderClass: "border-status-internal/40",
  },
};

export function statusMeta(status: ExecutionStatus): StatusMeta {
  return STATUS_META[status];
}
