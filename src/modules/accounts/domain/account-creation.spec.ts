import { BusinessRuleError } from '../../../common/errors/domain.errors';
import { AccountStatus, AccountType } from '../../../database/entities';
import { AccountProductCatalog } from './account-product.prototype';
import { accountCreatorFor, CurrentAccountCreator, FixedDepositCreator, SavingsAccountCreator } from './account.factory';

describe('Factory Method: account creators', () => {
  const input = { ownerName: '  Sana  ', currency: 'pkr', initialDepositMinor: 10_000_000 };
});
