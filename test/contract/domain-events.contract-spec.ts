import { formatNotification } from '../../src/modules/messaging/consumers/notification-message.formatter';
import { ALL_TOPICS, createEvent, DEAD_LETTER_TOPIC, EventType, EventTypes, payloadSchemas, topicFor, validateEvent } from '../../src/modules/messaging/domain-events';

/**
 * CONTRACT TESTS
 * The API (producer) and the worker (consumer) are deployed separately and may
 * run different versions during a rolling update. These tests freeze the shape
 * of what travels over Kafka. If one fails, you are about to break a consumer:
 * add a new schemaVersion instead of silently changing the payload.
 */
const ID = '3f9c2a4e-8d1b-4c7a-9e2f-1a2b3c4d5e6f';
const ID2 = '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

const VALID_PAYLOADS: Record<EventType, Record<string, unknown>> = {
  [EventTypes.ACCOUNT_OPENED]: { accountId: ID, accountNumber: 'PK12NBPT0000000000000001', ownerName: 'Ayesha', type: 'SAVINGS', currency: 'PKR' },
  [EventTypes.ACCOUNT_STATUS_CHANGED]: { accountId: ID, from: 'ACTIVE', to: 'FROZEN' },
  [EventTypes.MONEY_DEPOSITED]: { accountId: ID, amountMinor: 1000, balanceAfterMinor: 5000, reference: 'DEP-1' },
  [EventTypes.MONEY_WITHDRAWN]: { accountId: ID, amountMinor: 1000, balanceAfterMinor: 4000, reference: 'WDL-1' },
  [EventTypes.MONEY_TRANSFERRED]: { fromAccountId: ID, toAccountId: ID2, amountMinor: 1000, feeMinor: 0, reference: 'TRF-1' },
  [EventTypes.TRANSACTION_REVERSED]: { accountId: ID, originalReference: 'DEP-1', reference: 'REV-1', amountMinor: -1000 },
  [EventTypes.LOAN_DECIDED]: { loanId: ID2, accountId: ID, status: 'APPROVED', amountMinor: 50_000_000 },
  [EventTypes.CUSTOMER_ONBOARDED]: { accountId: ID, ownerName: 'Ayesha', initialDepositMinor: 0 },
};

describe('Contract: domain events on Kafka', () => {
  it('topic names are frozen (consumers subscribe by name)', () => {
    expect(ALL_TOPICS.sort()).toEqual(['banking.account-events', 'banking.customer-events', 'banking.loan-events', 'banking.transaction-events']);
    expect(DEAD_LETTER_TOPIC).toBe('banking.dead-letter');
  });

  it('event type names are frozen', () => {
    expect(Object.values(EventTypes).sort()).toMatchSnapshot();
  });
});
