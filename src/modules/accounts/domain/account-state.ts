import { InvalidStateTransitionError } from '../../../common/errors/domain.errors';
import { AccountStatus } from '../../../database/entities';

/**
 * ============================================================================
 * PATTERN: STATE (Behavioral)
 * ============================================================================
 * Problem : What an account may do depends on its status. A frozen account can
 *           receive deposits but not withdrawals; a closed one can do nothing.
 *           Without the pattern, every method is full of
 *           `if (status === 'FROZEN') ... else if (status === 'CLOSED') ...`.
 * Solution: Each status becomes a class that knows its own rules and which
 *           transitions are legal. The account simply asks its current state.
 *
 * Analogy : A phone's power button: when locked it wakes the screen, when
 *           unlocked it locks, during a call it mutes. Same button, behaviour
 *           depends on state.
 *
 *    PENDING --activate--> ACTIVE <--unfreeze-- FROZEN
 *                            |  --freeze------->  |
 *                            +--close--> CLOSED <-+ (close)
 * ============================================================================
 */
export abstract class AccountState {
  abstract readonly status: AccountStatus;

  canDeposit(): boolean { return false; }
  canWithdraw(): boolean { return false; }

  activate(): AccountState { return this.illegal('activate'); }
  freeze(): AccountState { return this.illegal('freeze'); }
  unfreeze(): AccountState { return this.illegal('unfreeze'); }
  close(_balanceMinor: number): AccountState { return this.illegal('close'); }

  protected illegal(action: string): never {
    throw new InvalidStateTransitionError(`Cannot ${action} an account that is ${this.status}`);
  }
}
