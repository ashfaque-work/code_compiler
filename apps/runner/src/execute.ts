import { mkdtemp, rm, writeFile, chmod } from "node:fs/promises";
import { join } from "node:path";
import type {
  ExecutionResult,
  SubmissionRequest,
  TestCaseResult,
} from "@code-compiler/shared";
import { getLanguage } from "@code-compiler/languages";
import type { RunnerConfig } from "./config.js";
import type { Sandbox, SandboxOutcome } from "./sandbox.js";
import { classifyOutcome, outputsMatch } from "./status.js";

export class Executor {
  constructor(
    private readonly sandbox: Sandbox,
    private readonly config: RunnerConfig,
  ) {}

  async execute(request: SubmissionRequest): Promise<ExecutionResult> {
    const language = getLanguage(request.language);

    // A fresh directory per submission. The original wrote every request to the
    // same `temp.cpp` / `temp.out` inside its own source tree and never cleaned
    // up, so concurrent jobs would have raced over each other's files.
    const jobDir = await mkdtemp(join(this.config.jobDirRoot, "cc-job-"));

    try {
      // The container runs as uid 65534, which does not own this directory.
      await chmod(jobDir, 0o777);
      await writeFile(
        join(jobDir, language.sourceFile),
        request.code,
        "utf8",
      );

      let compileOutput = "";

      if (language.compile !== null) {
        const compiled = await this.sandbox.run({
          image: language.image,
          command: language.compile.command,
          args: language.compile.args,
          env: language.env,
          hostJobDir: jobDir,
          stdin: "",
          limits: this.limitsFor(
            this.config.compileTimeoutMs,
            this.config.compileCpus,
          ),
        });

        compileOutput = joinOutput(compiled);

        if (compiled.timedOut) {
          // Compilation was entirely unbounded in the original; only execution
          // had a timeout, so a template bomb ran until the queue gave up.
          return failure(
            "COMPILE_ERROR",
            `Compilation exceeded ${this.config.compileTimeoutMs} ms`,
            compiled.wallTimeMs,
          );
        }

        if (compiled.exitCode !== 0) {
          return failure("COMPILE_ERROR", compileOutput, compiled.wallTimeMs);
        }
      }

      return request.testcases.length > 0
        ? await this.runTestcases(request, jobDir, compileOutput)
        : await this.runOnce(request, jobDir, compileOutput);
    } finally {
      // Guaranteed teardown, including on the failure paths above.
      await rm(jobDir, { recursive: true, force: true }).catch(
        () => undefined,
      );
    }
  }

  private async runOnce(
    request: SubmissionRequest,
    jobDir: string,
    compileOutput: string,
  ): Promise<ExecutionResult> {
    const outcome = await this.runProgram(request, jobDir, request.stdin);

    return {
      status: classifyOutcome(outcome),
      stdout: outcome.stdout,
      stderr: outcome.stderr,
      compileOutput,
      exitCode: outcome.exitCode,
      timedOut: outcome.timedOut,
      usage: {
        wallTimeMs: outcome.wallTimeMs,
        memoryBytes: outcome.memoryBytes,
      },
      testResults: null,
    };
  }

  private async runTestcases(
    request: SubmissionRequest,
    jobDir: string,
    compileOutput: string,
  ): Promise<ExecutionResult> {
    const testResults: TestCaseResult[] = [];
    let peakMemory: number | null = null;
    let totalMs = 0;

    for (const [index, testcase] of request.testcases.entries()) {
      // Sequential on purpose. Containers are a bounded resource, and running
      // every test case at once would multiply the configured memory and CPU
      // caps by the test count.
      const outcome = await this.runProgram(request, jobDir, testcase.input);
      const status = classifyOutcome(outcome);

      totalMs += outcome.wallTimeMs;
      if (
        outcome.memoryBytes !== null &&
        (peakMemory === null || outcome.memoryBytes > peakMemory)
      ) {
        peakMemory = outcome.memoryBytes;
      }

      testResults.push({
        index,
        input: testcase.input,
        expectedOutput: testcase.expectedOutput,
        actualOutput: outcome.stdout,
        stderr: outcome.stderr,
        passed:
          status === "SUCCESS" &&
          outputsMatch(outcome.stdout, testcase.expectedOutput),
        status,
        wallTimeMs: outcome.wallTimeMs,
      });
    }

    // The submission's overall status reflects the first test case that did not
    // simply produce a wrong answer — a timeout is more informative than "FAIL".
    const firstFailure = testResults.find((t) => t.status !== "SUCCESS");

    return {
      status: firstFailure?.status ?? "SUCCESS",
      stdout: "",
      stderr: "",
      compileOutput,
      exitCode: null,
      timedOut: testResults.some((t) => t.status === "TIME_LIMIT_EXCEEDED"),
      usage: { wallTimeMs: totalMs, memoryBytes: peakMemory },
      testResults,
    };
  }

  private runProgram(
    request: SubmissionRequest,
    jobDir: string,
    stdin: string,
  ): Promise<SandboxOutcome> {
    const language = getLanguage(request.language);

    return this.sandbox.run({
      image: language.image,
      command: language.run.command,
      args: language.run.args,
      env: language.env,
      hostJobDir: jobDir,
      stdin,
      limits: this.limitsFor(this.config.executionTimeoutMs),
    });
  }

  private limitsFor(timeoutMs: number, cpus = this.config.cpus) {
    return {
      memoryMb: this.config.memoryMb,
      cpus,
      pidsLimit: this.config.pidsLimit,
      timeoutMs,
    };
  }
}

function joinOutput(outcome: SandboxOutcome): string {
  return [outcome.stderr, outcome.stdout].filter(Boolean).join("\n").trim();
}

function failure(
  status: ExecutionResult["status"],
  compileOutput: string,
  wallTimeMs: number,
): ExecutionResult {
  return {
    status,
    stdout: "",
    stderr: "",
    compileOutput,
    exitCode: null,
    timedOut: status === "TIME_LIMIT_EXCEEDED",
    usage: { wallTimeMs, memoryBytes: null },
    testResults: null,
  };
}
