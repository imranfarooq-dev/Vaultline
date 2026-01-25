import { Injectable } from '@nestjs/common';
import { DomainEvent } from './domain-events';
import { EventPublisher } from './event-publisher.port';

/** Used when KAFKA_ENABLED=false (local hacking, unit & e2e tests). */
@Injectable()
export class InMemoryEventPublisher implements EventPublisher {
  readonly published: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.published.push(event);
  }
}
