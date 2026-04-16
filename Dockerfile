# syntax=docker/dockerfile:1.7
# =============================================================================
# Multi-stage build: one image, three uses
#   target "runtime" (default) -> API (APP_MODE=api) or Kafka worker (APP_MODE=worker)
#   target "test"              -> runs the test suites inside Docker
# =============================================================================
ARG NODE_VERSION=22-alpine

# ---------- 1. install ALL dependencies (cached until package*.json changes) ----------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- 2. compile TypeScript ----------
FROM deps AS build
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---------- 3. test image (dev deps + sources + tests) ----------
FROM deps AS test
COPY . .
ENV NODE_ENV=test
CMD ["npx", "jest", "--selectProjects", "unit", "contract", "integration", "e2e", "--runInBand"]

# ---------- 4. production-only dependencies ----------
FROM node:${NODE_VERSION} AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# ---------- 5. small, non-root runtime ----------
FROM node:${NODE_VERSION} AS runtime
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    KNOWLEDGE_DIR=/app/knowledge

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
COPY --chown=node:node knowledge ./knowledge
COPY --chown=node:node scripts ./scripts

# The official node image ships an unprivileged "node" user (uid 1000).
USER node
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health/live" >/dev/null || exit 1

# tini forwards SIGTERM so Nest shuts down gracefully (finishes requests, closes Kafka/DB).
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
