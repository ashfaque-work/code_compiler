# Deployment

## Netlify cannot host the backend

Netlify serves static files and short-lived serverless functions. This project
needs a persistent process, a Redis connection, and — critically — the ability
to **spawn containers**.

The same limitation applies to Vercel, Render, and Railway. Those platforms run
*your* container but give no access to a Docker socket, so there is no way to
start a sibling container per submission.

## The split that works

| Piece | Host | Notes |
| --- | --- | --- |
| `apps/web` | Netlify / Cloudflare Pages / Vercel | Static build; free tier is a genuine fit |
| `apps/api` + `apps/runner` + Redis | A VM with Docker installed | Needs root and a real Docker daemon |

For the VM, Oracle Cloud's Always Free ARM instances are the usual answer —
persistent, root access, enough RAM to matter. GCP's `e2-micro` free tier is
the fallback.

**Verify current free-tier terms directly.** They change frequently and were
not confirmed as part of this planning work.

## The WASM alternative

If managing a VM is not wanted, submissions can run in a WASI runtime inside
the Node process instead of in containers. That deploys anywhere, including
serverless.

The cost is language support: Python and C/C++ are workable, Java and Go are a
real fight. This is why the runner sits behind an interface — the option stays
open without being the default.

## Fixing what the original had

If the Kubernetes path is revisited later:

- Container port, `EXPOSE`, and Service `targetPort` must agree. They did not.
- Correct the `comiler` typo in the Service name.
- Add liveness and readiness probes against `/healthz`.
- Add resource requests and limits.
- Note that running the container-per-submission design *inside* Kubernetes
  requires privileged Docker-in-Docker or a gVisor/Kata node pool. This is
  substantially more work and cost than a plain VM, and is the main reason the
  VM path is recommended first.

## Configuration

Everything through environment variables, with `.env.example` committed and
real values never in source:

```
PORT
REDIS_URL
CORS_ORIGINS          comma-separated; never "*"
DOCKER_SOCKET         runner only
MAX_CODE_BYTES
EXECUTION_TIMEOUT_MS
COMPILE_TIMEOUT_MS
```

The web app takes `VITE_API_URL` at build time. The original hardcoded two
different API URLs on two different pages; a single build-time variable makes
that class of bug impossible.
