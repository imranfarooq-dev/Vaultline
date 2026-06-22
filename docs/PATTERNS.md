# The 23 Gang of Four patterns in NestBank

Every pattern below is real, running code in a banking feature, not a toy `Animal`/`Dog` example.
Each source file opens with a comment block: **Problem / Solution / Analogy**. Read that first, then the code, then its test.

Memory trick:
**Creational** = *How do I make it?* · **Structural** = *How do I connect it?* · **Behavioral** = *How do they work together?*

`GET /api/patterns` returns this same map as JSON, and `test/docs/patterns-catalog.spec.ts` fails the build if the map and the code ever disagree.

---
