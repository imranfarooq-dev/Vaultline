#!/usr/bin/env node
/**
 * SMOKE TEST: walks through all 23 patterns against a RUNNING system
 * (docker compose, kubernetes port-forward, or npm run start).
 *
 *   BASE_URL=http://localhost:3000 node scripts/smoke-test.mjs
 *   docker compose run --rm smoke
 */
const BASE = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '') + '/api';
