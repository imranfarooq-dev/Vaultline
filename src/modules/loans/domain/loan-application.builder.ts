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
