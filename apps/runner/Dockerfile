# The runner service itself. This container never executes submitted code — it
# only orchestrates the single-use execution containers defined in
# docker/images/, which is why it is safe for it to hold the Docker socket.
FROM node:24-slim AS build

RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/languages/package.json packages/languages/
COPY apps/runner/package.json apps/runner/
RUN pnpm install --frozen-lockfile

COPY packages/ packages/
COPY apps/runner/ apps/runner/
RUN pnpm --filter @code-compiler/runner... build && \
    pnpm deploy --filter @code-compiler/runner --prod /out

FROM node:24-slim

WORKDIR /app
COPY --from=build /out ./

# Runs as root only because it needs the Docker socket. Submitted code never
# reaches this container.
CMD ["node", "dist/index.js"]
