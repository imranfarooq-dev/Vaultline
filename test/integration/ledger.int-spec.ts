import { INestApplicationContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { startTestDatabase, TestDatabase } from '../support/postgres';

/**
 * INTEGRATION: the ledger against a REAL PostgreSQL.
 * These are the things mocks cannot prove: row locks, transactions,
 * CHECK constraints and correct behaviour under concurrency.
 */
describe('Ledger (PostgreSQL integration)', () => {
  let db: TestDatabase;
  let app: INestApplicationContext;
  let ledger: import('../../src/modules/transactions/ledger.service').LedgerService;
  let accounts: import('../../src/modules/accounts/accounts.service').AccountsService;
  let publisher: import('../../src/modules/messaging/in-memory-event-publisher').InMemoryEventPublisher;
  let dataSource: DataSource;

  beforeAll(async () => {
    db = await startTestDatabase();
    db.applyToEnv();
    Object.assign(process.env, { KAFKA_ENABLED: 'false', AI_PROVIDER: 'fake', AI_AUTO_INGEST: 'false' });

    // Import after env is set, so configuration is read from the test database.
    const { AppModule } = require('../../src/app.module') as typeof import('../../src/app.module');
    app = await Test.createTestingModule({ imports: [AppModule] }).compile();
    await app.init();

    ledger = app.get((require('../../src/modules/transactions/ledger.service') as typeof import('../../src/modules/transactions/ledger.service')).LedgerService);
    accounts = app.get((require('../../src/modules/accounts/accounts.service') as typeof import('../../src/modules/accounts/accounts.service')).AccountsService);
    publisher = app.get((require('../../src/modules/messaging/in-memory-event-publisher') as typeof import('../../src/modules/messaging/in-memory-event-publisher')).InMemoryEventPublisher);
    dataSource = app.get(getDataSourceToken());
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  const activeAccount = async (depositMinor: number, type: 'CURRENT' | 'SAVINGS' = 'CURRENT') => {
    const account = await accounts.open({ ownerName: 'Integration Test', type: type as never, currency: 'PKR', initialDepositMinor: depositMinor });
    if (depositMinor > 0) await ledger.deposit(account.id, depositMinor);
    await accounts.changeStatus(account.id, 'activate');
    return account;
  };

  const balanceOf = async (id: string) => (await accounts.findById(id)).balanceMinor;

  it('deposit and withdrawal update the balance and write ledger entries', async () => {
    const account = await activeAccount(10_000);
    await ledger.withdraw(account.id, 2_500);

    expect(await balanceOf(account.id)).toBe(7_500);
    const rows = await dataSource.query('SELECT type, amount_minor::int AS amount FROM ledger_entries WHERE account_id = $1 ORDER BY created_at', [account.id]);
    expect(rows).toEqual([{ type: 'DEPOSIT', amount: 10_000 }, { type: 'WITHDRAWAL', amount: -2_500 }]);
  });

  it('CONCURRENCY: 20 parallel withdrawals never overdraw the account', async () => {
    const account = await activeAccount(1_000);
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => ledger.withdraw(account.id, 100)));

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(10);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(10);
    expect(await balanceOf(account.id)).toBe(0);
  });

  it('CONCURRENCY: opposite transfers at the same time do not deadlock and money is conserved', async () => {
    const a = await activeAccount(100_000);
    const b = await activeAccount(100_000);
    const transfers = Array.from({ length: 10 }, (_, i) =>
      i % 2 ? ledger.transfer({ fromAccountId: a.id, toAccountId: b.id, amountMinor: 1_000, feeMinor: 0 }) : ledger.transfer({ fromAccountId: b.id, toAccountId: a.id, amountMinor: 1_000, feeMinor: 0 }),
    );
    await Promise.all(transfers);
    expect((await balanceOf(a.id)) + (await balanceOf(b.id))).toBe(200_000);
  });

  it('a transfer with a fee writes three entries sharing one reference, atomically', async () => {
    const from = await activeAccount(50_000);
    const to = await activeAccount(0);
    const { reference } = await ledger.transfer({ fromAccountId: from.id, toAccountId: to.id, amountMinor: 10_000, feeMinor: 500 });

    const rows = await dataSource.query('SELECT type FROM ledger_entries WHERE reference = $1 ORDER BY type', [reference]);
    expect(rows.map((r: { type: string }) => r.type)).toEqual(['FEE', 'TRANSFER_IN', 'TRANSFER_OUT']);
    expect(await balanceOf(from.id)).toBe(39_500);
    expect(await balanceOf(to.id)).toBe(10_000);
  });

  it('a failed transfer rolls back completely', async () => {
    const from = await activeAccount(1_000);
    const to = await activeAccount(0);
    await expect(ledger.transfer({ fromAccountId: from.id, toAccountId: to.id, amountMinor: 5_000, feeMinor: 0 })).rejects.toThrow('Insufficient funds');
    expect(await balanceOf(from.id)).toBe(1_000);
    expect(await balanceOf(to.id)).toBe(0);
  });

  it('reversal restores balances exactly once', async () => {
    const account = await activeAccount(5_000);
    const { reference } = await ledger.deposit(account.id, 2_000);
    await ledger.reverse(reference);
    expect(await balanceOf(account.id)).toBe(5_000);
    await expect(ledger.reverse(reference)).rejects.toThrow('already reversed');
  });
});
