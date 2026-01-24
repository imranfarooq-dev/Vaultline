import { randomUUID } from 'node:crypto';
import * as Joi from 'joi';

/**
 * Event CONTRACTS shared by the producer (API) and the consumer (worker).
 * Changing a payload shape is a breaking change: test/contract protects it.
 */
export const EventTypes = {
  ACCOUNT_OPENED: 'account.opened',
  ACCOUNT_STATUS_CHANGED: 'account.status-changed',
  MONEY_DEPOSITED: 'transaction.deposited',
  MONEY_WITHDRAWN: 'transaction.withdrawn',
  MONEY_TRANSFERRED: 'transaction.transferred',
  TRANSACTION_REVERSED: 'transaction.reversed',
  LOAN_DECIDED: 'loan.decided',
  CUSTOMER_ONBOARDED: 'customer.onboarded',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

export interface DomainEvent<TPayload = Record<string, unknown>> {
  eventId: string;
  eventType: EventType;
  occurredAt: string;
  schemaVersion: 1;
  payload: TPayload;
}

export const createEvent = <T extends Record<string, unknown>>(eventType: EventType, payload: T): DomainEvent<T> => ({
  eventId: randomUUID(),
  eventType,
  occurredAt: new Date().toISOString(),
  schemaVersion: 1,
  payload,
});

/** "transaction.deposited" -> "banking.transaction-events" */
export const topicFor = (eventType: string): string => `banking.${eventType.split('.')[0]}-events`;

export const ALL_TOPICS = [...new Set(Object.values(EventTypes).map(topicFor))];
export const DEAD_LETTER_TOPIC = 'banking.dead-letter';

/** Kafka key: events for the same account land in the same partition, so they stay in order. */
export const partitionKeyFor = (event: DomainEvent): string =>
  String(event.payload.accountId ?? event.payload.fromAccountId ?? event.eventId);

const uuid = Joi.string().uuid();
const minor = Joi.number().integer();

export const payloadSchemas: Record<EventType, Joi.ObjectSchema> = {
  [EventTypes.ACCOUNT_OPENED]: Joi.object({ accountId: uuid.required(), accountNumber: Joi.string().required(), ownerName: Joi.string().required(), type: Joi.string().required(), currency: Joi.string().length(3).required() }),
  [EventTypes.ACCOUNT_STATUS_CHANGED]: Joi.object({ accountId: uuid.required(), from: Joi.string().required(), to: Joi.string().required() }),
  [EventTypes.MONEY_DEPOSITED]: Joi.object({ accountId: uuid.required(), amountMinor: minor.positive().required(), balanceAfterMinor: minor.required(), reference: Joi.string().required() }),
  [EventTypes.MONEY_WITHDRAWN]: Joi.object({ accountId: uuid.required(), amountMinor: minor.positive().required(), balanceAfterMinor: minor.required(), reference: Joi.string().required() }),
  [EventTypes.MONEY_TRANSFERRED]: Joi.object({ fromAccountId: uuid.required(), toAccountId: uuid.required(), amountMinor: minor.positive().required(), feeMinor: minor.min(0).required(), reference: Joi.string().required() }),
  [EventTypes.TRANSACTION_REVERSED]: Joi.object({ accountId: uuid.required(), originalReference: Joi.string().required(), reference: Joi.string().required(), amountMinor: minor.required() }),
  [EventTypes.LOAN_DECIDED]: Joi.object({ loanId: uuid.required(), accountId: uuid.required(), status: Joi.string().required(), amountMinor: minor.positive().required() }),
  [EventTypes.CUSTOMER_ONBOARDED]: Joi.object({ accountId: uuid.required(), ownerName: Joi.string().required(), initialDepositMinor: minor.min(0).required() }),
};

export const envelopeSchema = Joi.object({
  eventId: uuid.required(),
  eventType: Joi.string().valid(...Object.values(EventTypes)).required(),
  occurredAt: Joi.string().isoDate().required(),
  schemaVersion: Joi.number().valid(1).required(),
  payload: Joi.object().required(),
});

export const validateEvent = (event: unknown): { valid: boolean; error?: string } => {
  const envelope = envelopeSchema.validate(event);
  if (envelope.error) return { valid: false, error: envelope.error.message };
  const typed = event as DomainEvent;
  const payload = payloadSchemas[typed.eventType].validate(typed.payload);
  return payload.error ? { valid: false, error: payload.error.message } : { valid: true };
};
