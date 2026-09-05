import { useEffect, useState } from "react";
import { Link } from "react-router";
import { fetchProblems, type ProblemSummary } from "../lib/api.js";
import { Shell } from "../components/Shell.js";

type Load =
  | { readonly phase: "loading" }
  | { readonly phase: "ready"; readonly problems: ProblemSummary[] }
  | { readonly phase: "error" };

export function ProblemList() {
  const [load, setLoad] = useState<Load>({ phase: "loading" });

  useEffect(() => {
    let active = true;

    void fetchProblems()
      .then((problems) => active && setLoad({ phase: "ready", problems }))
      .catch(() => active && setLoad({ phase: "error" }));

    return () => {
      active = false;
    };
  }, []);

  return (
    <Shell>
      <div className="mx-auto h-full max-w-3xl overflow-auto px-6 py-12">
        <h1 className="text-xl text-ink">Problems</h1>
        <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-muted">
          Each problem states exactly how input arrives on stdin and ships
          starter code in every language that parses it for you. Some test cases
          are held back until you submit.
        </p>

        {load.phase === "loading" && (
          <p className="mt-10 text-sm text-muted">Loading problems</p>
        )}

        {load.phase === "error" && (
          <div className="mt-10 rounded-lg border border-line-soft bg-surface/50 px-5 py-4">
            <p className="text-ink">Could not load the problems</p>
            <p className="mt-1.5 text-sm text-muted">
              The API did not respond. Check that it is running, then reload.
            </p>
          </div>
        )}

        {load.phase === "ready" && (
          <ul className="mt-10 grid gap-2">
            {load.problems.map((problem) => (
              <li key={problem.slug}>
                <Link
                  to={`/problems/${problem.slug}`}
                  className="lift group flex items-baseline gap-4 rounded-lg border border-line-soft bg-surface/50 px-5 py-4 transition-colors hover:border-action/40 hover:bg-surface"
                >
                  <span className="text-ink transition-colors group-hover:text-action">
                    {problem.title}
                  </span>
                  <span className="hidden text-sm text-muted sm:block">
                    {problem.summary}
                  </span>
                  <span className="ml-auto shrink-0 rounded-full border border-line-soft px-2.5 py-0.5 font-mono text-[11px] text-muted">
                    {problem.difficulty}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}
