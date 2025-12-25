import { BusinessRuleError, InvalidStateTransitionError } from '../../../common/errors/domain.errors';
import { AccountEntity } from '../../../database/entities';
import { stateOf } from '../../accounts/domain/account-state';

/**
 * ============================================================================
 * PATTERN: CHAIN OF RESPONSIBILITY (Behavioral)
 * ============================================================================
 * Problem : Before money moves we run many checks: amount is positive, account
 *           status allows it, enough balance, daily limit not exceeded...
 *           One long method with all checks is hard to read, reorder or extend.
 * Solution: Each check is a small HANDLER linked to the next one. A request
 *           travels down the chain; any handler can stop it (throw) or pass it
 *           on. Adding a check = adding a link.
 *
 * Analogy : A bank complaint goes clerk -> supervisor -> branch manager,
 *           stopping at whoever can deal with it.
 * ============================================================================
 */
export interface ValidationContext {
  operation: 'DEPOSIT' | 'WITHDRAWAL';
  amountMinor: number;
  account: AccountEntity;
  /** Already withdrawn today, needed by the daily-limit handler. */
  withdrawnTodayMinor: number;
}

export abstract class ValidationHandler {
  private next?: ValidationHandler;

  /** Returns the handler passed in so calls can be chained: a.setNext(b).setNext(c) */
  setNext(handler: ValidationHandler): ValidationHandler {
    this.next = handler;
    return handler;
  }
}
