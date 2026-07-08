FROM node:20-bookworm-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/core/package.json packages/core/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS runner
COPY . .
RUN pnpm --filter @leadguardian/db exec prisma generate
ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@leadguardian/worker", "run", "start"]
