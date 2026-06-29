# 🏦 NestBank: all 23 GoF design patterns in one enterprise NestJS app

A working banking backend built to **learn by running it**: every Gang of Four pattern solves a real banking problem, on a production-style stack.

| Area | What you learn here |
|---|---|
| **Design patterns** | All 23 GoF patterns, each with a Problem / Solution / Analogy header, an endpoint and tests |
| **NestJS** | Modules, DI, custom providers, pipes, filters, lifecycle hooks, Swagger, Terminus health |
| **PostgreSQL** | Migrations, row locking, CHECK constraints, append-only ledger, keyset pagination |
| **Kafka** | Idempotent producer, consumer groups, partition keys, dead-letter topic, event contracts |
| **AI** | Ollama local LLM, LangChain (LCEL chains, splitters, embeddings, streaming), RAG on **pgvector** |
| **Docker** | Multi-stage non-root image, Compose platform with one-shot migration and model-pull jobs |
| **Kubernetes** | Kustomize base + overlays, probes, HPA, PDB, StatefulSets, Jobs, security contexts |
| **Terraform / AWS** | VPC, EKS, RDS, MSK, ECR, S3 remote state, dev/prod environments |
| **Testing** | Unit, docs, contract, integration (Testcontainers), e2e, smoke, load (k6) |
| **CI/CD** | **Jenkins** (configuration as code, SSH build agent, JUnit + coverage, Trivy scan, smoke stack, Terraform approval, EKS deploy) and GitHub Actions |

---

## 1. Run everything with Docker (start here)

Needs Docker Desktop (or Docker Engine + Compose v2) with **~8 GB RAM** allocated.

```bash
docker compose up -d --build        # or: make up
docker compose ps                   # wait until api is "healthy"
```

The first start downloads two Ollama models (~1.6 GB). Watch progress with:

```bash
docker compose logs -f ollama-pull
```

| URL | What |
|---|---|
| http://localhost:3000/docs | **Swagger UI**: every endpoint grouped by pattern |
| http://localhost:3000/api/patterns | The pattern catalog, the best starting point |
| http://localhost:8080 | Kafka UI: watch events arrive in topics |
| http://localhost:3000/api/health/dependencies | Kafka and Ollama status |

**See all 23 patterns in action:**

```bash
docker compose run --rm smoke       # or: make smoke
```

```
  ✔ [Facade] onboard a customer in one call
      -> PK42NBPT5177996217479749 ACTIVE Rs 120,000.00
  ✔ [Decorator] transfer passes through audit -> fraud -> fee -> ledger
  ✔ [Interpreter] a mobile transfer above Rs 50,000 is blocked by a fraud rule
  ✔ [Builder + Mediator + Adapter] submit draft: desks coordinate through the mediator
      -> APPROVED: Credit desk: credit.passed (score 785 ...) | Affordability desk ...
  ...
22 passed, 0 failed
```

**Ask the AI assistant (RAG):**

```bash
curl -s localhost:3000/api/ai/ask -H 'content-type: application/json' \
  -d '{"question":"What does a SWIFT transfer cost and how long does it take?"}'

# token-by-token streaming
curl -N "localhost:3000/api/ai/ask/stream?q=Can%20a%20frozen%20account%20receive%20salary"

# only the retrieval step: which chunks would the LLM see?
curl -s localhost:3000/api/ai/retrieve -H 'content-type: application/json' -d '{"question":"loan credit score"}'
```

Edit the Markdown files in `knowledge/`, then `curl -XPOST localhost:3000/api/ai/ingest` to re-index.

**Watch Kafka end to end:** make a deposit, open Kafka UI → topic `banking.transaction-events`, then:

```bash
curl -s localhost:3000/api/notifications    # written by the WORKER after consuming the event
docker compose logs worker
```

**Other commands:**

```bash
make logs          # follow api + worker
make load-test     # k6: 25 virtual users, fails on p95 latency or error-rate thresholds
make test-docker   # unit, contract, integration and e2e inside Docker
make down          # stop (keep data)
make clean         # stop and delete all data and models
```

Want a bigger model? `OLLAMA_CHAT_MODEL=llama3.2:3b docker compose up -d`. Have an NVIDIA GPU? Uncomment the `deploy` block of the `ollama` service.

