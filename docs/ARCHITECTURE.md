# Architecture

## The big picture

```
                       ┌──────────────────────── Kubernetes namespace "banking" ────────────────────────┐
  client ──HTTP──▶ Service/NLB ──▶ banking-api (2-6 pods, HPA)                                           │
                       │               │  REST + Swagger                                                   │
                       │               │  ledger ─ row locks ─────────────▶ PostgreSQL 16 + pgvector       │
                       │               │  RAG: embed ▶ vector search ─────▶   (RDS on AWS)                 │
                       │               │       prompt ▶ LLM ──────────────▶ Ollama (llama3.2, nomic-embed) │
                       │               └─ domain events ─▶ Kafka (MSK on AWS) ─▶ banking-worker ─▶ notifications
                       │                                   banking.*-events       consumer group    (Postgres)
                       │                                   banking.dead-letter                               │
                       └────────────────────────────────────────────────────────────────────────────────────┘
```

One Docker image, two processes:

| Process | `APP_MODE` | Scales on | Does |
|---|---|---|---|
| API | `api` | CPU (HPA) | HTTP, ledger, patterns, RAG |
| Worker | `worker` | Kafka partitions | Consumes events, writes notifications, dead-letters poison messages |

## Folder layout

```
src/
  config/            Joi-validated environment, typed AppConfigService
  common/            domain errors, exception filter, money helpers
  database/          entities, migrations, migration runner
  modules/
    core/            Singleton, Flyweight
    messaging/       Observer bus, Kafka Adapter, event contracts, worker consumer
    accounts/        Factory Method, Prototype, State, Strategy, Visitor, Composite
    transactions/    ledger, Chain, Command, Decorator, Iterator
    fraud/           Interpreter
    payments/        Abstract Factory
    fx/              Proxy
    loans/           Builder, Memento, Mediator, Adapter
    statements/      Bridge
    operations/      Template Method
    banking/         Facade
    ai/              Ollama + LangChain + pgvector RAG
    health/          liveness / readiness
    patterns/        the pattern catalog
  app.module.ts      API process
  worker.module.ts   worker process
```

Business rules live in `domain/` folders as plain TypeScript classes with **no NestJS or database imports**. That is why most unit tests need no mocks at all.

## Money handling

- Amounts are **integers in minor units** (paisa): `Rs 1,250.50` is stored as `125050`. Floating point is never used for balances.
- The ledger is **append-only**. A mistake is corrected with a `REVERSAL` entry, never by editing or deleting history.
- `balance_minor >= 0` is enforced by a database `CHECK` constraint as the last line of defence.

## Concurrency

Every money movement runs in one DB transaction and takes `SELECT ... FOR UPDATE` row locks.
Transfers lock both accounts in **sorted id order**, so two opposite transfers can never deadlock.
`test/integration/ledger.int-spec.ts` proves it: 20 parallel withdrawals from Rs 10 in Rs 1 steps give exactly 10 successes and a final balance of 0.

## Events and Kafka

- Envelope: `eventId`, `eventType`, `occurredAt`, `schemaVersion`, `payload`, validated by Joi schemas shared by producer and consumer (see `test/contract`).
- Topic per aggregate: `banking.account-events`, `banking.transaction-events`, `banking.loan-events`, `banking.customer-events`.
- Message key = account id, so all events of one account stay **in order** in one partition.
- Producer is idempotent. The consumer is idempotent too: `event_id` is the primary key of `notifications`, and inserts use `ON CONFLICT DO NOTHING`.
- Messages that can never be processed go to `banking.dead-letter` instead of blocking the partition forever.

### Known trade-off: events after commit

The ledger commits, *then* publishes. If the pod crashes between those two steps, the event is lost.
The production-grade fix is the **Transactional Outbox**: write the event into an `outbox` table inside the same DB transaction, and let a relay (a poller, or Debezium CDC) publish it to Kafka. It is left out to keep the code readable, and is a great exercise:

1. Add an `outbox_events` table in a new migration.
2. Replace `events.publish()` in `LedgerService` with an insert using the same `EntityManager`.
3. Add a worker loop that reads unpublished rows with `FOR UPDATE SKIP LOCKED`, publishes them, and marks them sent.
