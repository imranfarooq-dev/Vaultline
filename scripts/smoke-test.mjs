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

await step('State', 'frozen account accepts deposits but rejects withdrawals', async () => {
  await call('PATCH', `/accounts/${current.id}/status`, { action: 'freeze' });
  const dep = await call('POST', '/transactions/deposit', { accountId: current.id, amountMinor: 1000 });
  const wdl = await call('POST', '/transactions/withdraw', { accountId: current.id, amountMinor: 1000 });
  await call('PATCH', `/accounts/${current.id}/status`, { action: 'unfreeze' });
  expect(dep.status === 201 && wdl.status === 409, `${dep.status}/${wdl.status}`);
  return wdl.data.message;
});

await step('Strategy', 'interest algorithm chosen by account type', async () => {
  const r = await call('GET', `/accounts/${savings.id}/interest-preview`);
  expect(r.data.strategy === 'tiered', r.data.strategy);
  return `${r.data.strategy}: ${r.data.formatted} per month`;
});

await step('Composite', 'portfolio totals roll up through nested groups', async () => {
  const r = await call('GET', `/accounts/portfolio/${encodeURIComponent(owner)}`);
  expect(r.data.accounts === 2, JSON.stringify(r.data));
  return `${r.data.accounts} accounts, total ${r.data.formattedTotals.join(', ')}`;
});

await step('Visitor', 'month-end fee/tax/risk report', async () => {
  const r = await call('GET', '/accounts/reports/month-end');
  expect(typeof r.data.totalFeesMinor === 'number', JSON.stringify(r.data));
  return `${r.data.accounts} accounts, fees ${r.data.totalFeesMinor}, tax ${r.data.totalTaxMinor}`;
});

await step('Flyweight', 'currencies are shared objects', async () => {
  const r = await call('GET', '/accounts/currencies');
  return `shared Currency objects in memory: ${r.data.sharedCurrencyObjectsInMemory}`;
});

await step('Bridge', 'detailed statement as text, mini statement as csv', async () => {
  const text = await call('GET', `/statements/${savings.id}?type=detailed&format=text`);
  const csv = await call('GET', `/statements/${savings.id}?type=mini&format=csv`);
  expect(String(text.data).includes('DETAILED STATEMENT') && String(csv.data).startsWith('date,reference,amount'), 'unexpected output');
  return String(text.data).split('\n').find((l) => l.startsWith('Closing balance'));
});

await step('Iterator', 'CSV export streams the ledger page by page', async () => {
  const r = await call('GET', `/transactions/accounts/${savings.id}/export.csv`);
  return `${String(r.data).trim().split('\n').length - 1} rows exported`;
});

await step('Proxy', 'second FX lookup is served from cache', async () => {
  const pair = ['GBP', 'AED'];
  await call('GET', `/fx/convert?from=${pair[0]}&to=${pair[1]}&amountMinor=10000`);
  const r = await call('GET', `/fx/convert?from=${pair[0]}&to=${pair[1]}&amountMinor=10000`);
  expect(r.data.source === 'cache', r.data.source);
  return `${r.data.amount} = ${r.data.converted} (source ${r.data.source}, ${r.data.tookMs}ms)`;
});

await step('Abstract Factory', 'SWIFT family quotes, RAAST family rejects USD', async () => {
  const swift = await call('POST', '/payments/quote', { rail: 'SWIFT', amountMinor: 5_000_000, currency: 'USD', beneficiaryName: 'Bilal', beneficiaryIban: 'DE89370400440532013000', beneficiaryBic: 'DEUTDEFF', purpose: 'Tuition' });
  const raast = await call('POST', '/payments/quote', { rail: 'RAAST', amountMinor: 5_000_000, currency: 'USD', beneficiaryName: 'Bilal', beneficiaryIban: 'bad' });
  expect(swift.data.valid && !raast.data.valid, 'unexpected validation');
  return `SWIFT fee ${swift.data.feeMinor}; RAAST errors: ${raast.data.errors.length}`;
});

await step('Memento', 'draft changes can be undone', async () => {
  const d = await call('POST', '/loans/drafts', { applicantName: 'Ali Raza', accountId: savings.id, amountMinor: 50_000_000, termMonths: 24, purpose: 'car', monthlyIncomeMinor: 40_000_000 });
  draftId = d.data.draftId;
  await call('PATCH', `/loans/drafts/${draftId}`, { amountMinor: 90_000_000 });
  const undone = await call('POST', `/loans/drafts/${draftId}/undo`);
  expect(undone.data.fields.amountMinor === 50_000_000, JSON.stringify(undone.data));
  return `amount restored to ${undone.data.fields.amountMinor}`;
});

await step('Builder + Mediator + Adapter', 'submit draft: desks coordinate through the mediator', async () => {
  const r = await call('POST', `/loans/drafts/${draftId}/submit`);
  expect(r.status === 201, JSON.stringify(r.data));
  return `${r.data.status}: ${r.data.decisionLog.join(' | ')}`;
});
