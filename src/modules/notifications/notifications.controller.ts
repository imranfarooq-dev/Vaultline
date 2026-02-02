import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from '../../database/entities';
import { DomainEventBus } from '../messaging/domain-event-bus.observer';
import { EVENT_PUBLISHER, EventPublisher } from '../messaging/event-publisher.port';
import { InMemoryEventPublisher } from '../messaging/in-memory-event-publisher';
import { EventMetricsObserver } from '../messaging/observers';

@ApiTags('Events & notifications (Observer, Kafka)')
@Controller()
export class NotificationsController {
  constructor(
    @InjectRepository(NotificationEntity) private readonly notifications: Repository<NotificationEntity>,
    private readonly metrics: EventMetricsObserver,
    private readonly bus: DomainEventBus,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
  ) {}

  @Get('notifications')
  @ApiOperation({ summary: 'Written by the Kafka WORKER after consuming events (empty if Kafka is disabled)' })
  latest() {
    return this.notifications.find({ order: { createdAt: 'DESC' }, take: 50 });
  }
}
