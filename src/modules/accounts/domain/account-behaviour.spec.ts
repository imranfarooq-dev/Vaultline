import { InvalidStateTransitionError } from '../../../common/errors/domain.errors';
import { AccountStatus, AccountType } from '../../../database/entities';
import { anAccount } from '../../../../test/support/factories';
import { stateOf } from './account-state';
import { MaintenanceFeeVisitor, RiskExposureVisitor, toElement, WithholdingTaxVisitor } from './account.visitor';
import { CompoundMonthlyStrategy, FlatRateStrategy, InterestCalculator, NoInterestStrategy, TieredRateStrategy } from './interest.strategy';
import { AccountLeaf, PortfolioGroup } from './portfolio.composite';

describe('State: account lifecycle', () => {
  it('follows PENDING -> ACTIVE -> FROZEN -> ACTIVE -> CLOSED', () => {
    let state = stateOf(AccountStatus.PENDING);
    state = state.activate();
    expect(state.status).toBe(AccountStatus.ACTIVE);
    state = state.freeze();
    expect(state.status).toBe(AccountStatus.FROZEN);
    state = state.unfreeze();
    state = state.close(0);
    expect(state.status).toBe(AccountStatus.CLOSED);
  });

  it.each([
    [AccountStatus.PENDING, true, false],
    [AccountStatus.ACTIVE, true, true],
    [AccountStatus.FROZEN, true, false],
    [AccountStatus.CLOSED, false, false],
  ])('%s: canDeposit=%s canWithdraw=%s', (status, deposit, withdraw) => {
    const state = stateOf(status);
    expect(state.canDeposit()).toBe(deposit);
    expect(state.canWithdraw()).toBe(withdraw);
  });

  it('rejects illegal transitions', () => {
    expect(() => stateOf(AccountStatus.CLOSED).activate()).toThrow(InvalidStateTransitionError);
    expect(() => stateOf(AccountStatus.PENDING).freeze()).toThrow('Cannot freeze an account that is PENDING');
  });

  it('cannot close an account that still holds money', () => {
    expect(() => stateOf(AccountStatus.ACTIVE).close(1)).toThrow('Withdraw the remaining balance');
  });
});

describe('Strategy: interest calculation', () => {
  it('no interest for current accounts', () => {
    expect(new NoInterestStrategy().monthlyInterestMinor()).toBe(0);
  });

  it('flat rate: 12% on Rs 10,000 = Rs 100 per month', () => {
    expect(new FlatRateStrategy().monthlyInterestMinor(1_000_000, 12)).toBe(10_000);
  });

  it('tiered: portion above Rs 1,000,000 earns +1.5%', () => {
    const tiered = new TieredRateStrategy();
    expect(tiered.monthlyInterestMinor(100_000_000, 12)).toBe(1_000_000);
    // extra Rs 1,000,000 at 13.5% => +1,125,000 minor
    expect(tiered.monthlyInterestMinor(200_000_000, 12)).toBe(2_125_000);
  });

  it('compound monthly equals flat for a single month', () => {
    expect(new CompoundMonthlyStrategy().monthlyInterestMinor(1_200_000, 12)).toBe(12_000);
  });

  it('the calculator selects a strategy by account type', () => {
    const calc = new InterestCalculator();
    expect(calc.strategyFor(AccountType.CURRENT).name).toBe('none');
    expect(calc.strategyFor(AccountType.SAVINGS).name).toBe('tiered');
    expect(calc.strategyFor(AccountType.FIXED_DEPOSIT).name).toBe('compound-monthly');
  });
});

describe('Visitor: month-end reports', () => {
  const smallSavings = toElement(anAccount({ type: AccountType.SAVINGS, balanceMinor: 500_000, annualInterestRate: 12 }));
  const bigSavings = toElement(anAccount({ type: AccountType.SAVINGS, balanceMinor: 900_000_000, annualInterestRate: 12 }));
  const current = toElement(anAccount({ type: AccountType.CURRENT, dailyWithdrawalLimitMinor: 100_000_000 }));
  const fd = toElement(anAccount({ type: AccountType.FIXED_DEPOSIT, balanceMinor: 1_200_000, annualInterestRate: 12 }));

  it('double dispatch: each account type gets its own fee rule', () => {
    const fee = new MaintenanceFeeVisitor();
    expect([smallSavings, bigSavings, current, fd].map((a) => a.accept(fee))).toEqual([15_000, 0, 50_000, 0]);
  });

  it('withholding tax: 15% savings, 20% FD, 0% current', () => {
    const tax = new WithholdingTaxVisitor();
    expect(smallSavings.accept(tax)).toBe(750); // 5000 interest * 15%
    expect(fd.accept(tax)).toBe(2_400); // 12000 interest * 20%
    expect(current.accept(tax)).toBe(0);
  });

  it('risk exposure labels', () => {
    const risk = new RiskExposureVisitor();
    expect([smallSavings, bigSavings, current, fd].map((a) => a.accept(risk))).toEqual(['LOW', 'MEDIUM', 'HIGH', 'LOW']);
  });
});
