import { AccountEntity, AccountType } from '../../../database/entities';
import { InterestCalculator } from './interest.strategy';

/**
 * ============================================================================
 * PATTERN: VISITOR (Behavioral)
 * ============================================================================
 * Problem : At month end we need MANY reports over the same accounts:
 *           maintenance fees, withholding tax, risk exposure... and next month
 *           compliance will ask for another one. Adding a method to every
 *           account class for each new report bloats them.
 * Solution: Account classes get ONE generic method, accept(visitor).
 *           Each report is a separate VISITOR with one method per account type.
 *           New report = new visitor; the account classes never change.
 *           ("double dispatch": the account picks visitSavings/visitCurrent...)
 *
 * Analogy : A tax inspector visits a shop, a factory and a house and applies
 *           a different rule at each, without the buildings being rebuilt.
 *
 * Trade-off: adding a new ACCOUNT TYPE means touching every visitor. Visitor
 *            fits when types are stable but operations keep growing.
 * ============================================================================
 */
export interface AccountVisitor<R> {
  visitSavings(account: SavingsElement): R;
  visitCurrent(account: CurrentElement): R;
  visitFixedDeposit(account: FixedDepositElement): R;
}

export abstract class AccountElement {
  constructor(readonly data: AccountEntity) {}
  abstract accept<R>(visitor: AccountVisitor<R>): R;
}

export class SavingsElement extends AccountElement {
  accept<R>(visitor: AccountVisitor<R>): R { return visitor.visitSavings(this); }
}
export class CurrentElement extends AccountElement {
  accept<R>(visitor: AccountVisitor<R>): R { return visitor.visitCurrent(this); }
}
export class FixedDepositElement extends AccountElement {
  accept<R>(visitor: AccountVisitor<R>): R { return visitor.visitFixedDeposit(this); }
}
