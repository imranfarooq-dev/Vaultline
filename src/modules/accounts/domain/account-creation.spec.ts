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

  it('each subclass builds its own defaults through the shared open() algorithm', () => {
    const savings = accountCreatorFor(AccountType.SAVINGS).open(input);
    const current = accountCreatorFor(AccountType.CURRENT).open(input);
    const fd = accountCreatorFor(AccountType.FIXED_DEPOSIT).open(input);

    expect(savings).toMatchObject({ type: AccountType.SAVINGS, annualInterestRate: 8.5, ownerName: 'Sana', currency: 'PKR', status: AccountStatus.PENDING });
    expect(current.annualInterestRate).toBe(0);
    expect(fd.dailyWithdrawalLimitMinor).toBe(0);
  });

  it('enforces the minimum opening balance of the chosen type', () => {
    expect(() => accountCreatorFor(AccountType.FIXED_DEPOSIT).open({ ...input, initialDepositMinor: 1 })).toThrow(BusinessRuleError);
  });

  it('applies product settings from a cloned prototype', () => {
    const product = new AccountProductCatalog().get('STUDENT_SAVER')!;
    const blueprint = accountCreatorFor(AccountType.SAVINGS).open({ ...input, initialDepositMinor: 0, product });
    expect(blueprint).toMatchObject({ productCode: 'STUDENT_SAVER', dailyWithdrawalLimitMinor: 2_000_000, minimumOpeningBalanceMinor: 0 });
  });

  it('refuses a product that belongs to another account type', () => {
    const product = new AccountProductCatalog().get('BUSINESS_CURRENT')!;
    expect(() => accountCreatorFor(AccountType.SAVINGS).open({ ...input, product })).toThrow('is not a SAVINGS product');
  });
});
