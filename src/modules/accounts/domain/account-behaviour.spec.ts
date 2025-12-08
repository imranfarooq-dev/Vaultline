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
});
