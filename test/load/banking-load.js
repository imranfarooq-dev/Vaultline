/**
 * LOAD TEST (k6): how does the ledger behave under many concurrent users?
 *   docker compose --profile loadtest run --rm k6
 * Thresholds make the run FAIL if latency or error rate is unacceptable,
 * so this can gate a CI pipeline.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = `${__ENV.BASE_URL || 'http://localhost:3000'}/api`;
const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } };

export const options = {
  scenarios: {
    readers: { executor: 'constant-vus', vus: 10, duration: '45s', exec: 'browse' },
    payers: { executor: 'ramping-vus', startVUs: 0, stages: [{ duration: '15s', target: 15 }, { duration: '30s', target: 15 }], exec: 'pay' },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],                     // < 2% errors
    'http_req_duration{scenario:readers}': ['p(95)<300'],
    'http_req_duration{scenario:payers}': ['p(95)<800'],
  },
};

export function setup() {
  const open = (name) =>
    http.post(`${BASE}/banking/onboard`, JSON.stringify({ ownerName: name, type: 'CURRENT', currency: 'PKR', initialDepositMinor: 500000000 }), JSON_HEADERS).json('account.id');
  return { a: open(`Load A ${Date.now()}`), b: open(`Load B ${Date.now()}`) };
}

export function browse(data) {
  const r = http.get(`${BASE}/accounts/${data.a}`);
  check(r, { 'account 200': (res) => res.status === 200 });
  http.get(`${BASE}/transactions/accounts/${data.a}?limit=10`);
  sleep(0.5);
}
