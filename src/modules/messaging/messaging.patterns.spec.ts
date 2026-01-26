import { DomainEventBus, DomainEventObserver } from './domain-event-bus.observer';
import { createEvent, EventTypes, partitionKeyFor, topicFor } from './domain-events';
import { formatNotification } from './consumers/notification-message.formatter';
import { InMemoryEventPublisher } from './in-memory-event-publisher';
import { EventForwardingObserver, EventMetricsObserver } from './observers';

const deposit = () => createEvent(EventTypes.MONEY_DEPOSITED, { accountId: '11111111-1111-4111-8111-111111111111', amountMinor: 5000, balanceAfterMinor: 9000, reference: 'DEP-1' });
