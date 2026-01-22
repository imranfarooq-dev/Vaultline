import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from './domain-events';

/**
 * ============================================================================
 * PATTERN: OBSERVER (Behavioral)
 * ============================================================================
 * Problem : When money is deposited, several things must react: write an audit
 *           log, send the event to Kafka, update metrics... If the ledger code
 *           called each of those directly it would know about all of them and
 *           grow every time a new reaction is added.
 * Solution: The ledger only tells a SUBJECT (this bus) "something happened".
 *           OBSERVERS subscribe to the subject and get notified. New reactions
 *           = new observers, the ledger never changes.
 *
 * Analogy : Subscribing to a YouTube channel. The creator uploads once; every
 *           subscriber gets notified without the creator knowing who they are.
 *
 * Kafka takes the same idea ACROSS processes: the worker pod is an observer
 * of events produced by the API pods.
 * ============================================================================
 */
export interface DomainEventObserver {
  readonly name: string;
  /** Return true to receive this event. */
  interestedIn(event: DomainEvent): boolean;
  onEvent(event: DomainEvent): Promise<void> | void;
}

@Injectable()
export class DomainEventBus {
  private readonly logger = new Logger(DomainEventBus.name);
  private readonly observers = new Set<DomainEventObserver>();

  subscribe(observer: DomainEventObserver): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer); // call to unsubscribe
  }

  async publish(event: DomainEvent): Promise<void> {
    const deliveries = [...this.observers]
      .filter((observer) => observer.interestedIn(event))
      .map(async (observer) => {
        try {
          await observer.onEvent(event);
        } catch (error) {
          // One broken observer must never break the others or the business operation.
          this.logger.error(`Observer "${observer.name}" failed for ${event.eventType}: ${(error as Error).message}`);
        }
      });
    await Promise.all(deliveries);
  }
}
