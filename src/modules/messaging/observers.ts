import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from './domain-events';
import { DomainEventObserver } from './domain-event-bus.observer';
import { EVENT_PUBLISHER, EventPublisher } from './event-publisher.port';

/** Observer #1: writes a structured audit line for every event. */
@Injectable()
export class AuditLogObserver implements DomainEventObserver {
  readonly name = 'audit-log';
  private readonly logger = new Logger('Audit');

  interestedIn(): boolean {
    return true;
  }

  onEvent(event: DomainEvent): void {
    this.logger.log(`${event.eventType} ${JSON.stringify(event.payload)}`);
  }
}

/** Observer #2: forwards events to Kafka (or the in-memory publisher). */
@Injectable()
export class EventForwardingObserver implements DomainEventObserver {
  readonly name = 'event-forwarder';

  constructor(@Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher) {}

  interestedIn(): boolean {
    return true;
  }
}
