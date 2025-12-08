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

export class FlatRateStrategy implements InterestStrategy {
  readonly name = 'flat';
  monthlyInterestMinor(balanceMinor: number, annualRatePercent: number): number {
    return Math.floor((balanceMinor * annualRatePercent) / 100 / 12);
  }
}

/** Balance above 1,000,000 PKR earns +1.5% on the portion above the slab. */
export class TieredRateStrategy implements InterestStrategy {
  readonly name = 'tiered';
  private static readonly SLAB_MINOR = 100_000_000;
  private static readonly BONUS_PERCENT = 1.5;

  monthlyInterestMinor(balanceMinor: number, annualRatePercent: number): number {
    const base = Math.min(balanceMinor, TieredRateStrategy.SLAB_MINOR);
    const above = Math.max(0, balanceMinor - TieredRateStrategy.SLAB_MINOR);
    const yearly = base * annualRatePercent + above * (annualRatePercent + TieredRateStrategy.BONUS_PERCENT);
    return Math.floor(yearly / 100 / 12);
  }
}
