import { DomainEvent, EventTypes } from '../domain-events';

const pkr = (minor: unknown) => `${(Number(minor) / 100).toFixed(2)}`;

/** Turns a raw event into a sentence a customer could read in an SMS or app inbox. */
export const formatNotification = (event: DomainEvent): string => {
  const p = event.payload as Record<string, unknown>;
  switch (event.eventType) {
    case EventTypes.ACCOUNT_OPENED:
      return `Welcome ${p.ownerName}! Your ${p.type} account ${p.accountNumber} is open.`;
    case EventTypes.ACCOUNT_STATUS_CHANGED:
      return `Your account status changed from ${p.from} to ${p.to}.`;
    case EventTypes.MONEY_DEPOSITED:
      return `Deposit of ${pkr(p.amountMinor)} received. New balance ${pkr(p.balanceAfterMinor)}. Ref ${p.reference}.`;
    case EventTypes.MONEY_WITHDRAWN:
      return `Withdrawal of ${pkr(p.amountMinor)}. New balance ${pkr(p.balanceAfterMinor)}. Ref ${p.reference}.`;
    case EventTypes.MONEY_TRANSFERRED:
      return `Transfer of ${pkr(p.amountMinor)} completed (fee ${pkr(p.feeMinor)}). Ref ${p.reference}.`;
    case EventTypes.TRANSACTION_REVERSED:
      return `Transaction ${p.originalReference} was reversed.`;
    case EventTypes.LOAN_DECIDED:
      return `Your loan application for ${pkr(p.amountMinor)} is ${p.status}.`;
    case EventTypes.CUSTOMER_ONBOARDED:
      return `Onboarding complete for ${p.ownerName}.`;
    default:
      return `Event ${event.eventType}`;
  }
};
