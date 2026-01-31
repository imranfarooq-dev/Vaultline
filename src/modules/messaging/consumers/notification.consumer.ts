import { Injectable, Logger, OnApplicationShutdown, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Consumer, EachMessagePayload, Kafka, logLevel, Producer } from 'kafkajs';
import { Repository } from 'typeorm';
import { AppConfigService } from '../../../config/app-config.service';
import { NotificationEntity } from '../../../database/entities';
import { ALL_TOPICS, DEAD_LETTER_TOPIC, DomainEvent, validateEvent } from '../domain-events';
import { formatNotification } from './notification-message.formatter';

/**
 * Runs in the WORKER process (APP_MODE=worker).
 *
 * Enterprise details worth noticing:
 *  - consumer group: run 3 worker pods and Kafka splits partitions between them
 *  - idempotency   : event_id is the primary key, so a redelivered message is ignored
 *  - dead letters  : a message that can never be processed goes to banking.dead-letter
 *                    instead of blocking the partition forever
 */
@Injectable()
export class NotificationConsumer implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(NotificationConsumer.name);
  private readonly consumer: Consumer;
  private readonly dlqProducer: Producer;

  constructor(
    config: AppConfigService,
    @InjectRepository(NotificationEntity) private readonly notifications: Repository<NotificationEntity>,
  ) {
    const kafka = new Kafka({ clientId: `${config.kafka.clientId}-worker`, brokers: config.kafka.brokers, ssl: config.kafka.ssl, logLevel: logLevel.WARN, retry: { retries: 10 } });
    this.consumer = kafka.consumer({ groupId: config.kafka.consumerGroup });
    this.dlqProducer = kafka.producer();
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.startWithRetry();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.consumer.disconnect().catch(() => undefined);
    await this.dlqProducer.disconnect().catch(() => undefined);
  }

  /** Public so the integration test can call it directly. */
  async handle({ topic, partition, message }: Pick<EachMessagePayload, 'topic' | 'partition' | 'message'>): Promise<void> {
    const raw = message.value?.toString() ?? '';
    try {
      const event = JSON.parse(raw) as DomainEvent;
      const check = validateEvent(event);
      if (!check.valid) throw new Error(`Invalid event: ${check.error}`);

      await this.notifications
        .createQueryBuilder()
        .insert()
        .values({ eventId: event.eventId, eventType: event.eventType, message: formatNotification(event), payload: event.payload as NotificationEntity["payload"] })
        .orIgnore() // ON CONFLICT DO NOTHING -> idempotent
        .execute();
    } catch (error) {
      this.logger.error(`Sending message from ${topic}[${partition}] to dead-letter: ${(error as Error).message}`);
      await this.dlqProducer.send({
        topic: DEAD_LETTER_TOPIC,
        messages: [{ value: raw, headers: { 'original-topic': topic, error: (error as Error).message } }],
      });
    }
  }
}
