# Testing strategy

```
            ▲  fewer, slower, more realistic
            │   load (k6)            test/load            thresholds on latency & errors
            │   smoke                scripts/smoke-test   live system, all 23 patterns
            │   e2e                  test/e2e             HTTP through the whole app + real Postgres
            │   integration          test/integration     real Postgres/pgvector/Kafka (Testcontainers)
            │   contract             test/contract        event shapes between API and worker
            │   unit                 src/**/*.spec.ts     pure logic, milliseconds
            ▼  many, fast, isolated
```

| Suite | Command | Needs | Count |
|---|---|---|---|
| Unit + docs | `npm run test:unit` | nothing | 141 tests |
| Contract | `npm run test:contract` | nothing | 44 tests |
| Integration | `npm run test:integration` | Docker | 16 tests |
| E2E | `npm run test:e2e` | Docker | 8 tests |
| All of the above in Docker | `make test-docker` | Docker | Kafka suite skipped |
| Coverage | `npm run test:cov` | nothing | report in `coverage/` |
| Smoke | `make smoke` | running stack | 22 steps |
| Load | `make load-test` | running stack | 2 scenarios |
