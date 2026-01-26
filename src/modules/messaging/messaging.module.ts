import { Global, Module, OnModuleInit } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { DomainEventBus } from './domain-event-bus.observer';
import { EVENT_PUBLISHER } from './event-publisher.port';
import { InMemoryEventPublisher } from './in-memory-event-publisher';
import { KafkaEventPublisherAdapter } from './kafka-event-publisher.adapter';
import { AuditLogObserver, EventForwardingObserver, EventMetricsObserver } from './observers';

@Global()
@Module({
  providers: [
    DomainEventBus,
    AuditLogObserver,
    EventForwardingObserver,
    EventMetricsObserver,
    InMemoryEventPublisher,
    {
      provide: EVENT_PUBLISHER,
      inject: [AppConfigService, InMemoryEventPublisher],
      useFactory: (config: AppConfigService, inMemory: InMemoryEventPublisher) =>
        config.kafka.enabled ? new KafkaEventPublisherAdapter(config) : inMemory,
    },
  ],
  exports: [DomainEventBus, EVENT_PUBLISHER, EventMetricsObserver, InMemoryEventPublisher],
})
export class MessagingModule implements OnModuleInit {
  constructor(
    private readonly bus: DomainEventBus,
    private readonly audit: AuditLogObserver,
    private readonly forwarder: EventForwardingObserver,
    private readonly metrics: EventMetricsObserver,
  ) {}
}
