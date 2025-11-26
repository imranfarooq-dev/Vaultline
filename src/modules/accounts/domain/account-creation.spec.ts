import { BusinessRuleError } from '../../../common/errors/domain.errors';
import { AccountStatus, AccountType } from '../../../database/entities';
import { AccountProductCatalog } from './account-product.prototype';
import { accountCreatorFor, CurrentAccountCreator, FixedDepositCreator, SavingsAccountCreator } from './account.factory';

describe('Factory Method: account creators', () => {
  const input = { ownerName: '  Sana  ', currency: 'pkr', initialDepositMinor: 10_000_000 };

  it.each([
    [AccountType.SAVINGS, SavingsAccountCreator],
    [AccountType.CURRENT, CurrentAccountCreator],
    [AccountType.FIXED_DEPOSIT, FixedDepositCreator],
  ])('picks the right creator for %s', (type, creatorClass) => {
    expect(accountCreatorFor(type)).toBeInstanceOf(creatorClass);
  });
});
