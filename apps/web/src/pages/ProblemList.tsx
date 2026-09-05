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
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-lg text-ink">Problems</h1>
        <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-muted">
          Each problem states exactly how input arrives on stdin and ships
          starter code in every language that parses it for you. Some test
          cases are held back until you submit.
        </p>

        {load.phase === "loading" && (
          <p className="mt-8 text-sm text-muted">Loading problems</p>
        )}

        {load.phase === "error" && (
          <div className="mt-8">
            <p className="text-ink">Could not load the problems</p>
            <p className="mt-2 text-sm text-muted">
              The API did not respond. Check that it is running, then reload.
            </p>
          </div>
        )}

        {load.phase === "ready" && (
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {load.problems.map((problem) => (
              <li key={problem.slug}>
                <Link
                  to={`/problems/${problem.slug}`}
                  className="group flex items-baseline gap-4 py-4"
                >
                  <span className="text-ink group-hover:text-action">
                    {problem.title}
                  </span>
                  <span className="text-sm text-muted">{problem.summary}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted">
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
