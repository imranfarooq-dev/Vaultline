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
}
