import { useEffect, useMemo, useState } from "react";
import type { LanguageId } from "@code-compiler/shared";
import { fetchLanguages, submitCode, type LanguageInfo } from "../lib/api.js";
import { isBusy, useSubmission } from "../hooks/useSubmission.js";
import { Editor } from "../components/Editor.js";
import { ResultPanel } from "../components/ResultPanel.js";
import { Chip, LanguageSelect, RunButton, Shell } from "../components/Shell.js";

/** Filename shown on the editor strip, matching what the runner writes. */
const SOURCE_FILE: Record<LanguageId, string> = {
  python: "main.py",
  javascript: "main.js",
  typescript: "main.ts",
  cpp: "main.cpp",
  java: "Main.java",
  go: "main.go",
  rust: "main.rs",
};

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
          <Chip>
            <span className="size-1 rounded-full bg-status-success" />
            no network · 5 s · 256 MB
          </Chip>
          <LanguageSelect
            value={language}
            disabled={languages.length === 0}
            onChange={(next) => switchLanguage(next as LanguageId)}
            options={languages.map((item) => ({
              id: item.id,
              label: item.displayName,
            }))}
          />
          <RunButton
            onClick={handleRun}
            busy={busy}
            disabled={busy || code.trim() === ""}
            label="Run"
            busyLabel="Running"
          />
        </>
      }
    >
      {/* Splits at 900px rather than Tailwind's lg, so a typical laptop window
          gets the editor and the readout side by side instead of stacking. */}
      <div className="grid h-full min-h-0 grid-cols-1 min-[900px]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col border-line-soft min-[900px]:border-r">
          <div className="flex shrink-0 items-center gap-2 border-b border-line-soft px-4 py-2">
            <span className="font-mono text-[11px] text-muted">
              {SOURCE_FILE[language]}
            </span>
            <span className="h-px flex-1 bg-line-soft" />
          </div>

          <div className="min-h-0 flex-1">
            <Editor language={language} value={code} onChange={setCode} />
          </div>

          <div className="shrink-0 border-t border-line-soft">
            <button
              type="button"
              onClick={() => setShowStdin((open) => !open)}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] text-muted transition-colors hover:text-ink"
              aria-expanded={showStdin}
              aria-controls="stdin"
            >
              <span
                aria-hidden
                className={`inline-block transition-transform ${showStdin ? "rotate-90" : ""}`}
              >
                ›
              </span>
              Input
              {stdin.trim() !== "" && (
                <span className="rounded-full bg-action/15 px-2 py-0.5 font-mono text-[10px] text-action">
                  in use
                </span>
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
              className="w-full resize-none border-t border-line-soft bg-surface/60 px-4 py-3 font-mono text-[13px] text-ink placeholder:text-muted/60 focus:outline-none"
            />
          </div>
        </section>

        <section className="min-h-0 overflow-auto border-t border-line-soft min-[900px]:border-t-0">
          <ResultPanel state={state} />
        </section>
      </div>
    </Shell>
  );
}
