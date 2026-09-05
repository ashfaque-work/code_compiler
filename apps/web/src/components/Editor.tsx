import { lazy, Suspense } from "react";
import type { LanguageId } from "@code-compiler/shared";

// Monaco dwarfs the rest of the app, so it loads only once the editor is
// actually on screen. The original shipped every language pack eagerly and
// produced a 1 MB bundle.
const MonacoEditor = lazy(() =>
  import("@monaco-editor/react").then((m) => ({ default: m.default })),
);

/** Our language ids are not all Monaco's. */
const MONACO_LANGUAGE: Record<LanguageId, string> = {
  python: "python",
  javascript: "javascript",
  typescript: "typescript",
  cpp: "cpp",
  java: "java",
  go: "go",
  rust: "rust",
};

interface EditorProps {
  readonly language: LanguageId;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

export function Editor({ language, value, onChange }: EditorProps) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <MonacoEditor
        language={MONACO_LANGUAGE[language]}
        value={value}
        onChange={(next) => onChange(next ?? "")}
        theme="vs-dark"
        options={{
          fontFamily: "IBM Plex Mono, ui-monospace, monospace",
          fontSize: 13.5,
          lineHeight: 1.7,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 18, bottom: 18 },
          renderLineHighlight: "none",
          smoothScrolling: true,
          tabSize: 2,
          automaticLayout: true,
        }}
        loading={<EditorSkeleton />}
      />
    </Suspense>
  );
}

function EditorSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <span className="text-sm text-muted">Loading the editor</span>
    </div>
  );
}
