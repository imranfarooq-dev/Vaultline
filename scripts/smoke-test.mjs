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

async function step(pattern, title, fn) {
  try {
    const shown = await fn();
    passed++;
    console.log(`  \u2714 [${pattern}] ${title}${shown ? `\n      -> ${shown}` : ''}`);
  } catch (error) {
    failed++;
    console.log(`  \u2718 [${pattern}] ${title}\n      !! ${error.message}`);
  }
}

const expect = (condition, message) => { if (!condition) throw new Error(message); };
const unique = Date.now().toString(36);

console.log(`\nNestBank smoke test against ${BASE}\n`);

const health = await call('GET', '/health/ready').catch((e) => ({ status: 0, data: e.message }));
if (health.status !== 200) {
  console.error(`API not ready (${health.status}): ${JSON.stringify(health.data)}`);
  process.exit(1);
}

const owner = `Ayesha Khan ${unique}`;
let savings, current, commandId, draftId;

await step('Facade', 'onboard a customer in one call', async () => {
  const r = await call('POST', '/banking/onboard', { ownerName: owner, type: 'SAVINGS', currency: 'PKR', productCode: 'FREELANCER_SAVER', initialDepositMinor: 12_000_000 });
  expect(r.status === 201, JSON.stringify(r.data));
  savings = r.data.account;
  const c = await call('POST', '/banking/onboard', { ownerName: owner, type: 'CURRENT', currency: 'PKR', initialDepositMinor: 500_000 });
  current = c.data.account;
  return `${savings.accountNumber} ${savings.status} ${savings.balanceFormatted}`;
});
