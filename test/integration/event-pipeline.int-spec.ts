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
