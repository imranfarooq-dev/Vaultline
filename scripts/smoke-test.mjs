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

await step('Factory Method', 'minimum opening balance enforced per account type', async () => {
  const r = await call('POST', '/accounts', { ownerName: owner, type: 'FIXED_DEPOSIT', currency: 'PKR', initialDepositMinor: 100 });
  expect(r.status === 422, `expected 422, got ${r.status}`);
  return r.data.message;
});

await step('Prototype', 'products cloned from prototypes keep independent perks', async () => {
  const r = await call('GET', '/accounts/products');
  const basic = r.data.find((p) => p.code === 'BASIC_SAVER');
  const student = r.data.find((p) => p.code === 'STUDENT_SAVER');
  expect(basic.features.perks.length === 1 && student.features.perks.length === 2, 'prototype was mutated by a clone');
  return `STUDENT_SAVER perks: ${student.features.perks.join(', ')}`;
});

await step('Singleton', 'reference numbers come from one generator', async () => {
  const r = await call('POST', '/transactions/deposit', { accountId: current.id, amountMinor: 100_000 });
  expect(/^DEP-\d{8}-/.test(r.data.reference), JSON.stringify(r.data));
  commandId = r.data.commandId;
  return r.data.reference;
});

await step('Command', 'undo the deposit, and refuse a second undo', async () => {
  const undo = await call('POST', `/transactions/commands/${commandId}/undo`);
  const again = await call('POST', `/transactions/commands/${commandId}/undo`);
  expect(undo.status === 201 && again.status === 422, `${undo.status}/${again.status}`);
  return `reversal ${undo.data.reference}`;
});

await step('Decorator', 'transfer passes through audit -> fraud -> fee -> ledger', async () => {
  const r = await call('POST', '/transactions/transfer', { fromAccountId: savings.id, toAccountId: current.id, amountMinor: 250_000, channel: 'branch' });
  expect(r.status === 201, JSON.stringify(r.data));
  expect(r.data.pipeline.join('>') === 'audit>fraud-screening>fee>ledger', r.data.pipeline.join('>'));
  return `pipeline ${r.data.pipeline.join(' > ')}, fee ${r.data.feeMinor}`;
});

await step('Interpreter', 'a mobile transfer above Rs 50,000 is blocked by a fraud rule', async () => {
  const r = await call('POST', '/transactions/transfer', { fromAccountId: savings.id, toAccountId: current.id, amountMinor: 6_000_000, channel: 'mobile' });
  expect(r.status === 403, `expected 403, got ${r.status}`);
  const parsed = await call('POST', '/fraud/evaluate', { rule: "amount > 100 AND NOT (channel == 'web' OR hour < 5)", context: { amount: 500, channel: 'mobile', hour: 12 } });
  return `blocked by "${r.data.details.matchedRules[0]}"; parsedAs ${parsed.data.parsedAs} = ${parsed.data.matched}`;
});

await step('Chain of Responsibility', 'insufficient funds stopped by the chain', async () => {
  const r = await call('POST', '/transactions/withdraw', { accountId: current.id, amountMinor: 999_999_999 });
  expect(r.status === 422, `expected 422, got ${r.status}`);
  return r.data.message;
});
