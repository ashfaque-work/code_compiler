# exec

A code execution service. Write code in seven languages, run it, and get back
output plus what it actually cost — measured against real limits.

Every submission runs in its own single-use container with no network, a
read-only root filesystem, a hard memory cap, a process-count cap and a
wall-clock kill. **The isolation is the product**, so it is enforced by tests
that run against a real Docker daemon rather than asserted in a README.

> This is a rewrite. The original — Node, Express, CodeMirror, `worker_threads` —
> is preserved in git history, and [docs/01-audit.md](docs/01-audit.md) records
> exactly what was wrong with it. The short version: it claimed to sandbox
> submitted code and did not. It ran `g++` and `python3` directly inside the
> long-lived API container, as root, with full network access.

---

## Architecture

```
        browser
           │  POST /submissions        →  202 { id }
           │  GET  /submissions/:id/events (SSE)
           ▼
   ┌──────────────┐        ┌───────┐        ┌────────────────┐
   │     api      │ ─────► │ redis │ ◄───── │     runner     │
   │ hono · zod   │  queue │ bull  │  queue │ bullmq worker  │
   └──────────────┘        └───────┘        └───────┬────────┘
     no docker access                               │ creates
                                                    ▼
                                        ┌────────────────────────┐
                                        │  single-use container  │
                                        │  --network none        │
                                        │  --read-only           │
                                        │  --memory 256m         │
                                        │  --pids-limit 64       │
                                        │  --cap-drop ALL        │
                                        │  uid 65534             │
                                        └────────────────────────┘
```

**The API has no path to the Docker socket.** Only the runner can create
containers, and it accepts work exclusively through the queue. Compromising the
public-facing service does not grant container creation. That split is the most
important structural decision in the project.

## The sandbox

| Control | What it stops |
| --- | --- |
| `--network none` | Egress, including the cloud instance metadata endpoint |
| `--read-only` + tmpfs `/tmp` | Writes anywhere but the job directory |
| `--memory` = `--memory-swap` | Memory exhaustion; swap cannot be used to evade the cap |
| `--pids-limit` | Fork bombs |
| `--cap-drop ALL` | Every Linux capability |
| `--security-opt no-new-privileges` | setuid escalation |
| uid 65534 | Root inside the container |
| `SIGKILL` on timeout | Processes that trap or ignore `SIGTERM` |
| Fresh container per run | State leaking between submissions |

Input is written to a file and redirected in, rather than streamed over an
attached socket — streaming races container startup and intermittently delivers
empty or concatenated input. Output is read from `logs`, on a separate
connection from stdin, because sharing one hijacked stream lets the half-close
that signals EOF tear down the connection before the output is read.

Both of those were found by running the tests, not by reading the code.

### Status taxonomy

`SUCCESS` · `COMPILE_ERROR` · `RUNTIME_ERROR` · `TIME_LIMIT_EXCEEDED` ·
`MEMORY_LIMIT_EXCEEDED` · `INTERNAL_ERROR`

The original collapsed all of these into `COMPILE_ERROR` — an infinite loop and
a syntax error produced identical output.

Memory is sampled from the container runtime and reported as `null` when the
program exited before a sample landed. That is a real answer. The original
reported `process.memoryUsage().heapUsed`, which measured the Node worker
thread rather than the submitted program, and claimed 7.7 MB for hello-world.

## Languages

Python · JavaScript · TypeScript · C++ · Java · Go · Rust

One image per toolchain, so cold starts stay fast and each image carries only
what it needs. TypeScript runs on Node's native type stripping — no compiler in
the image and no transpile step.

## Problems

Each catalogued problem states exactly how input arrives on stdin and ships
starter code in all seven languages that parses it for you. Hidden test cases
are attached server-side and never sent to the browser.

Integration tests solve every problem through the real sandbox, so a contract
that cannot be satisfied fails in CI rather than in front of someone trying to
use it.

## Running it

Requires Docker and Node 24.

```bash
pnpm install
./docker/images/build.sh          # builds the seven execution images (~5.8 GB)

docker compose up -d redis        # or run redis however you like
pnpm --filter @code-compiler/runner build && pnpm --filter @code-compiler/runner start
pnpm --filter @code-compiler/api    build && pnpm --filter @code-compiler/api    start
pnpm --filter @code-compiler/web dev
```

Configuration is entirely environment-driven; see [.env.example](.env.example).
There are no credentials in source, and `CORS_ORIGINS` rejects `*` at startup
rather than accepting it silently.

## Tests

```bash
pnpm check                        # lint · typecheck · 118 unit tests
pnpm --filter @code-compiler/runner test:integration   # 26 tests, needs Docker
```

The integration suite is the interesting one. It asserts, against a real
daemon, that submitted code cannot reach the network or the metadata endpoint,
cannot write outside its job directory, cannot see the runner's environment,
does not run as root, is contained when it forks without bound, and is killed
even when it ignores `SIGTERM` — plus that infinite loops report
`TIME_LIMIT_EXCEEDED` rather than a compile error.

## Layout

```
apps/
  web/        vite · react 19 · tailwind 4 · monaco
  api/        hono · zod · bullmq producer · SSE
  runner/     bullmq worker · dockerode        ← owns the docker socket
packages/
  shared/     zod schemas — the API contract, imported by both sides
  languages/  per-language image, compile and run commands
  problems/   problem catalogue with per-language starter code
docker/images/  one Dockerfile per toolchain
```

`packages/shared` is why the client and server cannot drift: both import the
same schemas, and responses are validated on the way back in. The original
hardcoded two different API hosts on two different pages, so one was always
broken.

## Known limitations

Worth stating plainly rather than discovering later:

- **No authentication and no persistence.** Submissions are ephemeral. There is
  no per-user history, which is also why there is no database — see
  [docs/02-architecture.md](docs/02-architecture.md).
- **Monaco loads from a CDN.** That is `@monaco-editor/react`'s default. It
  keeps the bundle at 102 KB gzipped but adds a runtime dependency on jsDelivr;
  self-hosting is the fix if that matters.
- **Deployment needs a real Docker host.** Netlify, Vercel and Railway can host
  the web app but not the runner, which needs a Docker socket. See
  [docs/04-deployment.md](docs/04-deployment.md).
- **Go compiles cold on every run** (~20 s), because its build cache lives in
  the per-job directory and is discarded with it. A cache shared between
  submissions would be fast but would let one submission poison another's
  build, which is not a trade worth making here. The compile budget is 60 s.
- **Developed against Docker Desktop on Windows**, where the daemon is reached
  over a named pipe. Linux is the intended target and what CI runs.

## Documentation

| Doc | Contents |
| --- | --- |
| [01-audit.md](docs/01-audit.md) | What was wrong with the original, and how it was verified |
| [02-architecture.md](docs/02-architecture.md) | Stack decisions and the reasoning behind each |
| [03-roadmap.md](docs/03-roadmap.md) | Delivery phases and verification status |
| [04-deployment.md](docs/04-deployment.md) | Hosting constraints and topology |

## License

MIT — see [LICENSE](LICENSE).
