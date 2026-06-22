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
