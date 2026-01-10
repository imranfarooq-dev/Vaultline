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
});
