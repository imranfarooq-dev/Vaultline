import { BusinessRuleError, FraudSuspectedError, InvalidStateTransitionError } from '../../common/errors/domain.errors';
import { AccountStatus } from '../../database/entities';
import { anAccount, anEntry } from '../../../test/support/factories';
import { FraudRuleEngine } from '../fraud/fraud-rule.engine';
import { AppConfigService } from '../../config/app-config.service';
import { CommandInvoker, DepositCommand, TransferCommand } from './commands/bank.commands';
import { EntryFetcher, LedgerHistoryIterator } from './ledger-history.iterator';
import { LedgerService } from './ledger.service';
import {
  AuditTimingDecorator,
  FraudScreeningDecorator,
  LedgerTransferService,
  MoneyTransferService,
  TransferFeeDecorator,
  TransferRequest,
} from './transfer/money-transfer.decorators';
import {
  AccountStatusHandler,
  buildTransactionValidationChain,
  DailyLimitHandler,
  PositiveAmountHandler,
  SufficientFundsHandler,
  ValidationContext,
} from './validation/transaction-validation.chain';

describe('Chain of Responsibility: transaction validation', () => {
  const chain = buildTransactionValidationChain();
  const ctx = (overrides: Partial<ValidationContext> = {}): ValidationContext => ({
    operation: 'WITHDRAWAL',
    amountMinor: 1000,
    account: anAccount({ balanceMinor: 10_000, dailyWithdrawalLimitMinor: 5_000 }),
    withdrawnTodayMinor: 0,
    ...overrides,
  });

  it('lets a valid request pass through every handler', () => {
    expect(() => chain.validate(ctx())).not.toThrow();
  });

  it.each([
    ['PositiveAmount', { amountMinor: 0 }, 'positive whole number'],
    ['PositiveAmount (fractions)', { amountMinor: 10.5 }, 'positive whole number'],
    ['AccountStatus', { account: anAccount({ status: AccountStatus.FROZEN }) }, 'not allowed on a FROZEN account'],
    ['SufficientFunds', { amountMinor: 20_000, account: anAccount({ balanceMinor: 10_000, dailyWithdrawalLimitMinor: 50_000 }) }, 'Insufficient funds'],
    ['DailyLimit', { withdrawnTodayMinor: 4_500 }, 'Daily withdrawal limit exceeded'],
  ])('%s handler stops the request', (_name, overrides, message) => {
    expect(() => chain.validate(ctx(overrides as Partial<ValidationContext>))).toThrow(message);
  });

  it('stops at the FIRST failing handler (later handlers never run)', () => {
    const later = new DailyLimitHandler();
    const spy = jest.spyOn(later as unknown as { check: () => void }, 'check');
    const head = new PositiveAmountHandler();
    head.setNext(later);
    expect(() => head.validate(ctx({ amountMinor: -1 }))).toThrow(BusinessRuleError);
    expect(spy).not.toHaveBeenCalled();
  });

  it('deposits skip withdrawal-only checks', () => {
    const head = new AccountStatusHandler();
    head.setNext(new SufficientFundsHandler()).setNext(new DailyLimitHandler());
    expect(() => head.validate(ctx({ operation: 'DEPOSIT', amountMinor: 999_999, withdrawnTodayMinor: 999_999 }))).not.toThrow();
    expect(() => head.validate(ctx({ operation: 'DEPOSIT', account: anAccount({ status: AccountStatus.CLOSED }) }))).toThrow(InvalidStateTransitionError);
  });
});

describe('Decorator: layered transfer service', () => {
  const request: TransferRequest = { fromAccountId: 'a', toAccountId: 'b', amountMinor: 1000, channel: 'web' };
  const fakeCore = (): MoneyTransferService & { received: TransferRequest[] } => {
    const received: TransferRequest[] = [];
    return {
      received,
      async transfer(r) {
        received.push(r);
        return { reference: 'TRF-1', amountMinor: r.amountMinor, feeMinor: r.feeMinor ?? 0, fromBalanceAfterMinor: 0, toBalanceAfterMinor: 0, pipeline: ['core'] };
      },
    };
  };
  const engine = (rules: string[]) => new FraudRuleEngine({ fraudRules: rules } as AppConfigService);
});
