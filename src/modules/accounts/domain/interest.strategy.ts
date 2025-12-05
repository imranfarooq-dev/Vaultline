import { AccountType } from '../../../database/entities';

/**
 * ============================================================================
 * PATTERN: STRATEGY (Behavioral)
 * ============================================================================
 * Problem : Interest is calculated differently per account type: none for
 *           current accounts, a flat rate for savings, tiered slabs for big
 *           balances, compound for term deposits. Hard-coding all of them in
 *           one method makes it huge and risky to change.
 * Solution: Put each algorithm in its own class behind one interface and pick
 *           the right one at runtime. Algorithms become swappable and testable
 *           in isolation.
 *
 * Analogy : Google Maps: same trip, choose "car", "walk" or "bike" strategy.
 * ============================================================================
 */
export interface InterestStrategy {
  readonly name: string;
  monthlyInterestMinor(balanceMinor: number, annualRatePercent: number): number;
}

export class NoInterestStrategy implements InterestStrategy {
  readonly name = 'none';
  monthlyInterestMinor(): number {
    return 0;
  }
}
