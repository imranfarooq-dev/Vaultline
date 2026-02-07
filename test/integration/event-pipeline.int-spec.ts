import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';
import { Kafka } from 'kafkajs';
import { DataSource } from 'typeorm';
import { startTestDatabase, TestDatabase } from '../support/postgres';

/**
 * INTEGRATION: the whole asynchronous path with REAL Kafka and REAL Postgres.
 *
 *   API process                 Kafka                    Worker process
 *   ledger -> event bus -> KafkaAdapter -> topic -> NotificationConsumer -> notifications table
 *
 * Requires Docker (Testcontainers). Skip with SKIP_KAFKA_TESTS=1.
 */
const describeKafka = process.env.SKIP_KAFKA_TESTS === '1' ? describe.skip : describe;

describeKafka('Event pipeline: API -> Kafka -> worker (integration)', () => {
  let db: TestDatabase;
  let kafka: StartedKafkaContainer;
  let api: INestApplication;
  let worker: INestApplication;
  let brokers: string;
  let dataSource: DataSource;

  const waitFor = async <T>(probe: () => Promise<T | undefined>, timeoutMs = 60_000): Promise<T> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const value = await probe();
      if (value !== undefined) return value;
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error('Timed out waiting for condition');
  };

  beforeAll(async () => {
    [db, kafka] = await Promise.all([startTestDatabase(), new KafkaContainer('confluentinc/cp-kafka:7.7.1').withKraft().start()]);
    brokers = `${kafka.getHost()}:${kafka.getMappedPort(9093)}`;
    db.applyToEnv();
    Object.assign(process.env, { KAFKA_ENABLED: 'true', KAFKA_BROKERS: brokers, KAFKA_SSL: 'false', AI_PROVIDER: 'fake', AI_AUTO_INGEST: 'false', KAFKA_CONSUMER_GROUP: 'test-notifications' });

    const { AppModule } = require('../../src/app.module') as typeof import('../../src/app.module');
    const { WorkerModule } = require('../../src/worker.module') as typeof import('../../src/worker.module');
    api = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication();
    worker = (await Test.createTestingModule({ imports: [WorkerModule] }).compile()).createNestApplication();
    await Promise.all([api.init(), worker.init()]);
    dataSource = api.get(getDataSourceToken());

    const { KafkaEventPublisherAdapter } = require('../../src/modules/messaging/kafka-event-publisher.adapter') as typeof import('../../src/modules/messaging/kafka-event-publisher.adapter');
    const { EVENT_PUBLISHER } = require('../../src/modules/messaging/event-publisher.port') as typeof import('../../src/modules/messaging/event-publisher.port');
    const adapter = api.get(EVENT_PUBLISHER) as InstanceType<typeof KafkaEventPublisherAdapter>;
    await waitFor(async () => (adapter.isConnected ? true : undefined));
  });

  afterAll(async () => {
    await worker?.close();
    await api?.close();
    await kafka?.stop();
    await db?.stop();
  });

  it('a deposit in the API becomes a notification written by the worker', async () => {
    const { BankingFacade } = require('../../src/modules/banking/banking.facade') as typeof import('../../src/modules/banking/banking.facade');
    const { account } = await api.get(BankingFacade).onboardCustomer({ ownerName: 'Kafka Kamran', type: 'CURRENT' as never, currency: 'PKR', initialDepositMinor: 75_000 });

    const rows = await waitFor(async () => {
      const r: { event_type: string; message: string }[] = await dataSource.query(`SELECT event_type, message FROM notifications WHERE payload->>'accountId' = $1`, [account.id]);
      return r.length >= 4 ? r : undefined; // opened, deposited, status-changed, onboarded
    });
    expect(rows.map((r) => r.event_type).sort()).toEqual(['account.opened', 'account.status-changed', 'customer.onboarded', 'transaction.deposited']);
    expect(rows.find((r) => r.event_type === 'transaction.deposited')?.message).toContain('Deposit of 750.00');
  });
});
