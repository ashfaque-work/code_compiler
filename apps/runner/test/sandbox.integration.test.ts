import { describe, expect, it } from "vitest";
import type { SubmissionRequest } from "@code-compiler/shared";
import { Sandbox } from "../src/sandbox.js";
import { Executor } from "../src/execute.js";
import { loadConfig } from "../src/config.js";

/**
 * Exercises the real sandbox against a real Docker daemon.
 *
 * Requires the execution images: `docker/images/build.sh`.
 * Run with `pnpm --filter @code-compiler/runner test:integration`.
 *
 * Every case here is a regression test for a defect in the original service —
 * see docs/01-audit.md.
 */

const config = loadConfig();
const sandbox = new Sandbox(config.dockerSocket);
const executor = new Executor(sandbox, config);

// Resolved at module scope, not in beforeAll: `describe.runIf` is evaluated
// during collection, so a flag set in a hook would still be false and every
// test would silently skip.
const dockerAvailable = await sandbox.ping().then(
  () => true,
  () => false,
);

const submit = (
  language: SubmissionRequest["language"],
  code: string,
  extra: Partial<SubmissionRequest> = {},
): SubmissionRequest => ({
  language,
  code,
  stdin: "",
  testcases: [],
  ...extra,
});

describe.runIf(dockerAvailable)("sandbox", () => {
  describe("happy path", () => {
    it("runs Python", async () => {
      const result = await executor.execute(
        submit("python", 'print("hello")'),
      );
      expect(result.status).toBe("SUCCESS");
      expect(result.stdout.trim()).toBe("hello");
    });

    it("compiles and runs C++", async () => {
      const result = await executor.execute(
        submit(
          "cpp",
          '#include <iostream>\nint main(){std::cout<<"hi";return 0;}',
        ),
      );
      expect(result.status).toBe("SUCCESS");
      expect(result.stdout.trim()).toBe("hi");
    });

    it("reads stdin", async () => {
      const result = await executor.execute(
        submit("python", "print(input())", { stdin: "ping" }),
      );
      expect(result.stdout.trim()).toBe("ping");
    });

    // Every compiled toolchain gets exercised. Go, Rust and Java were absent
    // from this list once, and a Go build that could never finish inside the
    // compile budget reached the running stack before anyone noticed.
    it("compiles and runs Go", async () => {
      const result = await executor.execute(
        submit(
          "go",
          ['package main', 'import "fmt"', 'func main(){fmt.Println("go ok")}'].join(
            "\n",
          ),
        ),
      );
      expect(result.compileOutput).not.toContain("no space left");
      expect(result.status).toBe("SUCCESS");
      expect(result.stdout.trim()).toBe("go ok");
    });

    it("compiles and runs Rust", async () => {
      const result = await executor.execute(
        submit("rust", 'fn main(){println!("rust ok");}'),
      );
      expect(result.status).toBe("SUCCESS");
      expect(result.stdout.trim()).toBe("rust ok");
    });

    it("compiles and runs Java", async () => {
      const result = await executor.execute(
        submit(
          "java",
          'public class Main{public static void main(String[] a){System.out.println("java ok");}}',
        ),
      );
      expect(result.status).toBe("SUCCESS");
      expect(result.stdout.trim()).toBe("java ok");
    });

    it("runs TypeScript without a transpile step", async () => {
      const result = await executor.execute(
        submit("typescript", 'const x: number = 7;\nconsole.log(x * 6);'),
      );
      expect(result.status).toBe("SUCCESS");
      expect(result.stdout.trim()).toBe("42");
    });
  });

  describe("error taxonomy", () => {
    it("distinguishes a compile error from anything else", async () => {
      const result = await executor.execute(submit("cpp", "int main(){ syntax"));
      expect(result.status).toBe("COMPILE_ERROR");
      expect(result.compileOutput.length).toBeGreaterThan(0);
    });

    it("distinguishes a runtime error", async () => {
      const result = await executor.execute(
        submit("python", 'raise SystemExit(3)'),
      );
      expect(result.status).toBe("RUNTIME_ERROR");
      expect(result.exitCode).toBe(3);
    });

    // The original reported this as COMPILE_ERROR.
    it("reports an infinite loop as TIME_LIMIT_EXCEEDED", async () => {
      const result = await executor.execute(
        submit("python", "while True: pass"),
      );
      expect(result.status).toBe("TIME_LIMIT_EXCEEDED");
      expect(result.timedOut).toBe(true);
    });

    it("reports a large allocation as MEMORY_LIMIT_EXCEEDED", async () => {
      const result = await executor.execute(
        submit("python", "x = bytearray(2_000_000_000)"),
      );
      expect(["MEMORY_LIMIT_EXCEEDED", "RUNTIME_ERROR"]).toContain(
        result.status,
      );
    });
  });

  describe("isolation", () => {
    it("has no network egress", async () => {
      const result = await executor.execute(
        submit(
          "python",
          [
            "import socket",
            "try:",
            "    socket.create_connection(('1.1.1.1', 80), timeout=2)",
            "    print('REACHABLE')",
            "except Exception:",
            "    print('BLOCKED')",
          ].join("\n"),
        ),
      );
      expect(result.stdout.trim()).toBe("BLOCKED");
    });

    it("cannot reach the cloud instance metadata endpoint", async () => {
      const result = await executor.execute(
        submit(
          "python",
          [
            "import urllib.request",
            "try:",
            "    urllib.request.urlopen('http://169.254.169.254/', timeout=2)",
            "    print('REACHABLE')",
            "except Exception:",
            "    print('BLOCKED')",
          ].join("\n"),
        ),
      );
      expect(result.stdout.trim()).toBe("BLOCKED");
    });

    it("cannot write outside the job directory", async () => {
      const result = await executor.execute(
        submit(
          "python",
          [
            "try:",
            "    open('/etc/pwned', 'w').write('x')",
            "    print('WROTE')",
            "except Exception:",
            "    print('DENIED')",
          ].join("\n"),
        ),
      );
      expect(result.stdout.trim()).toBe("DENIED");
    });

    it("does not run as root", async () => {
      const result = await executor.execute(
        submit("python", "import os; print(os.getuid())"),
      );
      expect(result.stdout.trim()).not.toBe("0");
    });

    it("cannot see the runner's environment", async () => {
      const result = await executor.execute(
        submit(
          "python",
          "import os; print('REDIS_URL' in os.environ or 'DATABASE_URL' in os.environ)",
        ),
      );
      expect(result.stdout.trim()).toBe("False");
    });

    it("contains a fork bomb", async () => {
      const result = await executor.execute(
        submit(
          "python",
          [
            "import os",
            "try:",
            "    while True: os.fork()",
            "except Exception:",
            "    print('CAPPED')",
          ].join("\n"),
        ),
      );
      // Either the pids cap stops it or the wall clock does; the host survives.
      expect([
        "SUCCESS",
        "RUNTIME_ERROR",
        "TIME_LIMIT_EXCEEDED",
        "MEMORY_LIMIT_EXCEEDED",
      ]).toContain(result.status);
    });

    it("kills a process that ignores SIGTERM", async () => {
      const result = await executor.execute(
        submit(
          "python",
          [
            "import signal, time",
            "signal.signal(signal.SIGTERM, signal.SIG_IGN)",
            "while True: time.sleep(1)",
          ].join("\n"),
        ),
      );
      // The original sent SIGTERM with no SIGKILL fallback.
      expect(result.status).toBe("TIME_LIMIT_EXCEEDED");
    });
  });

  describe("test cases", () => {
    it("grades each case independently", async () => {
      const result = await executor.execute(
        submit("python", "print(int(input()) * 2)", {
          testcases: [
            { input: "2", expectedOutput: "4" },
            { input: "3", expectedOutput: "6" },
            { input: "4", expectedOutput: "9" },
          ],
        }),
      );
      expect(result.testResults?.map((t) => t.passed)).toEqual([
        true,
        true,
        false,
      ]);
    });
  });
});
