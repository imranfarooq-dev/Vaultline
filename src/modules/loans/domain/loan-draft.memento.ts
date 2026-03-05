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

/** ORIGINATOR */
export class LoanDraft {
  readonly id = randomUUID();
  private fields: LoanDraftFields;

  constructor(initial: LoanDraftFields = {}) {
    this.fields = { ...initial };
  }

  update(changes: LoanDraftFields): void {
    this.fields = { ...this.fields, ...changes };
  }

  save(): LoanDraftMemento {
    return new LoanDraftMemento({ ...this.fields });
  }

  restore(memento: LoanDraftMemento): void {
    this.fields = { ...memento.getState() };
  }

  get values(): Readonly<LoanDraftFields> {
    return { ...this.fields };
  }
}

/** CARETAKER: keeps an undo stack per draft. In memory to keep the example focused. */
export class LoanDraftCaretaker {
  private readonly drafts = new Map<string, { draft: LoanDraft; history: LoanDraftMemento[] }>();

  create(initial: LoanDraftFields): LoanDraft {
    const draft = new LoanDraft(initial);
    this.drafts.set(draft.id, { draft, history: [] });
    return draft;
  }

  /** Snapshot BEFORE changing, so undo returns to the previous version. */
  change(id: string, changes: LoanDraftFields): LoanDraft {
    const entry = this.entry(id);
    entry.history.push(entry.draft.save());
    entry.draft.update(changes);
    return entry.draft;
  }

  undo(id: string): LoanDraft {
    const entry = this.entry(id);
    const previous = entry.history.pop();
    if (!previous) throw new BusinessRuleError('Nothing to undo');
    entry.draft.restore(previous);
    return entry.draft;
  }

  get(id: string): { draft: LoanDraft; undoSteps: number } {
    const entry = this.entry(id);
    return { draft: entry.draft, undoSteps: entry.history.length };
  }
}
