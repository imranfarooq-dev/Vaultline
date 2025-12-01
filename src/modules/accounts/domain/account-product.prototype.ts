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

  constructor() {
    const basicSaver = new AccountProduct('BASIC_SAVER', 'Basic Saver', AccountType.SAVINGS, 5_000_000, 8.5, 100_000, {
      chequeBook: false,
      debitCard: true,
      internationalTransfers: false,
      perks: ['Free SMS alerts'],
    });

    const studentSaver = basicSaver.clone({
      code: 'STUDENT_SAVER',
      displayName: 'Student Saver',
      dailyWithdrawalLimitMinor: 2_000_000,
      minimumOpeningBalanceMinor: 0,
    });
    studentSaver.features.perks.push('No minimum balance');

    const freelancerSaver = basicSaver.clone({
      code: 'FREELANCER_SAVER',
      displayName: 'Freelancer Saver',
      dailyWithdrawalLimitMinor: 20_000_000,
      annualInterestRate: 9.25,
      features: { internationalTransfers: true },
    });
    freelancerSaver.features.perks.push('Foreign remittance tracking');

    const businessCurrent = new AccountProduct('BUSINESS_CURRENT', 'Business Current', AccountType.CURRENT, 100_000_000, 0, 2_500_000, {
      chequeBook: true,
      debitCard: true,
      internationalTransfers: true,
      perks: ['Unlimited transactions'],
    });

    const termDeposit = new AccountProduct('TERM_DEPOSIT_1Y', '1-Year Term Deposit', AccountType.FIXED_DEPOSIT, 0, 12, 5_000_000, {
      chequeBook: false,
      debitCard: false,
      internationalTransfers: false,
      perks: ['Fixed profit for 12 months'],
    });

    [basicSaver, studentSaver, freelancerSaver, businessCurrent, termDeposit].forEach((p) => this.prototypes.set(p.code, p));
  }

  /** Always hand out a clone so callers can never modify the stored prototype. */
  get(code: string): AccountProduct | undefined {
    return this.prototypes.get(code)?.clone();
  }

  list(): AccountProduct[] {
    return [...this.prototypes.values()].map((p) => p.clone());
  }
}
