import { DomainEvent } from './domain-events';

/**
 * A "port": what the application NEEDS (publish an event), with no idea
 * HOW it happens. Kafka is just one adapter that plugs into this port.
 */
export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
}

export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');
