# The public-facing API. It has no Docker socket and no path to one — creating
# execution containers is the runner's job alone, so a compromise here does not
# grant container creation.
FROM node:24-slim AS build

RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/languages/package.json packages/languages/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

COPY packages/ packages/
COPY apps/api/ apps/api/
RUN pnpm --filter @code-compiler/api... build && \
    pnpm deploy --filter @code-compiler/api --prod /out

FROM node:24-slim

WORKDIR /app
COPY --from=build /out ./

USER node
EXPOSE 8080
CMD ["node", "dist/index.js"]