---

## 2. A guided tour with curl

```bash
B=localhost:3000/api; J='content-type: application/json'

# FACADE + FACTORY METHOD + PROTOTYPE + STATE: open, fund and activate in one call
A=$(curl -s $B/banking/onboard -H "$J" -d '{"ownerName":"Ayesha Khan","type":"SAVINGS","currency":"PKR","productCode":"FREELANCER_SAVER","initialDepositMinor":12000000}' | jq -r .account.id)
C=$(curl -s $B/banking/onboard -H "$J" -d '{"ownerName":"Ayesha Khan","type":"CURRENT","currency":"PKR","initialDepositMinor":500000}' | jq -r .account.id)

# DECORATOR: see "pipeline": ["audit","fraud-screening","fee","ledger"]
curl -s $B/transactions/transfer -H "$J" -d "{\"fromAccountId\":\"$A\",\"toAccountId\":\"$C\",\"amountMinor\":250000,\"channel\":\"branch\"}"

# INTERPRETER: blocked by  amount > 5000000 AND channel == 'mobile'
curl -s $B/transactions/transfer -H "$J" -d "{\"fromAccountId\":\"$A\",\"toAccountId\":\"$C\",\"amountMinor\":6000000,\"channel\":\"mobile\"}"
curl -s $B/fraud/evaluate -H "$J" -d '{"rule":"amount > 100 AND NOT (channel == '"'web'"' OR hour < 5)","context":{"amount":500,"channel":"mobile","hour":12}}'

# COMMAND: execute, then undo
CMD=$(curl -s $B/transactions/deposit -H "$J" -d "{\"accountId\":\"$C\",\"amountMinor\":100000}" | jq -r .commandId)
curl -s -XPOST $B/transactions/commands/$CMD/undo

# STATE + CHAIN OF RESPONSIBILITY
curl -s -XPATCH $B/accounts/$C/status -H "$J" -d '{"action":"freeze"}'
curl -s $B/transactions/withdraw -H "$J" -d "{\"accountId\":\"$C\",\"amountMinor\":100}"   # 409
curl -s -XPATCH $B/accounts/$C/status -H "$J" -d '{"action":"unfreeze"}'

# STRATEGY · COMPOSITE · VISITOR · FLYWEIGHT · PROTOTYPE
curl -s $B/accounts/$A/interest-preview
curl -s "$B/accounts/portfolio/Ayesha%20Khan"
curl -s $B/accounts/reports/month-end
curl -s $B/accounts/currencies
curl -s $B/accounts/products

# BRIDGE (any type × any format) · ITERATOR (streamed CSV)
curl -s "$B/statements/$A?type=detailed&format=text"
curl -s "$B/statements/$A?type=mini&format=csv"
curl -s $B/transactions/accounts/$A/export.csv

# PROXY: run twice, compare "source" and "tookMs"
curl -s "$B/fx/convert?from=USD&to=PKR&amountMinor=10000"

# ABSTRACT FACTORY
curl -s $B/payments/quote -H "$J" -d '{"rail":"SWIFT","amountMinor":5000000,"currency":"USD","beneficiaryName":"Bilal","beneficiaryIban":"DE89370400440532013000","beneficiaryBic":"DEUTDEFF","purpose":"Tuition"}'

# MEMENTO → BUILDER → MEDIATOR (+ ADAPTER for the credit bureau)
D=$(curl -s $B/loans/drafts -H "$J" -d "{\"applicantName\":\"Ali Raza\",\"accountId\":\"$A\",\"amountMinor\":50000000,\"termMonths\":24,\"purpose\":\"car\",\"monthlyIncomeMinor\":40000000}" | jq -r .draftId)
curl -s -XPATCH $B/loans/drafts/$D -H "$J" -d '{"amountMinor":90000000}'
curl -s -XPOST $B/loans/drafts/$D/undo
curl -s -XPOST $B/loans/drafts/$D/submit | jq '.status, .decisionLog'

# TEMPLATE METHOD · OBSERVER
curl -s -XPOST $B/operations/jobs/interest-posting/run
curl -s $B/events/stats
```

All amounts are **minor units**: `12000000` = Rs 120,000.00.

---
