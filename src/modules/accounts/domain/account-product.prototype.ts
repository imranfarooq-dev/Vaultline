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
}
