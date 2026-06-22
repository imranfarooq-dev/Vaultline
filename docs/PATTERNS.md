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

## Behavioral: how objects collaborate

| Pattern | In one line | Where | Try it |
|---|---|---|---|
| **Chain of Responsibility** | Amount → status → funds → daily limit handlers; any link can stop the request | `src/modules/transactions/validation/transaction-validation.chain.ts` | Withdraw more than the balance |
| **Command** | Deposits, withdrawals and transfers as objects with `execute()` and `undo()` plus an invoker history | `src/modules/transactions/commands/bank.commands.ts` | `POST /api/transactions/commands/:id/undo` |
| **Interpreter** | A small fraud-rule language: tokenizer, recursive-descent parser, expression tree | `src/modules/fraud/fraud-rule.interpreter.ts` | `POST /api/fraud/evaluate` |
| **Iterator** | Walk millions of ledger entries one at a time with keyset pagination behind `for await` | `src/modules/transactions/ledger-history.iterator.ts` | `GET /api/transactions/accounts/:id/export.csv` |
| **Mediator** | Credit, affordability and compliance desks talk only to the approval mediator | `src/modules/loans/domain/loan-approval.mediator.ts` | Submit a loan draft, read `decisionLog` |
| **Memento** | Snapshot a loan draft before each change; undo restores it | `src/modules/loans/domain/loan-draft.memento.ts` | `POST /api/loans/drafts/:id/undo` |
| **Observer** | The event bus notifies audit, metrics and Kafka-forwarding observers | `src/modules/messaging/domain-event-bus.observer.ts` | `GET /api/events/stats` |
| **State** | Pending / Active / Frozen / Closed classes decide what an account may do | `src/modules/accounts/domain/account-state.ts` | Freeze an account, then withdraw |
| **Strategy** | Swappable interest algorithms: none, flat, tiered, compound | `src/modules/accounts/domain/interest.strategy.ts` | `GET /api/accounts/:id/interest-preview` |
| **Template Method** | `EndOfDayJob.run()` fixes the batch skeleton; jobs fill in the steps | `src/modules/operations/end-of-day.template-method.ts` | `POST /api/operations/jobs/interest-posting/run` |
| **Visitor** | Fee, tax and risk reports over accounts without changing the account classes | `src/modules/accounts/domain/account.visitor.ts` | `GET /api/accounts/reports/month-end` |

**Things to notice**
- Patterns combine. The validation Chain asks the **State** whether an operation is allowed; the interest-posting **Template Method** job uses the interest **Strategy**; the **Facade** drives the **Factory Method**, **Prototype**, **State** and **Observer**.
- Observer goes *across processes* with Kafka: the worker pod is an observer of events produced by API pods.
- LangChain itself is **Strategy**: `ChatOllama` and the fake model share one interface, so the RAG code never changes (`src/modules/ai/llm/llm.providers.ts`).
- Visitor has a real trade-off: adding a new *operation* is easy (new visitor), but adding a new *account type* means touching every visitor.
