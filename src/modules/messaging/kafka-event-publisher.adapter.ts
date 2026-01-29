import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Admin, Kafka, logLevel, Producer } from 'kafkajs';
import { AppConfigService } from '../../config/app-config.service';
import { ALL_TOPICS, DEAD_LETTER_TOPIC, DomainEvent, partitionKeyFor, topicFor } from './domain-events';
import { EventPublisher } from './event-publisher.port';

/**
 * ============================================================================
 * PATTERN: ADAPTER (Structural)
 * ============================================================================
 * Problem : Our code speaks "EventPublisher.publish(event)". The kafkajs library
 *           speaks "producer.send({ topic, messages: [{ key, value, headers }] })".
 *           The two interfaces do not match.
 * Solution: An adapter implements OUR interface and translates each call into
 *           the library's interface. Swapping Kafka for RabbitMQ later means
 *           writing a new adapter; nothing else changes.
 *
 * Analogy : A travel plug adapter. Your charger is unchanged, the wall socket
 *           is unchanged, the adapter makes them fit.
 * ============================================================================
 */
@Injectable()
export class KafkaEventPublisherAdapter implements EventPublisher, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaEventPublisherAdapter.name);
  private readonly kafka: Kafka;
  private readonly producer: Producer;
  private connected = false;
  private readonly replicationFactor: number;

  constructor(config: AppConfigService) {
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
      ssl: config.kafka.ssl,
      logLevel: logLevel.WARN,
      retry: { retries: 8, initialRetryTime: 500 },
    });
    this.replicationFactor = config.kafka.replicationFactor;
    this.producer = this.kafka.producer({ idempotent: true, maxInFlightRequests: 1 });
  }

  /** Connect in the background so a slow Kafka never blocks the HTTP server. */
  onModuleInit(): void {
    void this.connectWithRetry();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connected) await this.producer.disconnect();
  }

  get isConnected(): boolean {
    return this.connected;
  }

  async publish(event: DomainEvent): Promise<void> {
    if (!this.connected) throw new Error('Kafka producer is not connected yet');

    // --- the actual "adaptation" ---
    await this.producer.send({
      topic: topicFor(event.eventType),
      messages: [
        {
          key: partitionKeyFor(event),
          value: JSON.stringify(event),
          headers: { 'event-type': event.eventType, 'schema-version': String(event.schemaVersion) },
        },
      ],
    });
  }

  private async connectWithRetry(): Promise<void> {
    for (let attempt = 1; !this.connected; attempt++) {
      try {
        await this.ensureTopics();
        await this.producer.connect();
        this.connected = true;
        this.logger.log(`Connected to Kafka, topics: ${ALL_TOPICS.join(', ')}`);
      } catch (error) {
        const delay = Math.min(30_000, 1000 * attempt);
        this.logger.warn(`Kafka not reachable (${(error as Error).message}); retrying in ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}
