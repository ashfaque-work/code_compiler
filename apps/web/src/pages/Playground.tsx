import { useEffect, useMemo, useState } from "react";
import type { LanguageId } from "@code-compiler/shared";
import { fetchLanguages, submitCode, type LanguageInfo } from "../lib/api.js";
import { isBusy, useSubmission } from "../hooks/useSubmission.js";
import { Editor } from "../components/Editor.js";
import { ResultPanel } from "../components/ResultPanel.js";
import { Shell } from "../components/Shell.js";

export function Playground() {
  const [languages, setLanguages] = useState<LanguageInfo[]>([]);
  const [language, setLanguage] = useState<LanguageId>("python");
  const [code, setCode] = useState("");
  const [stdin, setStdin] = useState("");
  const [showStdin, setShowStdin] = useState(false);

  const { state, run } = useSubmission();
  const busy = isBusy(state);

  useEffect(() => {
    let active = true;

    void fetchLanguages()
      .then((list) => {
        if (!active) return;
        setLanguages(list);
        const initial = list.find((item) => item.id === "python") ?? list[0];
        if (initial) {
          setLanguage(initial.id);
          setCode(initial.starterCode);
        }
      })
      .catch(() => {
        // The result panel reports an unreachable API; the picker just stays
        // empty rather than showing a second copy of the same error.
      });

    return () => {
      active = false;
    };
  }, []);

  const starterFor = useMemo(
    () => new Map(languages.map((item) => [item.id, item.starterCode])),
    [languages],
  );

  function switchLanguage(next: LanguageId) {
    // Only replace code the person has not touched.
    const untouched = code.trim() === "" || code === starterFor.get(language);

    setLanguage(next);
    if (untouched) setCode(starterFor.get(next) ?? "");
  }

  function handleRun() {
    if (busy || code.trim() === "") return;
    void run(() => submitCode({ language, code, stdin, testcases: [] }));
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        handleRun();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <Shell
      actions={
        <>
          <label className="sr-only" htmlFor="language">
            Language
          </label>
          <select
            id="language"
            value={language}
            disabled={languages.length === 0}
            onChange={(event) =>
              switchLanguage(event.target.value as LanguageId)
            }
            className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink disabled:opacity-50"
          >
            {languages.map((item) => (
              <option key={item.id} value={item.id}>
                {item.displayName}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleRun}
            disabled={busy || code.trim() === ""}
            className="rounded-md bg-action px-3.5 py-1.5 text-sm font-medium text-ground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Running" : "Run"}
          </button>
        </>
      }
    >
      <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
        <section className="flex min-h-0 flex-col border-line lg:border-r">
          <div className="min-h-0 flex-1">
            <Editor language={language} value={code} onChange={setCode} />
          </div>

          <div className="shrink-0 border-t border-line">
            <button
              type="button"
              onClick={() => setShowStdin((open) => !open)}
              className="flex w-full items-center gap-2 px-5 py-2.5 text-left text-sm text-muted hover:text-ink"
              aria-expanded={showStdin}
              aria-controls="stdin"
            >
              <span
                aria-hidden
                className={`transition-transform ${showStdin ? "rotate-90" : ""}`}
              >
                ›
              </span>
              Input
              {stdin.trim() !== "" && !showStdin && (
                <span className="text-xs text-action">in use</span>
              )}
            </button>

            <textarea
              id="stdin"
              hidden={!showStdin}
              value={stdin}
              onChange={(event) => setStdin(event.target.value)}
              rows={4}
              spellCheck={false}
              placeholder="Text passed to the program on standard input"
              className="w-full resize-none border-t border-line bg-surface px-5 py-3 font-mono text-sm text-ink placeholder:text-muted/60 focus:outline-none"
            />
          </div>
        </section>

        <section className="min-h-0 overflow-auto border-t border-line lg:border-t-0">
          <ResultPanel state={state} />
        </section>
      </div>
    </Shell>
  );
}
