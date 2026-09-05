import type { TestCaseResult } from "@code-compiler/shared";
import { statusMeta } from "../lib/status.js";
import { formatDuration } from "../lib/format.js";

interface TestResultsProps {
  readonly results: readonly TestCaseResult[];
  /** Cases beyond this index were held back while solving. */
  readonly visibleCount: number;
}

export function TestResults({ results, visibleCount }: TestResultsProps) {
  const passed = results.filter((result) => result.passed).length;
  const all = passed === results.length;

  return (
    <div className="result-enter">
      <div className="flex items-baseline gap-2 border-b border-line px-6 py-4">
        <span
          className={`size-2 rounded-full ${
            all ? "bg-status-success" : "bg-status-runtime"
          }`}
        />
        <h2 className={all ? "text-status-success" : "text-status-runtime"}>
          {passed} of {results.length} passed
        </h2>
      </div>

      <ol className="divide-y divide-line">
        {results.map((result, index) => (
          <TestRow
            key={result.index}
            result={result}
            hidden={index >= visibleCount}
          />
        ))}
      </ol>
    </div>
  );
}

function TestRow({
  result,
  hidden,
}: {
  readonly result: TestCaseResult;
  readonly hidden: boolean;
}) {
  const meta = statusMeta(result.status);

  return (
    <li className="px-6 py-4">
      <div className="flex items-center gap-2.5">
        <span
          className={`size-1.5 rounded-full ${
            result.passed ? "bg-status-success" : meta.dotClass
          }`}
        />
        <span className="text-sm text-ink">
          {hidden ? "Hidden case" : "Example"} {result.index + 1}
        </span>
        <span
          className={`text-sm ${
            result.passed ? "text-status-success" : meta.textClass
          }`}
        >
          {result.passed ? "passed" : result.status === "SUCCESS" ? "wrong answer" : meta.label.toLowerCase()}
        </span>
        <span className="ml-auto font-mono text-xs text-muted">
          {formatDuration(result.wallTimeMs)}
        </span>
      </div>

      {/* A failed hidden case reports the verdict but not the data, so the
          catalogue stays usable for the next person. */}
      {!result.passed && !hidden && (
        <dl className="mt-3 grid gap-2 font-mono text-xs">
          <Row label="Input" value={result.input} />
          <Row label="Expected" value={result.expectedOutput} />
          <Row label="Got" value={result.actualOutput || "(nothing)"} />
        </dl>
      )}

      {!result.passed && !hidden && result.stderr && (
        <pre className="mt-2 overflow-x-auto rounded-md bg-surface p-3 font-mono text-xs whitespace-pre-wrap text-status-runtime">
          {result.stderr}
        </pre>
      )}
    </li>
  );
}

function Row({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="whitespace-pre-wrap text-ink">{value}</dd>
    </div>
  );
}
