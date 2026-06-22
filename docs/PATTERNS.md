# The 23 Gang of Four patterns in NestBank

Every pattern below is real, running code in a banking feature, not a toy `Animal`/`Dog` example.
Each source file opens with a comment block: **Problem / Solution / Analogy**. Read that first, then the code, then its test.

Memory trick:
**Creational** = *How do I make it?* · **Structural** = *How do I connect it?* · **Behavioral** = *How do they work together?*

`GET /api/patterns` returns this same map as JSON, and `test/docs/patterns-catalog.spec.ts` fails the build if the map and the code ever disagree.

---

## Creational: how objects get created

| Pattern | In one line | Where | Try it |
|---|---|---|---|
| **Singleton** | Exactly one reference-number generator per process | `src/modules/core/reference-number.singleton.ts` | Any deposit: look at `reference` |
| **Factory Method** | Subclasses decide how Savings / Current / Fixed Deposit accounts are built | `src/modules/accounts/domain/account.factory.ts` | `POST /api/accounts` |
| **Abstract Factory** | A matching *family* (validator + fee calculator + formatter) per payment rail: RAAST or SWIFT | `src/modules/payments/payment-rail.abstract-factory.ts` | `POST /api/payments/quote` |
| **Builder** | Assemble a loan application step by step, validate everything once in `build()` | `src/modules/loans/domain/loan-application.builder.ts` | `POST /api/loans/drafts/:id/submit` |
| **Prototype** | New account products are *clones* of configured prototypes, with only the differences changed | `src/modules/accounts/domain/account-product.prototype.ts` | `GET /api/accounts/products` |

**Things to notice**
- The Singleton is only unique *per process*. Three Kubernetes pods = three instances, which is why the pod name is baked into the reference. In NestJS you usually get singletons from DI instead (`AppConfigService`).
- Factory Method vs Abstract Factory: one product chosen by a subclass, versus a *family* of products that must match.
- Prototype's test proves the clone is **deep**: a shallow copy would let a Student Saver edit the Basic Saver's perks.

## Structural: how objects are connected

| Pattern | In one line | Where | Try it |
|---|---|---|---|
| **Adapter** | Our `EventPublisher` interface over kafkajs; a clean `CreditReport` over a legacy pipe-delimited bureau API | `src/modules/messaging/kafka-event-publisher.adapter.ts`, `src/modules/loans/domain/credit-bureau.adapter.ts` | `GET /api/loans/credit-report/Ali%20Raza` |
| **Bridge** | Statement *types* (mini, detailed) × *renderers* (CSV, JSON, text) = 6 combinations from 5 classes | `src/modules/statements/statement.bridge.ts` | `GET /api/statements/:id?type=detailed&format=csv` |
| **Composite** | A portfolio tree: groups contain accounts or other groups; totals roll up | `src/modules/accounts/domain/portfolio.composite.ts` | `GET /api/accounts/portfolio/:ownerName` |
| **Decorator** | Audit → fraud screening → fee → ledger, each a wrapper with the same interface | `src/modules/transactions/transfer/money-transfer.decorators.ts` | `POST /api/transactions/transfer` (see `pipeline`) |
| **Facade** | `onboardCustomer()` hides five subsystems and rolls back on failure | `src/modules/banking/banking.facade.ts` | `POST /api/banking/onboard` |
| **Flyweight** | Thousands of amounts share a handful of immutable `Currency` objects | `src/modules/core/currency.flyweight.ts` | `GET /api/accounts/currencies` |
| **Proxy** | Cache, rate limit and stale fallback in front of a slow FX provider | `src/modules/fx/exchange-rate.proxy.ts` | `GET /api/fx/convert?from=USD&to=PKR&amountMinor=10000` twice |

**Things to notice**
- Decorator and Proxy have the *same shape* (wrap + same interface). The difference is intent: a Decorator **adds** behaviour; a Proxy **controls access**.
- The decorators are wired in `transactions.module.ts`. Reorder or delete a line there and the transfer pipeline changes, with no other code touched.
- Terraform uses the Facade idea too: `infra/terraform/live/main.tf` composes modules that each hide one AWS concern.
