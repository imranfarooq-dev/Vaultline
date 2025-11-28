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

/** A not-yet-saved account: everything needed to insert the row. */
export interface AccountBlueprint {
  ownerName: string;
  type: AccountType;
  currency: string;
  productCode: string | null;
  dailyWithdrawalLimitMinor: number;
  annualInterestRate: number;
  minimumOpeningBalanceMinor: number;
  status: AccountStatus;
}

export abstract class AccountCreator {
  /** THE factory method. Subclasses decide what exactly gets built. */
  protected abstract createBlueprint(input: OpenAccountInput): AccountBlueprint;

  /** Shared algorithm that USES the factory method. */
  open(input: OpenAccountInput): AccountBlueprint {
    const blueprint = this.createBlueprint(input);

    // Product settings (cloned prototype) override the type defaults.
    if (input.product) {
      if (input.product.accountType !== blueprint.type) {
        throw new BusinessRuleError(`Product ${input.product.code} is not a ${blueprint.type} product`);
      }
      Object.assign(blueprint, {
        productCode: input.product.code,
        dailyWithdrawalLimitMinor: input.product.dailyWithdrawalLimitMinor,
        annualInterestRate: input.product.annualInterestRate,
        minimumOpeningBalanceMinor: input.product.minimumOpeningBalanceMinor,
      });
    }

    if (input.initialDepositMinor < blueprint.minimumOpeningBalanceMinor) {
      throw new BusinessRuleError(`Minimum opening balance is ${blueprint.minimumOpeningBalanceMinor} minor units`, {
        required: blueprint.minimumOpeningBalanceMinor,
      });
    }
    return blueprint;
  }

  protected base(input: OpenAccountInput, type: AccountType) {
    return { ownerName: input.ownerName.trim(), currency: input.currency.toUpperCase(), type, productCode: null, status: AccountStatus.PENDING };
  }
}
