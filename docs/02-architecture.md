# Target architecture

## Layout

```
code-compiler/
├── apps/
│   ├── web/         Vite · React · Tailwind · shadcn/ui · Monaco
│   ├── api/         Hono · Zod · BullMQ producer · SSE   ← no Docker access
│   └── runner/      BullMQ worker · dockerode            ← owns the socket
├── packages/
│   ├── shared/      Zod schemas → inferred types = the API contract
│   ├── languages/   per-language: image, compile cmd, run cmd, limits
│   └── problems/    catalogue with per-language starter code
├── docker/images/   Dockerfile.python, .cpp, .java, .go, .rust, .node
└── docker-compose.yml
```

### Why api and runner are separate processes

The public-facing service has no path to the Docker socket. Only the runner can
create containers, and it accepts work exclusively through the queue. An API
compromise therefore does not hand an attacker container creation.

This is the single most defensible structural decision in the project and the
one worth being able to explain.

---

## Verified dependency versions

Checked against the npm registry on 2026-09-05.

| Package | Version |
| --- | --- |
| typescript | 7.0.2 |
| react | 19.2.8 |
| vite | 8.2.2 |
| hono | 4.13.7 |
| @hono/node-server | 2.1.1 |
| zod | 4.5.4 |
| bullmq | 6.3.4 |
| ioredis | 6.0.0 |
| tailwindcss | 4.3.3 |
| vitest | 5.0.0 |
| testcontainers | 12.1.0 |
| dockerode | 5.0.1 |
| drizzle-orm | 0.45.2 |
| @tanstack/react-query | 5.102.8 |
| @monaco-editor/react | 4.7.0 |
| pino | 10.3.1 |
| oxlint | 1.81.0 |
| pnpm | 11.25.0 |

---

## Stack decisions

### TypeScript 7 + oxlint, NOT typescript-eslint

This one has a trap in it and was verified directly.

TypeScript 7.0.2 is the Go-native compiler. Its npm package ships a launcher,
not a library: `require('typescript')` exposes **2 keys**, not the compiler
API. Typechecking via `tsc --noEmit` works correctly and is dramatically
faster, but anything that links against the TypeScript compiler API is broken.

`typescript-eslint@8.69.0` declares `typescript: ">=4.8.4 <6.1.0"`. It cannot
run against TypeScript 7.

The resolution is **oxlint** for linting — it is Rust-based and does not need
the TypeScript API — with `tsc --noEmit` doing the type checking. The tradeoff
is losing type-aware lint rules; `strict` mode covers most of what those would
have caught.

The alternative, pinning TypeScript to the 5.x line to keep typescript-eslint,
is a reasonable fallback if type-aware rules turn out to matter.

### Hono, not Express

Hono is TypeScript-first with genuinely typed routing and an RPC client that
pairs with the shared Zod schemas. Express 5 would work, but the type-safety
story in Hono is real rather than cosmetic, and it directly prevents the class
of client/server contract mismatch the original codebase had.

### Vite, not Next.js

The app is a single-page editor holding a live connection to a job stream. SSR
buys nothing, and Next would add a second server alongside the API server that
is actually needed. Choosing Vite deliberately — and being able to say why — is
worth more than reaching for Next reflexively.

### Monaco, not CodeMirror

Monaco is VS Code's editor. For a compiler showcase, the familiarity sells the
product. It must be lazy-loaded; eager loading is what produced the original
1 MB bundle.

### Six languages, not twelve

Python, JavaScript/TypeScript, C++, Java, Go, Rust.

Six languages with real resource limits, a correct error taxonomy, and tests
beat twelve where half were never exercised. C#, Dart, PHP, and Ruby were
carrying roughly 3 GB of image weight for very little.

---

## The sandbox

`worker_threads` is removed entirely. It provided no isolation and produced
meaningless resource numbers.

Each submission gets a fresh container, created through dockerode:

| Flag | Purpose |
| --- | --- |
| `--network none` | No egress; blocks metadata-endpoint credential theft |
| `--read-only` + tmpfs `/tmp` | No writes outside a scratch mount |
| `--memory 256m` | Enforced by cgroups, not hoped for |
| `--cpus 0.5` | Bounded CPU share |
| `--pids-limit 64` | Fork-bomb containment |
| `--cap-drop ALL` | No Linux capabilities |
| `--security-opt no-new-privileges` | Blocks setuid escalation |
| non-root uid | No root inside the container either |
| `--rm` | No accumulated state between runs |

Plus a hard wall-clock timeout terminating with `SIGKILL`, covering
**compilation as well as execution** — the original bounded only execution.

Per-language images rather than one combined image: faster cold starts, smaller
attack surface, and independently versioned toolchains.

### Carrying input and output

Input is written to a file in the job directory and redirected in by a shell
wrapper; output is read from `logs` on a connection of its own.

Both choices were forced by bugs found in testing. Streaming stdin over an
attached socket races the container's startup and silently drops bytes written
before the process is ready. Sharing one hijacked stream for stdin and output
means the half-close signalling end-of-input can tear the connection down
before the output has been read. Neither failure is deterministic, so both
presented as "works most of the time" — see `03-roadmap.md`.

The runner sits behind an interface so a WASM/WASI backend remains possible
later without touching the API. gVisor (`--runtime=runsc`) is the next tier of
isolation if it is ever wanted.

### Status taxonomy

The original collapsed unrelated failures into `COMPILE_ERROR`. The replacement
distinguishes:

`SUCCESS` · `COMPILE_ERROR` · `RUNTIME_ERROR` · `TIME_LIMIT_EXCEEDED` ·
`MEMORY_LIMIT_EXCEEDED` · `INTERNAL_ERROR`

Resource figures come from the container runtime, not from the host process.

---

## Problems

The original's test cases were unusable: they piped `"[2,7,11,15], 9"` at stdin
with no indication of how to parse it, and supplied no starter code.

Each problem now states its stdin contract exactly and ships starter code in
all seven languages that does the parsing and calls a stub. Hidden cases are
attached by the server, so a solution cannot be written against only what it
was shown.

Integration tests solve every problem through the real sandbox. A contract that
cannot actually be satisfied fails in CI rather than in front of a user.

### Why there is no database

The roadmap originally called for Postgres and Drizzle. That was dropped
deliberately.

Problems are static content that ships with the app, so they belong in git,
where they are versioned, reviewable and typed. Putting six constants in a
database would buy nothing.

The other candidate was submission history — but with no authentication, there
is no user for a history to belong to. Adding a database to store rows nobody
can be shown is architecture for its own sake.

Auth first, then persistence, in that order. Until then the honest design is
the one without a database.
