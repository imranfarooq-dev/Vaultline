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
});
