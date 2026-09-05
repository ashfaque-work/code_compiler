import Docker from "dockerode";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { LIMITS } from "@code-compiler/shared";
import { SANDBOX_DIR } from "@code-compiler/languages";
import { OutputBuffer } from "./output-buffer.js";

export interface SandboxLimits {
  readonly memoryMb: number;
  readonly cpus: number;
  readonly pidsLimit: number;
  readonly timeoutMs: number;
}

export interface SandboxRequest {
  readonly image: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly env: Readonly<Record<string, string>>;
  /** Host directory bind-mounted at {@link SANDBOX_DIR}. */
  readonly hostJobDir: string;
  readonly stdin: string;
  readonly limits: SandboxLimits;
}

export interface SandboxOutcome {
  readonly stdout: string;
  readonly stderr: string;
  /** Null when the container was killed rather than exiting on its own. */
  readonly exitCode: number | null;
  readonly timedOut: boolean;
  readonly oomKilled: boolean;
  readonly wallTimeMs: number;
  readonly memoryBytes: number | null;
}

const BYTES_PER_MB = 1024 * 1024;
const NANO_CPUS_PER_CPU = 1e9;
const STATS_POLL_MS = 100;
/** Input is delivered as a file in the job directory, not over a socket. */
const STDIN_FILE = "stdin.txt";
/** Marks execution containers so orphans can be found after a crash. */
const OWNER_LABEL = "code-compiler.owner";
const OWNER_VALUE = "runner";
/** Grace period for the log stream to drain after the container exits. */
const FLUSH_GRACE_MS = 2000;

/**
 * Runs one command in a single-use container.
 *
 * Every isolation control below replaces something the original did not have:
 * it executed submitted code with `child_process.spawn` directly inside the
 * long-lived API container, as root, with full network access.
 */
export class Sandbox {
  readonly #docker: Docker;

  constructor(socketPath: string) {
    this.#docker = new Docker({ socketPath });
  }

  async ping(): Promise<void> {
    await this.#docker.ping();
  }

