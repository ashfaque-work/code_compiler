import type { ExecutionResult } from "@code-compiler/shared";
import { statusMeta } from "../lib/status.js";
import { formatBytes, formatDuration } from "../lib/format.js";
import { Gauge } from "./Gauge.js";
import type { RunState } from "../hooks/useSubmission.js";

const TIME_LIMIT_MS = 5000;
const MEMORY_LIMIT_BYTES = 256 * 1024 * 1024;

export function ResultPanel({ state }: { readonly state: RunState }) {
  if (state.phase === "idle") return <Empty />;
  if (state.phase === "error") return <Failure message={state.message} />;
  if (state.phase !== "done") return <Progress phase={state.phase} />;

  return <Finished result={state.result} />;
}

/** An empty panel is an invitation to act, not a shrug. */
function Empty() {
  return (
    <div className="flex h-full flex-col justify-center px-6 py-10 text-center">
      <p className="text-ink">Nothing has run yet</p>
      <p className="mx-auto mt-2 max-w-[42ch] text-sm leading-relaxed text-muted">
        Write something on the left and run it. Each run gets its own container
        with no network, a 5 second limit and 256 MB of memory.
      </p>
    </div>
  );
}

function Progress({ phase }: { readonly phase: string }) {
  const copy =
    phase === "submitting"
      ? "Sending your code"
      : phase === "queued"
        ? "Waiting for a free container"
        : "Running";

  return (
    <div className="flex h-full flex-col justify-center px-6 text-center">
      <div className="mx-auto flex items-center gap-2.5">
        <span className="size-2 animate-pulse rounded-full bg-action" />
        <span className="text-sm text-ink">{copy}</span>
      </div>
    </div>
  );
}

/** Errors say what happened and what to do, in the interface's voice. */
function Failure({ message }: { readonly message: string }) {
  return (
    <div className="result-enter px-6 py-6">
      <div className="flex items-center gap-2.5">
        <span className="size-2 rounded-full bg-status-internal" />
        <h2 className="text-ink">Could not run</h2>
      </div>
      <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-muted">
        {message}
      </p>
    </div>
  );
}

function Finished({ result }: { readonly result: ExecutionResult }) {
  const meta = statusMeta(result.status);
  const body = result.stdout || result.stderr || result.compileOutput;

  return (
    <div className="result-enter flex h-full flex-col">
      <header className={`border-b ${meta.borderClass} px-6 py-5`}>
        <div className="flex items-center gap-2.5">
          <span className={`size-2 rounded-full ${meta.dotClass}`} />
          <h2 className={`font-medium ${meta.textClass}`}>{meta.label}</h2>
          {result.exitCode !== null && (
            <span className="ml-auto font-mono text-xs text-muted">
              exit {result.exitCode}
            </span>
          )}
        </div>
        <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-muted">
          {meta.detail}
        </p>
      </header>

      <div className="grid gap-4 border-b border-line px-6 py-5">
        <Gauge
          label="Time"
          value={result.usage.wallTimeMs}
          limit={TIME_LIMIT_MS}
          formatted={formatDuration(result.usage.wallTimeMs)}
          limitLabel="5 s"
          barClass="bg-status-time"
        />
        <Gauge
          label="Memory"
          value={result.usage.memoryBytes}
          limit={MEMORY_LIMIT_BYTES}
          formatted={formatBytes(result.usage.memoryBytes)}
          limitLabel="256 MB"
          barClass="bg-status-memory"
        />
        {result.usage.memoryBytes === null && (
          <p className="-mt-1 text-xs leading-relaxed text-muted">
            The run finished before a memory sample was taken.
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
        {body ? (
          <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-ink">
            {body}
          </pre>
        ) : (
          <p className="text-sm text-muted">The program printed nothing.</p>
        )}
      </div>
    </div>
  );
}
