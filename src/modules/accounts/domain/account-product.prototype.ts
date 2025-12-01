import { AccountType } from '../../../database/entities';

/**
 * ============================================================================
 * PATTERN: PROTOTYPE (Creational)
 * ============================================================================
 * Problem : The bank sells many account "products" that differ only slightly
 *           (Student Saver, Freelancer Saver, Senior Citizen Saver...).
 *           Building each from scratch repeats the same 10 settings.
 * Solution: Keep a few fully-configured PROTOTYPE objects and create new
 *           products by CLONING one and changing only what differs.
 *
 * Analogy : Photocopying a completed form and editing just the name field.
 * ============================================================================
 */
export interface ProductFeatures {
  chequeBook: boolean;
  debitCard: boolean;
  internationalTransfers: boolean;
  perks: string[];
}

export class AccountProduct {
  constructor(
    public code: string,
    public displayName: string,
    public accountType: AccountType,
    public dailyWithdrawalLimitMinor: number,
    public annualInterestRate: number,
    public minimumOpeningBalanceMinor: number,
    public features: ProductFeatures,
  ) {}

  /**
   * DEEP clone: the nested `features` object (and its array) is copied too.
   * A shallow copy would share `features`, so editing the clone would silently
   * change the original prototype. That bug is exactly what the unit test checks.
   */
  clone(overrides: Partial<Omit<AccountProduct, 'clone' | 'features'>> & { features?: Partial<ProductFeatures> } = {}): AccountProduct {
    const { features, ...rest } = overrides;
    const copy = new AccountProduct(
      this.code,
      this.displayName,
      this.accountType,
      this.dailyWithdrawalLimitMinor,
      this.annualInterestRate,
      this.minimumOpeningBalanceMinor,
      { ...this.features, perks: [...this.features.perks], ...features },
    );
    return Object.assign(copy, rest);
  }
}

/** Registry of prototypes. New products are derived by cloning, not rebuilding. */
export class AccountProductCatalog {
  private readonly prototypes = new Map<string, AccountProduct>();
}
