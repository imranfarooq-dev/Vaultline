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
});