  /**
   * Removes execution containers left behind by a previous run.
   *
   * Containers are removed in a `finally` block, but a runner that is killed
   * outright never reaches it. Sweeping labelled orphans at startup keeps a
   * crash from slowly filling the host with dead containers.
   *
   * Only containers carrying this runner's label are touched.
   */
  async reapOrphans(): Promise<number> {
    const orphans = await this.#docker.listContainers({
      all: true,
      filters: { label: [`${OWNER_LABEL}=${OWNER_VALUE}`] },
    });

    let removed = 0;
    for (const orphan of orphans) {
      const ok = await this.#docker
        .getContainer(orphan.Id)
        .remove({ force: true })
        .then(
          () => true,
          () => false,
        );
      if (ok) removed += 1;
    }

    return removed;
  }

  async run(request: SandboxRequest): Promise<SandboxOutcome> {
    const { limits } = request;

    // Input arrives as a file rather than over an attached socket.
    //
    // Streaming stdin into the container races the container's own startup:
    // bytes written before the process is ready are dropped, and the
    // half-close that signals EOF can arrive before or after the write lands.
    // The symptom is a program that intermittently sees empty or concatenated
    // input. Redirecting from a file removes the race entirely — the data is
    // on disk before the container exists.
    await writeFile(
      join(request.hostJobDir, STDIN_FILE),
      request.stdin,
      "utf8",
    );

    const container = await this.#docker.createContainer({
      Image: request.image,
      // `exec` replaces the shell, so signals reach the real process and the
      // wrapper costs no extra entry against the pids limit once running.
      Cmd: [
        "/bin/sh",
        "-c",
        `exec "$@" < ${SANDBOX_DIR}/${STDIN_FILE}`,
        "sh",
        request.command,
        ...request.args,
      ],
      Env: Object.entries(request.env).map(([k, v]) => `${k}=${v}`),
      WorkingDir: SANDBOX_DIR,

      // Lets a restarted runner identify and clean up its own leftovers.
      Labels: { [OWNER_LABEL]: OWNER_VALUE },

      // Never root, even inside a throwaway container.
      User: "65534:65534",

      AttachStdout: true,
      AttachStderr: true,
      Tty: false,

      // Docker's own DNS/hostname plumbing is unnecessary with no network.
      NetworkDisabled: true,

      HostConfig: {
        Binds: [`${request.hostJobDir}:${SANDBOX_DIR}:rw`],

        // No egress at all. This is what blocks reading the cloud instance
        // metadata endpoint for IAM credentials.
        NetworkMode: "none",

        // Nothing outside the job directory and /tmp is writable.
        ReadonlyRootfs: true,
        Tmpfs: { "/tmp": "rw,nosuid,nodev,size=64m" },

        Memory: limits.memoryMb * BYTES_PER_MB,
        // Equal to Memory disables swap, so the memory cap is real.
        MemorySwap: limits.memoryMb * BYTES_PER_MB,
        NanoCpus: Math.round(limits.cpus * NANO_CPUS_PER_CPU),

        // Fork-bomb containment.
        PidsLimit: limits.pidsLimit,

        CapDrop: ["ALL"],
        SecurityOpt: ["no-new-privileges"],

        AutoRemove: false,
        RestartPolicy: { Name: "no", MaximumRetryCount: 0 },
      },
    });

    const stdout = new OutputBuffer(LIMITS.maxOutputBytes);
    const stderr = new OutputBuffer(LIMITS.maxOutputBytes);

    let timedOut = false;
    let timer: NodeJS.Timeout | undefined;
    let stopStats: (() => number | null) | undefined;

    const startedAt = process.hrtime.bigint();

    try {
      await container.start();
      stopStats = this.#pollMemory(container);

      // `logs` replays from the start of the container, so opening it after
      // `start()` loses nothing even for a program that exits immediately.
      const logStream = (await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
      })) as unknown as NodeJS.ReadableStream;

      this.#docker.modem.demuxStream(logStream, stdout, stderr);

      const flushed = new Promise<void>((resolve) => {
        logStream.once("end", resolve);
        logStream.once("close", resolve);
        logStream.once("error", resolve);
      });

      timer = setTimeout(() => {
        timedOut = true;
        // SIGKILL, not SIGTERM. The original sent SIGTERM with no fallback, so
        // a process ignoring it ran indefinitely.
        void container.kill({ signal: "SIGKILL" }).catch(() => undefined);
      }, limits.timeoutMs);

      await container.wait();
      await withTimeout(flushed, FLUSH_GRACE_MS);

      const inspection = await container.inspect();
      const oomKilled = inspection.State.OOMKilled === true;
      const exitCode = inspection.State.ExitCode ?? null;

      return {
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        exitCode: timedOut ? null : exitCode,
        timedOut,
        oomKilled,
        wallTimeMs: elapsedMs(startedAt),
        memoryBytes: stopStats(),
      };
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      stopStats?.();
      await container.remove({ force: true }).catch(() => undefined);
    }
  }

  /**
   * Samples memory while the container runs and returns the peak.
   *
   * Short programs may exit before the first sample lands, in which case this
   * reports null. That is deliberately honest: the original reported the Node
   * worker thread's own heap and called it the submission's memory usage.
   */
  #pollMemory(container: Docker.Container): () => number | null {
    let peak: number | null = null;
    let stopped = false;

    const interval = setInterval(() => {
      void (async () => {
        if (stopped) return;
        try {
          const stats = (await container.stats({
            stream: false,
          })) as unknown as {
            memory_stats?: { usage?: number; max_usage?: number };
          };
          const usage =
            stats.memory_stats?.max_usage ?? stats.memory_stats?.usage;
          if (typeof usage === "number" && (peak === null || usage > peak)) {
            peak = usage;
          }
        } catch {
          // The container is gone; nothing further to sample.
        }
      })();
    }, STATS_POLL_MS);

    // Do not hold the event loop open for the sake of sampling.
    interval.unref?.();

    return () => {
      stopped = true;
      clearInterval(interval);
      return peak;
    };
  }
}

function elapsedMs(startedAt: bigint): number {
  return Number(process.hrtime.bigint() - startedAt) / 1e6;
}

/** Never let a stream that refuses to close hold a job open. */
function withTimeout(promise: Promise<void>, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    void promise.finally(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}
