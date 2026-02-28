import { randomUUID } from 'node:crypto';
import { BusinessRuleError, NotFoundError } from '../../../common/errors/domain.errors';

/**
 * ============================================================================
 * PATTERN: MEMENTO (Behavioral)
 * ============================================================================
 * Problem : Customers fill a loan form over several steps and sometimes want
 *           to go back ("undo my last change"). We need snapshots of the
 *           draft WITHOUT exposing its internals to whoever stores them.
 * Solution: Three roles:
 *            - ORIGINATOR (LoanDraft): creates and restores snapshots of itself
 *            - MEMENTO    (LoanDraftMemento): an opaque, immutable snapshot
 *            - CARETAKER  (LoanDraftCaretaker): stores snapshots, never reads them
 *
 * Analogy : Ctrl+Z in a text editor, or a save point in a video game.
 * ============================================================================
 */
export interface LoanDraftFields {
  applicantName?: string;
  accountId?: string;
  amountMinor?: number;
  termMonths?: number;
  purpose?: string;
  monthlyIncomeMinor?: number;
  collateralDescription?: string;
  collateralValueMinor?: number;
}

/** MEMENTO: frozen; only the originator knows what's inside. */
export class LoanDraftMemento {
  readonly takenAt = new Date().toISOString();
  constructor(private readonly state: Readonly<LoanDraftFields>) {
    Object.freeze(this.state);
  }
  /** Package-private in spirit: used only by LoanDraft.restore(). */
  getState(): Readonly<LoanDraftFields> {
    return this.state;
  }
}
