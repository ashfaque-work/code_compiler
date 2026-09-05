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

/** What every submission is given. Constraints, stated as a spec. */
const SANDBOX_SPEC = [
  ["Network", "none"],
  ["Wall clock", "5 s"],
  ["Memory", "256 MB"],
  ["Processes", "64"],
  ["Filesystem", "read-only"],
  ["User", "non-root"],
] as const;

/**
 * An empty panel is an invitation, not a shrug.
 *
 * This is the largest surface on the page before a run, so it carries the one
 * thing worth saying about the project: what the container actually enforces.
 */
function Empty() {
  return (
    <div className="grid-field flex h-full flex-col items-center justify-center px-6 py-10">
      <p className="text-[15px] text-ink">Nothing has run yet</p>
      <p className="mt-2 max-w-[38ch] text-center text-[13px] leading-relaxed text-muted">
        Write something on the left and run it. Every run gets its own
        single-use container.
      </p>

      <dl className="mt-8 w-full max-w-xs divide-y divide-line-soft rounded-lg border border-line-soft bg-surface/50">
        {SANDBOX_SPEC.map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline justify-between px-4 py-2"
          >
            <dt className="text-[13px] text-muted">{label}</dt>
            <dd className="font-mono text-[13px] text-dim">{value}</dd>
          </div>
        ))}
      </dl>
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
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6">
      <span className="dot size-2 rounded-full bg-action pulse-soft" />
      <span className="text-sm text-dim">{copy}</span>
    </div>
  );
}

/** Errors say what happened and what to do, in the interface's voice. */
function Failure({ message }: { readonly message: string }) {
  return (
    <div className="result-enter px-6 py-6">
      <div className="flex items-center gap-2.5">
        <span className="dot size-2 rounded-full bg-status-internal" />
        <h2 className="text-[15px] text-ink">Could not run</h2>
      </div>
      <p className="mt-2 max-w-[52ch] text-[13px] leading-relaxed text-muted">
        {message}
      </p>
    </div>
  );
}

function Finished({ result }: { readonly result: ExecutionResult }) {
  const meta = statusMeta(result.status);
  const body = result.stdout || result.stderr || result.compileOutput;
  const streamLabel = result.stdout
    ? "stdout"
    : result.stderr
      ? "stderr"
      : "compiler";

  return (
    <div className="result-enter flex h-full flex-col">
      <header className="relative border-b border-line-soft px-6 py-5">
        {/* A thin bar in the status hue, so the verdict is legible before
            any text is read. */}
        <span
          className={`absolute inset-x-0 top-0 h-px ${meta.dotClass}`}
          aria-hidden
        />
        <div className="flex items-center gap-2.5">
          <span className={`dot size-2 rounded-full ${meta.dotClass}`} />
          <h2 className={`text-[15px] font-medium ${meta.textClass}`}>
            {meta.label}
          </h2>
          {result.exitCode !== null && (
            <span className="ml-auto rounded-md border border-line-soft bg-surface px-2 py-0.5 font-mono text-[11px] text-muted">
              exit {result.exitCode}
            </span>
          )}
        </div>
        <p className="mt-2 max-w-[52ch] text-[13px] leading-relaxed text-muted">
          {meta.detail}
        </p>
      </header>

      <div className="grid gap-5 border-b border-line-soft px-6 py-5">
        <Gauge
          label="Time"
          value={result.usage.wallTimeMs}
          limit={TIME_LIMIT_MS}
          formatted={formatDuration(result.usage.wallTimeMs)}
          limitLabel="5 s"
          barClass="bg-status-time"
          textClass="text-status-time"
        />
        <Gauge
          label="Memory"
          value={result.usage.memoryBytes}
          limit={MEMORY_LIMIT_BYTES}
          formatted={formatBytes(result.usage.memoryBytes)}
          limitLabel="256 MB"
          barClass="bg-status-memory"
          textClass="text-status-memory"
        />
        {result.usage.memoryBytes === null && (
          <p className="-mt-2 text-[12px] leading-relaxed text-muted">
            The run finished before a memory sample was taken.
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
        {body ? (
          <>
            <div className="mb-2 flex items-center gap-2">
              <span className="font-mono text-[11px] text-muted">
                {streamLabel}
              </span>
              <span className="h-px flex-1 bg-line-soft" />
            </div>
            <pre className="lift overflow-x-auto rounded-lg border border-line-soft bg-surface/60 p-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-dim">
              {body}
            </pre>
          </>
        ) : (
          <p className="text-[13px] text-muted">The program printed nothing.</p>
        )}
      </div>
    </div>
  );
}
