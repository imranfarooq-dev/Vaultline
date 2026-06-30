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

## 3. Run on your local Kubernetes

Works with Docker Desktop Kubernetes, kind or minikube. Give the cluster ~8 GB RAM.

```bash
make k8s-deploy        # builds the image, applies k8s/overlays/local, waits for migrations + rollout
make k8s-status
make k8s-forward       # then open http://localhost:3000/docs
BASE_URL=http://localhost:3000 node scripts/smoke-test.mjs
```

Behind `make k8s-deploy`:

```bash
docker build --target runtime -t nestbank/banking-api:local .
kubectl apply -k k8s/overlays/local
kubectl -n banking wait --for=condition=complete job/banking-migrate --timeout=5m
kubectl -n banking rollout status deploy/banking-api
```

- **kind:** run `kind load docker-image nestbank/banking-api:local` after building.
- **minikube:** run `eval $(minikube docker-env)` before building.
- **Autoscaling:** the HPA needs metrics-server (`minikube addons enable metrics-server`, or apply the metrics-server manifest).

Things to try:

```bash
kubectl -n banking logs -f job/ollama-pull-models             # model download
kubectl -n banking scale deploy/banking-worker --replicas=3   # consumer group rebalances partitions
kubectl -n banking delete pod -l app=banking-api              # zero downtime: PDB + rolling pods
kubectl kustomize k8s/overlays/local | less                   # see the final rendered YAML
make k8s-delete
```

---

## 4. Deploy to AWS with Terraform

Full walkthrough, costs and teardown: **[docs/AWS.md](docs/AWS.md)**.

```bash
make tf-bootstrap STATE_BUCKET=nestbank-tfstate-<account-id>   # once
make tf-plan ENV=dev
make tf-apply ENV=dev          # VPC, EKS, RDS (pgvector), MSK, ECR: ~20-25 min
make aws-deploy                # image → ECR, manifests → EKS, prints the URL
make aws-destroy ENV=dev       # ⚠️ remember this: AWS bills by the hour
```

---

## 5. CI/CD with Jenkins

Full guide: **[docs/CICD.md](docs/CICD.md)**.

```bash
git init -b main && git add -A && git commit -m "NestBank"   # Jenkins checks out this folder
make jenkins-up                                                # http://localhost:8090  (admin / admin)
```

Open the **nestbank** job → **Build with Parameters**:

```
Prepare ▶ Quality gates (typecheck | k8s | terraform) ▶ Unit & contract ▶ Integration & e2e
        ▶ Build image ▶ Trivy scan ▶ Smoke test ▶ [Terraform plan ▶ Approval ▶ Apply ▶ Deploy to EKS]
```

The controller only orchestrates; builds run on a separate SSH agent with Node, Docker, Terraform, kubectl and the AWS CLI. Everything, including users, the agent, credentials and the job, is defined in `jenkins/controller/casc.yaml`. Choose `DEPLOY_ENV=dev` to deploy to AWS from the pipeline.

---

## 6. Develop and test on your machine

```bash
npm ci
docker compose up -d postgres kafka ollama ollama-pull   # only the infrastructure
cp .env.example .env
npm run migration:run:dev
npm run start:dev
```

No Ollama? Set `AI_PROVIDER=fake` in `.env`. No Kafka? Set `KAFKA_ENABLED=false`.

| Command | What | Needs Docker |
|---|---|---|
| `npm run test:unit` | 141 unit + docs tests | no |
| `npm run test:contract` | 44 event-contract tests | no |
| `npm run test:integration` | Postgres, pgvector and Kafka via Testcontainers | yes |
| `npm run test:e2e` | full HTTP journeys on a real database | yes |
| `npm run test:all` | everything | yes |
| `npm run test:cov` | coverage report | no |

Details: **[docs/TESTING.md](docs/TESTING.md)**.

---

## Documentation

| Doc | Read it for |
|---|---|
| [docs/PATTERNS.md](docs/PATTERNS.md) | Every pattern: where it lives, how to trigger it, how patterns combine |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Processes, money handling, concurrency, Kafka design, RAG pipeline, trade-offs |
| [docs/TESTING.md](docs/TESTING.md) | Test pyramid and what each suite proves |
| [docs/AWS.md](docs/AWS.md) | Terraform, EKS, RDS, MSK, costs, hardening checklist |
| [docs/CICD.md](docs/CICD.md) | Jenkins architecture, every pipeline stage, deploying from Jenkins, troubleshooting |

## Suggested learning path

1. Read `docs/PATTERNS.md`, then run `make up && make smoke`.
2. Pick one pattern per day: read the header comment, the code, its `*.spec.ts`, and trigger it in Swagger.
3. Break something on purpose. Remove `setNext(new DailyLimitHandler())`, or reorder the decorators in `transactions.module.ts`, and watch the tests fail.
4. Follow one deposit: controller → Command → Chain → State → ledger (row lock) → Observer → Kafka UI → worker → `/api/notifications`.
5. Study the RAG flow in `src/modules/ai`, then add your own Markdown to `knowledge/`.
6. Deploy to local Kubernetes, then run the Jenkins pipeline, then deploy to AWS.
7. Exercises: implement the transactional outbox, add a `PdfStatementRenderer` (Bridge), add a new fraud-rule operator such as `IN` (Interpreter), or a `LoyaltyPointsVisitor`.

> NestBank is fictional. Fees, tax rates and rules are illustrative, and this is a learning project, not financial or tax advice.
