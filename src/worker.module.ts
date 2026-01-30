import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { NotificationEntity } from './database/entities';
import { HealthModule } from './modules/health/health.module';
import { NotificationConsumer } from './modules/messaging/consumers/notification.consumer';
import { MessagingModule } from './modules/messaging/messaging.module';

/**
 * The Kafka consumer process (APP_MODE=worker). Same Docker image as the API,
 * different entry module. Scale it independently: `kubectl scale deploy/banking-worker --replicas=3`.
 */
@Module({
  imports: [AppConfigModule, DatabaseModule, MessagingModule, HealthModule, TypeOrmModule.forFeature([NotificationEntity])],
  providers: [NotificationConsumer],
})
export class WorkerModule {}
