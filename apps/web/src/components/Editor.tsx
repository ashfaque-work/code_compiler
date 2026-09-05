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

const THEME = "exec-petrol";

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
        theme={THEME}
        beforeMount={(monaco) => {
          // Stock vs-dark sits on #1e1e1e and reads as a window pasted onto the
          // page. This matches the surrounding petrol ground exactly.
          monaco.editor.defineTheme(THEME, {
            base: "vs-dark",
            inherit: true,
            rules: [
              { token: "comment", foreground: "5b7780", fontStyle: "italic" },
              { token: "keyword", foreground: "4fd6e8" },
              { token: "string", foreground: "4fd1a5" },
              { token: "number", foreground: "f5b344" },
              { token: "type", foreground: "c79bff" },
              { token: "function", foreground: "eaf3f5" },
            ],
            colors: {
              "editor.background": "#081216",
              "editor.foreground": "#eaf3f5",
              "editorLineNumber.foreground": "#2c4c56",
              "editorLineNumber.activeForeground": "#6b8891",
              "editorCursor.foreground": "#4fd6e8",
              "editor.selectionBackground": "#1c353d",
              "editor.inactiveSelectionBackground": "#132831",
              "editorIndentGuide.background1": "#132831",
              "editorIndentGuide.activeBackground1": "#1c353d",
              "editorWidget.background": "#0d1b21",
              "editorWidget.border": "#1c353d",
              "editorSuggestWidget.background": "#0d1b21",
              "editorSuggestWidget.selectedBackground": "#14272e",
              "scrollbarSlider.background": "#1c353d80",
              "scrollbarSlider.hoverBackground": "#1c353d",
            },
          });
        }}
        options={{
          fontFamily: "IBM Plex Mono, ui-monospace, monospace",
          fontSize: 13.5,
          lineHeight: 1.75,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 18, bottom: 18 },
          renderLineHighlight: "none",
          smoothScrolling: true,
          tabSize: 2,
          automaticLayout: true,
          lineNumbersMinChars: 3,
          glyphMargin: false,
          folding: false,
          overviewRulerLanes: 0,
          scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
        }}
        loading={<EditorSkeleton />}
      />
    </Suspense>
  );
}

function EditorSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <span className="text-[13px] text-muted">Loading the editor</span>
    </div>
  );
}
