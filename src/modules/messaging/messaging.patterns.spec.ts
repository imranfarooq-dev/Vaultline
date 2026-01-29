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

  it('a failing observer does not stop the others', async () => {
    const bus = new DomainEventBus();
    const broken: DomainEventObserver = { name: 'broken', interestedIn: () => true, onEvent: () => { throw new Error('boom'); } };
    const healthy = { name: 'healthy', interestedIn: () => true, onEvent: jest.fn() };
    bus.subscribe(broken);
    bus.subscribe(healthy);
    await expect(bus.publish(deposit())).resolves.toBeUndefined();
    expect(healthy.onEvent).toHaveBeenCalled();
  });

  it('unsubscribe stops notifications', async () => {
    const bus = new DomainEventBus();
    const observer = { name: 'x', interestedIn: () => true, onEvent: jest.fn() };
    const unsubscribe = bus.subscribe(observer);
    unsubscribe();
    await bus.publish(deposit());
    expect(observer.onEvent).not.toHaveBeenCalled();
  });

  it('forwarding and metrics observers do their jobs', async () => {
    const publisher = new InMemoryEventPublisher();
    const metrics = new EventMetricsObserver();
    const bus = new DomainEventBus();
    bus.subscribe(new EventForwardingObserver(publisher));
    bus.subscribe(metrics);
    await bus.publish(deposit());
    await bus.publish(deposit());
    expect(publisher.published).toHaveLength(2);
    expect(metrics.snapshot()).toEqual({ 'transaction.deposited': 2 });
  });
});
