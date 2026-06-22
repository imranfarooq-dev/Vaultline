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
