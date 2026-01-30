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
}
