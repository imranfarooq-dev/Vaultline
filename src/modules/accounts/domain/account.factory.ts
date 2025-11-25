import { BusinessRuleError } from '../../../common/errors/domain.errors';
import { AccountStatus, AccountType } from '../../../database/entities';
import { AccountProduct } from './account-product.prototype';

/**
 * ============================================================================
 * PATTERN: FACTORY METHOD (Creational)
 * ============================================================================
 * Problem : Opening a Savings, Current or Fixed Deposit account follows the
 *           same overall steps, but each type has different defaults and rules.
 *           A giant `if (type === ...)` in the service would grow forever.
 * Solution: The base class defines the overall algorithm `open()` and delegates
 *           the part that varies to an abstract FACTORY METHOD,
 *           `createBlueprint()`. Each subclass decides what gets created.
 *
 * Analogy : A logistics company says "deliver this". The road branch creates
 *           a truck, the sea branch creates a ship. Same order, different vehicle.
 * ============================================================================
 */
export interface OpenAccountInput {
  ownerName: string;
  currency: string;
  initialDepositMinor: number;
  product?: AccountProduct;
}
