import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { join } from 'node:path';
import request from 'supertest';
import { startTestDatabase, TestDatabase } from '../support/postgres';

/**
 * END-TO-END: real HTTP requests through the complete app
 * (validation pipe, exception filter, controllers, services, real Postgres).
 * Kafka is replaced by the in-memory publisher and the LLM by the fake model,
 * so this suite needs only Postgres.
 */
describe('Customer journey (e2e)', () => {
  let db: TestDatabase;
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  const J = { 'content-type': 'application/json' };

  beforeAll(async () => {
    db = await startTestDatabase();
    db.applyToEnv();
    Object.assign(process.env, { KAFKA_ENABLED: 'false', AI_PROVIDER: 'fake', AI_AUTO_INGEST: 'false', KNOWLEDGE_DIR: join(__dirname, '..', '..', 'knowledge') });

    const { AppModule } = require('../../src/app.module') as typeof import('../../src/app.module');
    const { configureApp } = require('../../src/app.setup') as typeof import('../../src/app.setup');
    app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication();
    configureApp(app, false);
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  let salary: { id: string; accountNumber: string };
  let business: { id: string };

  it('health and pattern catalog are available', async () => {
    await http.get('/api/health/ready').expect(200);
    const { body } = await http.get('/api/patterns').expect(200);
    expect(body.total).toBe(23);
  });

  it('rejects invalid and unexpected input with 400', async () => {
    const { body } = await http.post('/api/banking/onboard').set(J).send({ ownerName: 'X', type: 'GOLD', currency: 'PKR', hacker: true }).expect(400);
    expect(body.error).toBe('HTTP_ERROR');
    expect(JSON.stringify(body.message)).toContain('property hacker should not exist');
  });

  it('onboards two accounts for the same customer', async () => {
    const s = await http.post('/api/banking/onboard').set(J).send({ ownerName: 'Zara Malik', type: 'SAVINGS', currency: 'PKR', productCode: 'BASIC_SAVER', initialDepositMinor: 20_000_000 }).expect(201);
    const b = await http.post('/api/banking/onboard').set(J).send({ ownerName: 'Zara Malik', type: 'CURRENT', currency: 'PKR', initialDepositMinor: 0 }).expect(201);
    salary = s.body.account;
    business = b.body.account;
    expect(s.body.account).toMatchObject({ status: 'ACTIVE', balanceMinor: 20_000_000, productCode: 'BASIC_SAVER' });
  });

  it('moves money and shows it everywhere consistently', async () => {
    const t = await http.post('/api/transactions/transfer').set(J).send({ fromAccountId: salary.id, toAccountId: business.id, amountMinor: 3_000_000, channel: 'web' }).expect(201);
    expect(t.body.pipeline).toEqual(['audit', 'fraud-screening', 'fee', 'ledger']);

    const overview = await http.get('/api/banking/customers/Zara%20Malik/overview').expect(200);
    expect(overview.body.portfolio.totals).toEqual({ PKR: 20_000_000 });

    const statement = await http.get(`/api/statements/${salary.id}?type=detailed&format=json`).expect(200);
    expect(JSON.parse(statement.text).summary['Closing balance']).toBe('Rs 170,000.00');

    const csv = await http.get(`/api/transactions/accounts/${salary.id}/export.csv`).expect(200);
    expect(csv.text.trim().split('\n')).toHaveLength(3); // header + deposit + transfer
  });

  it('maps business errors to meaningful HTTP codes', async () => {
    await http.post('/api/transactions/transfer').set(J).send({ fromAccountId: salary.id, toAccountId: business.id, amountMinor: 6_000_000, channel: 'mobile' }).expect(403);
    await http.post('/api/transactions/withdraw').set(J).send({ accountId: business.id, amountMinor: 999_999_999 }).expect(422);
    await http.patch(`/api/accounts/${salary.id}/status`).set(J).send({ action: 'close' }).expect(409);
    const missing = await http.get('/api/accounts/00000000-0000-4000-8000-000000000000').expect(404);
    expect(missing.body).toMatchObject({ error: 'NOT_FOUND' });
  });

  it('completes a loan journey with undo, builder validation and mediator decision', async () => {
    const draft = await http.post('/api/loans/drafts').set(J).send({ applicantName: 'Zara Malik', accountId: salary.id, amountMinor: 30_000_000, termMonths: 36, purpose: 'home renovation', monthlyIncomeMinor: 50_000_000 }).expect(201);
    const id = draft.body.draftId;
    await http.patch(`/api/loans/drafts/${id}`).set(J).send({ amountMinor: 900_000_000 }).expect(200);
    await http.post(`/api/loans/drafts/${id}/undo`).expect(201);
    const decision = await http.post(`/api/loans/drafts/${id}/submit`).expect(201);
    expect(['APPROVED', 'REJECTED', 'MANUAL_REVIEW']).toContain(decision.body.status);
    expect(decision.body.decisionLog.length).toBeGreaterThan(0);
    await http.get(`/api/loans/${decision.body.id}`).expect(200);
  });
});
