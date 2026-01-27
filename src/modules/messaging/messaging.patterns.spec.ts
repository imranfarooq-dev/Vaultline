import { DomainEventBus, DomainEventObserver } from './domain-event-bus.observer';
import { createEvent, EventTypes, partitionKeyFor, topicFor } from './domain-events';
import { formatNotification } from './consumers/notification-message.formatter';
import { InMemoryEventPublisher } from './in-memory-event-publisher';
import { EventForwardingObserver, EventMetricsObserver } from './observers';

const deposit = () => createEvent(EventTypes.MONEY_DEPOSITED, { accountId: '11111111-1111-4111-8111-111111111111', amountMinor: 5000, balanceAfterMinor: 9000, reference: 'DEP-1' });

describe('Observer: domain event bus', () => {
  it('notifies every interested observer', async () => {
    const bus = new DomainEventBus();
    const a = { name: 'a', interestedIn: () => true, onEvent: jest.fn() };
    const b = { name: 'b', interestedIn: (e: { eventType: string }) => e.eventType.startsWith('loan.'), onEvent: jest.fn() };
    bus.subscribe(a);
    bus.subscribe(b);
    await bus.publish(deposit());
    expect(a.onEvent).toHaveBeenCalledTimes(1);
    expect(b.onEvent).not.toHaveBeenCalled();
  });
});
