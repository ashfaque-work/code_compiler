import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { LANGUAGE_DISPLAY_NAMES, type LanguageId } from "@code-compiler/shared";
import {
  ApiError,
  fetchProblem,
  submitSolution,
  type PublicProblem,
} from "../lib/api.js";
import { isBusy, useSubmission } from "../hooks/useSubmission.js";
import { Editor } from "../components/Editor.js";
import { TestResults } from "../components/TestResults.js";
import { Shell } from "../components/Shell.js";
import { NotFound } from "./NotFound.js";

type Load =
  | { readonly phase: "loading" }
  | { readonly phase: "ready"; readonly problem: PublicProblem }
  | { readonly phase: "missing" }
  | { readonly phase: "error" };

const LANGUAGES = Object.keys(LANGUAGE_DISPLAY_NAMES) as LanguageId[];

export function ProblemPage() {
  const { slug = "" } = useParams();
  const [load, setLoad] = useState<Load>({ phase: "loading" });
  const [language, setLanguage] = useState<LanguageId>("python");
  const [code, setCode] = useState("");

  const { state, run, reset } = useSubmission();
  const busy = isBusy(state);

  useEffect(() => {
    let active = true;
    setLoad({ phase: "loading" });
    reset();

    void fetchProblem(slug)
      .then((problem) => {
        if (!active) return;
        setLoad({ phase: "ready", problem });
        setCode(problem.starterCode[language] ?? "");
      })
      .catch((error: unknown) => {
        if (!active) return;
        // A missing problem is a 404 page, not a crash. The original
        // dereferenced an unknown id and took the whole page down.
        setLoad(
          error instanceof ApiError && error.status === 404
            ? { phase: "missing" }
            : { phase: "error" },
        );
      });

    return () => {
      active = false;
    };
  }, [slug]);

  if (load.phase === "missing") return <NotFound />;

  const problem = load.phase === "ready" ? load.problem : null;

  function switchLanguage(next: LanguageId) {
    if (!problem) return;
    const untouched =
      code.trim() === "" || code === problem.starterCode[language];

    setLanguage(next);
    if (untouched) setCode(problem.starterCode[next] ?? "");
  }

  function handleSubmit() {
    if (!problem || busy || code.trim() === "") return;
    void run(() => submitSolution(problem.slug, { language, code }));
  }

  return (
    <Shell
      actions={
        problem ? (
          <>
            <label className="sr-only" htmlFor="language">
              Language
            </label>
            <select
              id="language"
              value={language}
              onChange={(event) =>
                switchLanguage(event.target.value as LanguageId)
              }
              className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink"
            >
              {LANGUAGES.map((id) => (
                <option key={id} value={id}>
                  {LANGUAGE_DISPLAY_NAMES[id]}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy || code.trim() === ""}
              className="rounded-md bg-action px-3.5 py-1.5 text-sm font-medium text-ground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Checking" : "Submit"}
            </button>
          </>
        ) : undefined
      }
    >
      {load.phase === "loading" && (
        <p className="px-6 py-10 text-sm text-muted">Loading the problem</p>
      )}

      {load.phase === "error" && (
        <div className="px-6 py-10">
          <p className="text-ink">Could not load this problem</p>
          <p className="mt-2 text-sm text-muted">
            The API did not respond. Check that it is running, then reload.
          </p>
        </div>
      )}

      {problem && (
        <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[1fr_1.1fr]">
          <section className="min-h-0 overflow-auto border-line px-6 py-6 lg:border-r">
            <h1 className="text-lg text-ink">{problem.title}</h1>
            <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-muted">
              {problem.statement}
            </p>

            <Contract title="Input" body={problem.inputContract} />
            <Contract title="Output" body={problem.outputContract} />

            <h2 className="mt-6 text-sm text-ink">Examples</h2>
            <ul className="mt-2 grid gap-2">
              {problem.examples.map((example, index) => (
                <li
                  key={index}
                  className="grid gap-1 rounded-md border border-line bg-surface p-3 font-mono text-xs"
                >
                  <Pair label="in" value={example.input} />
                  <Pair label="out" value={example.expectedOutput} />
                </li>
              ))}
            </ul>
          </section>

          <section className="flex min-h-0 flex-col">
            <div className="min-h-0 flex-1">
              <Editor language={language} value={code} onChange={setCode} />
            </div>

            <div className="max-h-[45%] min-h-0 shrink-0 overflow-auto border-t border-line">
              <Verdict state={state} visibleCount={problem.examples.length} />
            </div>
          </section>
        </div>
      )}
    </Shell>
  );
}

function Verdict({
  state,
  visibleCount,
}: {
  readonly state: ReturnType<typeof useSubmission>["state"];
  readonly visibleCount: number;
}) {
  if (state.phase === "idle") {
    return (
      <p className="px-6 py-5 text-sm text-muted">
        Fill in the function, then submit. Your solution runs against the
        examples above and against cases you have not seen.
      </p>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="px-6 py-5">
        <p className="text-ink">Could not check your solution</p>
        <p className="mt-1 text-sm text-muted">{state.message}</p>
      </div>
    );
  }

  if (state.phase !== "done") {
    return (
      <p className="px-6 py-5 text-sm text-muted">
        {state.phase === "queued" ? "Waiting for a container" : "Running"}
      </p>
    );
  }

  const { result } = state;

  if (result.status === "COMPILE_ERROR") {
    return (
      <div className="result-enter px-6 py-5">
        <p className="text-status-compile">Did not compile</p>
        <pre className="mt-2 overflow-x-auto font-mono text-xs whitespace-pre-wrap text-muted">
          {result.compileOutput}
        </pre>
      </div>
    );
  }

  if (!result.testResults) {
    return <p className="px-6 py-5 text-sm text-muted">No cases were run.</p>;
  }

  return (
    <TestResults results={result.testResults} visibleCount={visibleCount} />
  );
}

function Contract({
  title,
  body,
}: {
  readonly title: string;
  readonly body: string;
}) {
  return (
    <div className="mt-5">
      <h2 className="text-sm text-ink">{title}</h2>
      <p className="mt-1 font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted">
        {body}
      </p>
    </div>
  );
}

function Pair({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="grid grid-cols-[2rem_1fr] gap-2">
      <span className="text-muted">{label}</span>
      <span className="whitespace-pre-wrap text-ink">{value}</span>
    </div>
  );
}
