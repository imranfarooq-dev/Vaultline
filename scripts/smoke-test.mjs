#!/usr/bin/env node
/**
 * SMOKE TEST: walks through all 23 patterns against a RUNNING system
 * (docker compose, kubernetes port-forward, or npm run start).
 *
 *   BASE_URL=http://localhost:3000 node scripts/smoke-test.mjs
 *   docker compose run --rm smoke
 */
const BASE = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '') + '/api';
const VERBOSE = process.env.VERBOSE === '1';
let passed = 0;
let failed = 0;

async function call(method, path, body) {
  const res = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data = text;
  try { data = JSON.parse(text); } catch { /* text/csv etc */ }
  return { status: res.status, data };
}
