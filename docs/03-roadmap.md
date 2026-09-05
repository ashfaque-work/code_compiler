# Roadmap

Phases were ordered so that stopping early still left something worth showing.
Phase 1 was the centrepiece.

**All phases are complete and verified.**

---

## Verification status

| Check | Result |
| --- | --- |
| `pnpm lint` | Passing |
| `pnpm build` | Passing |
| `pnpm typecheck` | Passing |
| `pnpm test` | 118 unit tests passing |
| `runner test:integration` | 26 tests passing against a real Docker daemon |
| End-to-end through the running stack | Verified — see below |

Unit totals: shared 7 · languages 19 · problems 16 · runner 16 · api 34 · web 26.

The integration suite was run three consecutive times to confirm the flakiness
described in Phase 1 was actually gone, not merely unobserved.

---

## Phase 0 — Scaffold — done

- [x] pnpm workspace + Turborepo
- [x] TypeScript 7 base config, `strict` plus `noUncheckedIndexedAccess` and
      `exactOptionalPropertyTypes`
- [x] oxlint (see `02-architecture.md` for why not typescript-eslint)
- [x] `packages/shared` — Zod schemas as the API contract
- [x] `packages/languages` — per-language definitions
- [x] `docker-compose.yml`, GitHub Actions, `.env.example`, LICENSE

## Phase 1 — The runner — done

- [x] Seven execution images under `docker/images/`
- [x] dockerode, one fresh container per submission
- [x] Full isolation flag set, asserted in tests
- [x] Timeout covering compilation *and* execution, terminating with `SIGKILL`
- [x] Status taxonomy incl. `TIME_LIMIT_EXCEEDED` / `MEMORY_LIMIT_EXCEEDED`
- [x] Peak memory sampled from the runtime, reported as null when unmeasured
- [x] Per-job scratch directory with guaranteed teardown
- [x] `JOB_DIR_ROOT` so bind-mount paths stay valid for sibling containers
- [x] 26 integration tests passing, covering a compile in every language

### Bugs the tests found

Both were invisible in review and only surfaced against a real daemon. Both
were timing dependent, which is why they presented as "works most of the time".

**Output was lost when the container exited quickly.** Output was read from the
same hijacked attach stream used for stdin. The half-close that signals
end-of-input can tear the connection down before the output has been read, so a
fast program looked like a clean exit that printed nothing. Fixed by reading
output from `logs` on its own connection.

**Input was intermittently empty or concatenated.** Streaming stdin into the
container races its startup: bytes written before the process is ready are
dropped. Fixed by writing input to a file in the job directory and redirecting
from it — the data is on disk before the container exists, so there is no race
left to lose.

### A third bug, found by re-testing

Go could never compile. It presented twice, with different symptoms and the
same cause.

At 256 MB the compiler was OOM-killed; raising memory changed the error to the
linker reporting `no space left on device`. Both came from `GOCACHE` and the
linker's temp files living on the 64 MB tmpfs at `/tmp` — tmpfs pages are
charged to the container's memory cgroup, so that one mount was simultaneously
too small for the linker and large enough to blow the memory cap. Moving the
build cache, module path and `GOTMPDIR` onto the bind-mounted job directory
fixed both.

It then still failed on time. Go rebuilds the standard library from source on
every run, and at the execution CPU share of 0.5 that took over 30 s.
Compilation now gets its own CPU allowance (1.0) and a 60 s budget; throttling
a compiler buys no safety, because the wall clock bounds it regardless.

**The test gap that allowed it**: the integration suite exercised Python, C++
and TypeScript, so no Go, Rust or Java compile was ever run. All three are now
covered, which is why the suite grew from 23 tests to 26.

### A leak found while cleaning up

A container was found stuck in `Created` state after an interrupted test run.
Containers are removed in a `finally` block, but a runner killed outright never
reaches it, so a crash slowly fills the host with dead containers. Execution
containers now carry a label and the runner sweeps its own orphans at startup.

### Abuse cases covered

| Case | Result |
| --- | --- |
| `while(true){}` | `TIME_LIMIT_EXCEEDED`, not `COMPILE_ERROR` |
| Fork bomb | Contained by `--pids-limit` |
| Large allocation | `MEMORY_LIMIT_EXCEEDED` |
| Outbound network call | Blocked |
| Instance metadata endpoint | Unreachable |
| Write outside the job directory | Denied |
| `os.getuid()` | Not 0 |
| Runner environment variables | Not visible |
| `SIGTERM`-ignoring child | Still killed |
| Missing toolchain | Clean error, not a 500 |

## Phase 2 — API — done

- [x] Hono + Zod validation sharing `packages/shared` schemas
- [x] `POST /submissions` returns `202` with a job id — never blocks on the queue
- [x] `GET /submissions/:id` and `/events` (SSE)
- [x] `GET /problems`, `GET /problems/:slug`, `POST /problems/:slug/submissions`
- [x] `GET /languages`, `GET /healthz`
- [x] Redis-backed rate limiting on every endpoint that costs a container
- [x] CORS allowlist; `*` is rejected at startup
- [x] Body cap, JSON errors, JSON 404s, pino logging with redaction

### A bug the end-to-end run found

`getJob()` snapshots a job; `getState()` queries fresh. A job finishing between
those two calls produced a "completed" state paired with a snapshot taken
before the result was written, and the API reported `Malformed job result` for
a run that had in fact succeeded. Fixed by re-reading once before treating a
result as corrupt.

Unit tests with a fake store could not have caught this — it needed the real
queue and real timing.

## Phase 3 — Web — done

- [x] Vite 8 · React 19 · Tailwind 4
- [x] Monaco, lazy-loaded
- [x] Playground: language picker, editor, stdin, result panel
- [x] Progress over SSE, with queued and running as distinct states
- [x] Real title and favicon
- [x] 102 KB gzipped, against the original's 352 KB

Design notes are in `02-architecture.md`. The short version: execution
telemetry is the hero, not the editor, and every measurement is drawn against
its ceiling because a number without its limit is unreadable.

## Phase 4 — Problems — done

- [x] Problem catalogue with a documented stdin contract
- [x] Starter code for every problem in all seven languages
- [x] Hidden test cases, attached server-side, never sent to the client
- [x] 404 handling for unknown slugs
- [x] Navigation between playground and problems
- [x] Integration tests solving every problem through the real sandbox

Deliberately **not** built: a database. See `02-architecture.md`.

## Phase 5 — Ship — done

- [x] README rewritten with an architecture diagram, the security model, and an
      explicit limitations section
- [x] Documentation set covering audit, architecture, roadmap and deployment
- [x] Trivy scan in CI
- [ ] Deployed — needs a host, see `04-deployment.md`
- [ ] Screenshots — the browser automation tooling was unavailable in the
      session where this was built

---

## What would come next

In rough order of value:

1. **Deploy it.** Web to Netlify, API and runner to a Docker host.
2. **Auth**, which is the prerequisite for submission history and the only
   thing that would justify adding a database.
3. **gVisor** (`--runtime=runsc`) for a second isolation tier.
4. **Self-host Monaco** to drop the CDN dependency.
5. **A queued-position indicator**, now that queued and running are distinct.
