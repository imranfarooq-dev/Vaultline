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
});
