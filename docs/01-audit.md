# Audit of the original codebase

Reviewed at commit `9d6d3b2`. Both packages were installed, the client was
linted and built, and `server/worker.js` was driven directly with a test
harness. Docker was not available on the review machine, so the container path
was read rather than executed.

**Verdict:** the happy path worked, but the service was not deployable and not
safe, and the README described a system that did not exist.

---

## Critical

### 1. There was no sandbox

The README claimed "Each code execution is performed in a Docker container,
ensuring code runs in an isolated environment." It did not. `worker.js` spawned
`g++` / `python3` / `node` **inside the long-lived API container**, as root
(no `USER` in the Dockerfile), with full network and filesystem access.

Submitted code could read the application source, dump `process.env` (including
the Redis password), reach the cloud instance metadata endpoint for IAM
credentials, or fork-bomb the pod.

This was the single most important defect and is the reason for the rewrite.

### 2. The Kubernetes deployment could not work

| Place | Port |
| --- | --- |
| `server/index.js` | `7000` (hardcoded) |
| `server/Dockerfile` | `EXPOSE 8000` |
| `k8s/code/values.yaml` | `targetPort: 8000` |

The Service routed to a port nothing listened on. The Service was also named
`comiler` (typo), and the Deployment had no liveness/readiness probes and no
resource requests or limits.

### 3. Credentials and infra identifiers in source

`index.js` hardcoded the Redis host `3.7.95.4` and a `password` field. The
value was scrubbed to `XXXXXX` before commit — history was checked and no live
secret was ever pushed — but the pattern was committing credentials to source,
and the public IP plus the ECR account ID in `values.yaml` were exposed.

Nothing in the project read `.env`; there was no `dotenv` dependency at all,
despite the README instructing users to create one.

### 4. CORS was wide open and self-contradictory

`origin: "*"` combined with `credentials: true` — a combination browsers reject
outright. The inline comment conceded it was "for testing purposes."

### 5. No input validation, with a 50 MB body limit

`/run` accepted 50 MB of JSON and never checked that `code` was a string,
capped its length, or limited the testcase count.

---

## Correctness bugs, confirmed by execution

Each of the following was reproduced by running the worker directly.

**Infinite loops were reported as compile errors.** `while(true){}` returned
`status: "COMPILE_ERROR"` with `compileMessage: "Execution timed out after 5
seconds"`. The rejection was swallowed by an outer catch that hardcoded
`COMPILE_ERROR`. There was no `TIME_LIMIT_EXCEEDED` state.

**The timeout was not enforceable.** The kill path sent `SIGTERM` with no
`SIGKILL` fallback, so a child trapping or ignoring it would run indefinitely.
Grandchild processes survived regardless.

**A missing toolchain crashed the worker thread.** A Go submission returned
`spawn go ENOENT` as a *worker error*, producing HTTP 500 rather than a clean
compile error. `compileAsync` never registered a `.on("error")` handler, so
spawn failures escaped the promise entirely and could not be caught upstream.

**Compilation was unbounded.** Only execution had a 5 s timeout. The three
timeouts in play — client 20 s, Bull job 10 s, execution 5 s — did not form a
coherent ladder.

**Reported memory was meaningless.** The code reported
`process.memoryUsage().heapUsed`, which measures the *Node worker thread's*
heap, not the submitted program. Hello-world reported 7.7 MB. Likewise the
`resourceLimits` passed to `new Worker()` constrained the worker thread and had
no effect on the spawned child.

**All requests shared the same temp files.** Everything wrote `temp.cpp`,
`temp.js`, `temp.out` into the source directory. The review run left
`server/temp.go` and `server/temp.js` behind in the working tree; neither was
gitignored. C/C++ compiled with `-o temp.out` **relative to the process cwd**
and then ran `./temp.out`, so the server broke if started from any other
directory. Nothing was ever cleaned up. The `temp` package was a dependency but
never imported — the right idea, unfinished.

**Two hardcoded hacks.** `index.js` stripped a literal `"Indices: "` prefix
from output, left over from one specific Two Sum problem. `worker.js` rejected
any PHP source matching `/^<|<\?/` and prepended `<?php` itself.

**A dead branch.** `index.js` checked `result.state === "ERROR" && result.error`,
but `error` was never a key on any message the worker posted.

**Java picked the wrong class.** The class-name regex matched the *first*
`class` token, failing whenever the public class was not first.

**The queue was used synchronously.** `await job.finished()` held the HTTP
connection open for the whole job, defeating the purpose of the queue. There
was no status-polling endpoint or streaming channel.

---

## Client

- **The two pages called different backends.** The playground posted to
  `localhost:7000`; the assessment page posted to `localhost:8000`. One was
  always broken. Both were hardcoded with no environment override.
- **`/assessment/:id` crashed on an unknown id** — `problem.testCases` was
  dereferenced without a guard, and there was no 404 route. Nothing linked from
  `/` to `/assessments`, so the feature was undiscoverable.
- **Lint failed** with 6 errors and 1 warning, including `class` instead of
  `className` and an unused state variable.
- **1.04 MB bundle** (352 KB gzipped) — every CodeMirror language pack loaded
  eagerly. `@monaco-editor/react` was installed and never imported.
- **Assessment test cases were unusable.** Problem 1 piped the literal string
  `"[2,7,11,15], 9"` to stdin; problem 5 piped space-separated integers. No
  starter code or function signature was supplied, so a candidate could not
  know what to parse.
- Page title was still `Vite + React`; favicon was still `vite.svg`.

---

## README versus reality

| Claim | Reality |
| --- | --- |
| `docker-compose build` / `up` | No `docker-compose.yml` existed anywhere |
| Frontend `npm start` | Script was `npm run dev` |
| Runs on port 3000 | Vite serves on 5173 |
| `PORT=5000` in `.env` | Code hardcoded 7000 and read no env vars |
| "MIT License" | No LICENSE file existed |

No screenshot, no demo link, no architecture diagram.
