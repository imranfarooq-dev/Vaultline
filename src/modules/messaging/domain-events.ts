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
