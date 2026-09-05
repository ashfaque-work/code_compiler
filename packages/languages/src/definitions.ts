import type { LanguageId } from "@code-compiler/shared";
import { SANDBOX_DIR, type LanguageDefinition } from "./types.js";

const IMAGE_TAG = "1";
const image = (name: string): string => `code-compiler/${name}:${IMAGE_TAG}`;

/**
 * Java requires the public class to be named `Main`.
 *
 * The original inferred the class name with `/class\s+([A-Za-z_]\w*)/`, which
 * matched the *first* class in the file and failed whenever the public class
 * was not first. Fixing the filename by contract removes the guesswork.
 */
const JAVA_ENTRY_CLASS = "Main";

export const LANGUAGE_DEFINITIONS: Readonly<
  Record<LanguageId, LanguageDefinition>
> = {
  python: {
    id: "python",
    displayName: "Python",
    image: image("python"),
    sourceFile: "main.py",
    compile: null,
    run: { command: "python3", args: ["-I", `${SANDBOX_DIR}/main.py`] },
    // Bytecode writes would fail against a read-only root filesystem.
    env: { PYTHONDONTWRITEBYTECODE: "1", PYTHONUNBUFFERED: "1" },
    starterCode: 'print("Hello, world!")\n',
  },

  javascript: {
    id: "javascript",
    displayName: "JavaScript",
    image: image("node"),
    sourceFile: "main.js",
    compile: null,
    run: { command: "node", args: [`${SANDBOX_DIR}/main.js`] },
    env: { NODE_OPTIONS: "--no-warnings" },
    starterCode: 'console.log("Hello, world!");\n',
  },

  typescript: {
    id: "typescript",
    displayName: "TypeScript",
    image: image("node"),
    sourceFile: "main.ts",
    compile: null,
    // Node strips types natively; no tsc in the image and no transpile step.
    // Types are not checked at run time, which is the correct tradeoff here.
    run: { command: "node", args: [`${SANDBOX_DIR}/main.ts`] },
    env: { NODE_OPTIONS: "--no-warnings" },
    starterCode: 'const greeting: string = "Hello, world!";\nconsole.log(greeting);\n',
  },

  cpp: {
    id: "cpp",
    displayName: "C++",
    image: image("cpp"),
    sourceFile: "main.cpp",
    compile: {
      command: "g++",
      args: [
        "-std=c++20",
        "-O2",
        "-o",
        `${SANDBOX_DIR}/program`,
        `${SANDBOX_DIR}/main.cpp`,
      ],
    },
    run: { command: `${SANDBOX_DIR}/program`, args: [] },
    env: {},
    starterCode:
      '#include <iostream>\n\nint main() {\n    std::cout << "Hello, world!" << std::endl;\n    return 0;\n}\n',
  },

  java: {
    id: "java",
    displayName: "Java",
    image: image("java"),
    sourceFile: `${JAVA_ENTRY_CLASS}.java`,
    compile: {
      command: "javac",
      args: ["-d", SANDBOX_DIR, `${SANDBOX_DIR}/${JAVA_ENTRY_CLASS}.java`],
    },
    run: {
      command: "java",
      args: ["-XX:+UseSerialGC", "-cp", SANDBOX_DIR, JAVA_ENTRY_CLASS],
    },
    env: {},
    starterCode: `public class ${JAVA_ENTRY_CLASS} {\n    public static void main(String[] args) {\n        System.out.println("Hello, world!");\n    }\n}\n`,
  },

  go: {
    id: "go",
    displayName: "Go",
    image: image("go"),
    sourceFile: "main.go",
    compile: {
      command: "go",
      args: ["build", "-o", `${SANDBOX_DIR}/program`, `${SANDBOX_DIR}/main.go`],
    },
    run: { command: `${SANDBOX_DIR}/program`, args: [] },
    // All three must live on the bind-mounted job directory, not the tmpfs.
    // tmpfs pages are charged to the container's memory cgroup, so a build
    // cache there both exhausts the 64 MB mount ("no space left on device"
    // from the linker) and counts against the memory cap, which surfaced as
    // the compiler being OOM-killed. GOTMPDIR must already exist, so it points
    // at the job directory itself rather than a subdirectory.
    env: {
      GOCACHE: `${SANDBOX_DIR}/.gocache`,
      GOPATH: `${SANDBOX_DIR}/.go`,
      GOTMPDIR: SANDBOX_DIR,
      GOFLAGS: "-mod=mod",
    },
    starterCode:
      'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, world!")\n}\n',
  },

  rust: {
    id: "rust",
    displayName: "Rust",
    image: image("rust"),
    sourceFile: "main.rs",
    compile: {
      command: "rustc",
      args: [
        "-O",
        "--edition",
        "2021",
        "-o",
        `${SANDBOX_DIR}/program`,
        `${SANDBOX_DIR}/main.rs`,
      ],
    },
    run: { command: `${SANDBOX_DIR}/program`, args: [] },
    env: { TMPDIR: "/tmp" },
    starterCode:
      'fn main() {\n    println!("Hello, world!");\n}\n',
  },
};

export function getLanguage(id: LanguageId): LanguageDefinition {
  return LANGUAGE_DEFINITIONS[id];
}

export { JAVA_ENTRY_CLASS };
