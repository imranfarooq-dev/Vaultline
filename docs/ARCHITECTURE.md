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
