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

## What each level proves

**Unit** tests one pattern at a time with no I/O. Examples: a clone never mutates its prototype; the chain stops at the *first* failing handler; `a OR b AND c` parses as `a OR (b AND c)`; the Mediator stops the workflow after a credit rejection; the Bridge produces all 2 × 3 combinations.

**Docs test** (`test/docs/patterns-catalog.spec.ts`) checks that exactly 23 patterns are catalogued, every file exists and carries its teaching header, and this documentation mentions each one.

**Contract** tests freeze what travels over Kafka: topic names, event types and required payload fields. API and worker deploy independently, so during a rolling update an old worker reads messages from a new API. A failing contract test means *bump `schemaVersion`*, don't silently change the payload.

**Integration** tests cover what mocks cannot:
- `ledger.int-spec.ts`: row locks under 20 concurrent withdrawals, deadlock-free opposite transfers, atomic rollback, the `CHECK` constraint, events only after commit.
- `rag-pgvector.int-spec.ts`: real `vector` columns, cosine search ranking, idempotent re-ingestion, the advisory lock.
- `event-pipeline.int-spec.ts`: API → real Kafka → worker → Postgres, duplicate delivery ignored, poison message dead-lettered.

**E2E** sends real HTTP requests through validation pipes, the exception filter, controllers and services: a full customer journey from onboarding to loan decision and a RAG answer, including correct 400/403/404/409/422 responses.
