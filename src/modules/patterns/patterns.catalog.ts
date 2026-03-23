/**
 * One place that maps every Gang of Four pattern to real code and a real
 * endpoint. Served at GET /api/patterns and checked by test/docs/patterns-catalog.spec.ts,
 * so this list can never silently drift from the code.
 */
export interface PatternEntry {
  pattern: string;
  category: 'Creational' | 'Structural' | 'Behavioral';
  inOneLine: string;
  file: string;
  tryIt: string;
}

export const PATTERN_CATALOG: PatternEntry[] = [
  // ---------------- Creational ----------------
  { pattern: 'Singleton', category: 'Creational', inOneLine: 'Exactly one shared reference-number generator', file: 'src/modules/core/reference-number.singleton.ts', tryIt: 'POST /api/transactions/deposit (see the reference)' },
  { pattern: 'Factory Method', category: 'Creational', inOneLine: 'Subclasses decide how Savings/Current/FD accounts are created', file: 'src/modules/accounts/domain/account.factory.ts', tryIt: 'POST /api/accounts' },
  { pattern: 'Abstract Factory', category: 'Creational', inOneLine: 'Matching validator + fee + formatter families for RAAST and SWIFT', file: 'src/modules/payments/payment-rail.abstract-factory.ts', tryIt: 'POST /api/payments/quote' },
  { pattern: 'Builder', category: 'Creational', inOneLine: 'Step-by-step, validated loan application', file: 'src/modules/loans/domain/loan-application.builder.ts', tryIt: 'POST /api/loans/drafts/:id/submit' },
  { pattern: 'Prototype', category: 'Creational', inOneLine: 'Account products cloned from base prototypes', file: 'src/modules/accounts/domain/account-product.prototype.ts', tryIt: 'GET /api/accounts/products' },
  // ---------------- Structural ----------------
  { pattern: 'Adapter', category: 'Structural', inOneLine: 'Kafka client and legacy credit bureau behind our own interfaces', file: 'src/modules/messaging/kafka-event-publisher.adapter.ts', tryIt: 'GET /api/loans/credit-report/Ali%20Raza' },
  { pattern: 'Bridge', category: 'Structural', inOneLine: 'Statement types x output formats without class explosion', file: 'src/modules/statements/statement.bridge.ts', tryIt: 'GET /api/statements/:accountId?type=detailed&format=csv' },
  { pattern: 'Composite', category: 'Structural', inOneLine: 'Portfolio tree of groups and accounts with rolled-up totals', file: 'src/modules/accounts/domain/portfolio.composite.ts', tryIt: 'GET /api/accounts/portfolio/:ownerName' },
  { pattern: 'Decorator', category: 'Structural', inOneLine: 'Audit, fraud screening and fees layered around transfers', file: 'src/modules/transactions/transfer/money-transfer.decorators.ts', tryIt: 'POST /api/transactions/transfer (see "pipeline")' },
  { pattern: 'Facade', category: 'Structural', inOneLine: 'One call to onboard a customer across many subsystems', file: 'src/modules/banking/banking.facade.ts', tryIt: 'POST /api/banking/onboard' },
  { pattern: 'Flyweight', category: 'Structural', inOneLine: 'Shared immutable Currency objects', file: 'src/modules/core/currency.flyweight.ts', tryIt: 'GET /api/accounts/currencies' },
  { pattern: 'Proxy', category: 'Structural', inOneLine: 'Caching, rate-limiting proxy in front of a slow FX provider', file: 'src/modules/fx/exchange-rate.proxy.ts', tryIt: 'GET /api/fx/convert?from=USD&to=PKR&amountMinor=10000 (twice)' },
  // ---------------- Behavioral ----------------
  { pattern: 'Chain of Responsibility', category: 'Behavioral', inOneLine: 'Amount, status, funds and daily-limit checks as linked handlers', file: 'src/modules/transactions/validation/transaction-validation.chain.ts', tryIt: 'POST /api/transactions/withdraw with too much money' },
  { pattern: 'Command', category: 'Behavioral', inOneLine: 'Deposits/withdrawals/transfers as objects with undo', file: 'src/modules/transactions/commands/bank.commands.ts', tryIt: 'POST /api/transactions/commands/:commandId/undo' },
  { pattern: 'Interpreter', category: 'Behavioral', inOneLine: 'A small fraud-rule language parsed and evaluated at runtime', file: 'src/modules/fraud/fraud-rule.interpreter.ts', tryIt: 'POST /api/fraud/evaluate' },
  { pattern: 'Iterator', category: 'Behavioral', inOneLine: 'Page through millions of ledger entries one at a time', file: 'src/modules/transactions/ledger-history.iterator.ts', tryIt: 'GET /api/transactions/accounts/:accountId/export.csv' },
  { pattern: 'Mediator', category: 'Behavioral', inOneLine: 'Loan desks coordinate only through an approval mediator', file: 'src/modules/loans/domain/loan-approval.mediator.ts', tryIt: 'POST /api/loans/drafts/:id/submit (see decisionLog)' },
  { pattern: 'Memento', category: 'Behavioral', inOneLine: 'Undo changes to a loan draft via snapshots', file: 'src/modules/loans/domain/loan-draft.memento.ts', tryIt: 'POST /api/loans/drafts/:id/undo' },
  { pattern: 'Observer', category: 'Behavioral', inOneLine: 'Event bus notifies audit, metrics and Kafka observers', file: 'src/modules/messaging/domain-event-bus.observer.ts', tryIt: 'GET /api/events/stats' },
  { pattern: 'State', category: 'Behavioral', inOneLine: 'Pending/Active/Frozen/Closed decide what an account may do', file: 'src/modules/accounts/domain/account-state.ts', tryIt: 'PATCH /api/accounts/:id/status' },
  { pattern: 'Strategy', category: 'Behavioral', inOneLine: 'Swappable interest algorithms per account type', file: 'src/modules/accounts/domain/interest.strategy.ts', tryIt: 'GET /api/accounts/:id/interest-preview' },
  { pattern: 'Template Method', category: 'Behavioral', inOneLine: 'Batch jobs share one skeleton, differ in steps', file: 'src/modules/operations/end-of-day.template-method.ts', tryIt: 'POST /api/operations/jobs/interest-posting/run' },
  { pattern: 'Visitor', category: 'Behavioral', inOneLine: 'Fee, tax and risk reports over accounts without changing them', file: 'src/modules/accounts/domain/account.visitor.ts', tryIt: 'GET /api/accounts/reports/month-end' },
];
