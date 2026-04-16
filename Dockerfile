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
