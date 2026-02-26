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

  it('every statement works with every renderer (2 x 3 = 6 combinations, 5 classes)', () => {
    for (const StatementClass of Object.values(STATEMENTS)) {
      for (const makeRenderer of Object.values(RENDERERS)) {
        const out = new StatementClass(makeRenderer()).generate(data);
        expect(out.body.length).toBeGreaterThan(0);
      }
    }
  });

  it('mini statement keeps only the last 10 lines', () => {
    const json = JSON.parse(new MiniStatement(new JsonStatementRenderer()).generate(data).body);
    expect(json.rows).toHaveLength(10);
    expect(json.rows[0].reference).toBe('REF-3');
  });

  it('detailed statement computes totals', () => {
    const json = JSON.parse(new DetailedStatement(new JsonStatementRenderer()).generate(data).body);
    expect(json.summary).toMatchObject({ 'Total credits': 'Rs 2,100.00', 'Total debits': 'Rs -600.00', Transactions: '12' });
  });

  it('CSV renderer escapes commas and quotes', () => {
    const csv = new DetailedStatement(new CsvStatementRenderer()).generate(data);
    expect(csv.contentType).toBe('text/csv');
    expect(csv.body).toContain('"Salary, January"');
  });
});
