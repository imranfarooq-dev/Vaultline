/**
 * LOAD TEST (k6): how does the ledger behave under many concurrent users?
 *   docker compose --profile loadtest run --rm k6
 * Thresholds make the run FAIL if latency or error rate is unacceptable,
 * so this can gate a CI pipeline.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = `${__ENV.BASE_URL || 'http://localhost:3000'}/api`;
