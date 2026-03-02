import { BusinessRuleError } from '../../../common/errors/domain.errors';

/**
 * ============================================================================
 * PATTERN: BUILDER (Creational)
 * ============================================================================
 * Problem : A loan application has many fields, some required, some optional
 *           (collateral, co-applicant), with rules that involve several fields
 *           together. A constructor like
 *              new LoanApplication('Ali', 'acc', 500000, 24, 'car', 90000, null, null)
 *           is unreadable and easy to get wrong.
 * Solution: A BUILDER collects the parts step by step with readable methods
 *           and validates everything once in build(), returning an immutable,
 *           always-valid object.
 *
 * Analogy : Ordering a custom shawarma: bread, then filling, then sauces,
 *           then "done" - and only then is it wrapped.
 * ============================================================================
 */
export interface Collateral {
  description: string;
  valueMinor: number;
}

export class LoanApplication {
  constructor(
    readonly applicantName: string,
    readonly accountId: string,
    readonly amountMinor: number,
    readonly termMonths: number,
    readonly purpose: string,
    readonly monthlyIncomeMinor: number,
    readonly collateral?: Collateral,
    readonly coApplicantName?: string,
  ) {
    Object.freeze(this);
  }
}

export class LoanApplicationBuilder {
  private applicantName?: string;
  private accountId?: string;
  private amountMinor?: number;
  private termMonths = 12;
  private purpose = 'personal';
  private monthlyIncomeMinor?: number;
  private collateral?: Collateral;
  private coApplicantName?: string;

  forApplicant(name: string): this { this.applicantName = name.trim(); return this; }
  disbursedTo(accountId: string): this { this.accountId = accountId; return this; }
  borrowing(amountMinor: number): this { this.amountMinor = amountMinor; return this; }
  overMonths(termMonths: number): this { this.termMonths = termMonths; return this; }
  for(purpose: string): this { this.purpose = purpose; return this; }
  earningMonthly(incomeMinor: number): this { this.monthlyIncomeMinor = incomeMinor; return this; }
  securedBy(description: string, valueMinor: number): this { this.collateral = { description, valueMinor }; return this; }
  withCoApplicant(name: string): this { this.coApplicantName = name; return this; }

  build(): LoanApplication {
    const errors: string[] = [];
    if (!this.applicantName) errors.push('applicant name is required');
    if (!this.accountId) errors.push('disbursement account is required');
    if (!this.amountMinor || this.amountMinor <= 0) errors.push('amount must be positive');
    if (!this.monthlyIncomeMinor || this.monthlyIncomeMinor <= 0) errors.push('monthly income is required');
    if (this.termMonths < 3 || this.termMonths > 84) errors.push('term must be between 3 and 84 months');

    // Rule across several fields: large loans need collateral worth at least half the amount.
    const LARGE_LOAN_MINOR = 200_000_000; // Rs 2,000,000
    if ((this.amountMinor ?? 0) > LARGE_LOAN_MINOR && (!this.collateral || this.collateral.valueMinor < (this.amountMinor ?? 0) / 2)) {
      errors.push('loans above Rs 2,000,000 need collateral worth at least 50% of the amount');
    }

    if (errors.length) throw new BusinessRuleError(`Invalid loan application: ${errors.join('; ')}`, { errors });

    return new LoanApplication(this.applicantName!, this.accountId!, this.amountMinor!, this.termMonths, this.purpose, this.monthlyIncomeMinor!, this.collateral, this.coApplicantName);
  }
}
