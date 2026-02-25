import { CurrencyRegistry } from '../core/currency.flyweight';
import { CsvStatementRenderer, DetailedStatement, JsonStatementRenderer, MiniStatement, PlainTextStatementRenderer, RENDERERS, STATEMENTS, StatementData } from './statement.bridge';

describe('Bridge: statements x renderers', () => {
  const data: StatementData = {
    accountNumber: 'PK00TEST',
    ownerName: 'Test, "Quoted" Owner',
    currency: new CurrencyRegistry().get('PKR'),
    currentBalanceMinor: 150_000,
    lines: Array.from({ length: 12 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}T10:00:00.000Z`,
      reference: `REF-${i + 1}`,
      type: i % 2 ? 'WITHDRAWAL' : 'DEPOSIT',
      description: i === 0 ? 'Salary, January' : 'entry',
      amountMinor: i % 2 ? -10_000 : 35_000,
      balanceAfterMinor: 0,
    })),
  };
});
