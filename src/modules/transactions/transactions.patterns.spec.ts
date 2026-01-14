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

  it('each layer adds its behaviour and records itself in the pipeline', async () => {
    const core = fakeCore();
    const service = new AuditTimingDecorator(new FraudScreeningDecorator(new TransferFeeDecorator(core, 500), engine([])));
    const result = await service.transfer(request);
    expect(result.pipeline).toEqual(['audit', 'fraud-screening', 'fee', 'core']);
    expect(core.received[0].feeMinor).toBe(500);
  });

  it('branch channel costs an extra Rs 100', async () => {
    const core = fakeCore();
    await new TransferFeeDecorator(core, 500).transfer({ ...request, channel: 'branch' });
    expect(core.received[0].feeMinor).toBe(10_500);
  });

  it('fraud layer blocks before the inner layers are ever called', async () => {
    const core = fakeCore();
    const service = new FraudScreeningDecorator(new TransferFeeDecorator(core, 0), engine(['amount > 500']));
    await expect(service.transfer(request)).rejects.toBeInstanceOf(FraudSuspectedError);
    expect(core.received).toHaveLength(0);
  });

  it('layers are removable: the core works alone', async () => {
    const ledger = { transfer: jest.fn().mockResolvedValue({ reference: 'R', feeMinor: 0, fromBalanceAfterMinor: 1, toBalanceAfterMinor: 2 }) };
    const result = await new LedgerTransferService(ledger as unknown as LedgerService).transfer(request);
    expect(result.pipeline).toEqual(['ledger']);
    expect(ledger.transfer).toHaveBeenCalledWith(expect.objectContaining({ feeMinor: 0 }));
  });
});

describe('Command: invoker with history and undo', () => {
  const ledgerMock = () => ({
    deposit: jest.fn().mockResolvedValue({ reference: 'DEP-1', accountId: 'a', amountMinor: 10, balanceAfterMinor: 10 }),
    reverse: jest.fn().mockResolvedValue({ reference: 'REV-1', reversedEntries: 1 }),
  });

  it('executes a command and remembers it', async () => {
    const ledger = ledgerMock();
    const invoker = new CommandInvoker();
    const result = await invoker.run(new DepositCommand(ledger as unknown as LedgerService, 'a', 10));
    expect(result).toMatchObject({ reference: 'DEP-1', commandId: expect.any(String) });
    expect(invoker.list()[0]).toMatchObject({ name: 'deposit', status: 'EXECUTED', reference: 'DEP-1' });
  });

  it('undo delegates to the command, which reverses by reference', async () => {
    const ledger = ledgerMock();
    const invoker = new CommandInvoker();
    const { commandId } = await invoker.run(new DepositCommand(ledger as unknown as LedgerService, 'a', 10));
    await invoker.undo(commandId);
    expect(ledger.reverse).toHaveBeenCalledWith('DEP-1');
    expect(invoker.list()[0].status).toBe('UNDONE');
    await expect(invoker.undo(commandId)).rejects.toThrow('cannot be undone');
  });

  it('records failures and does not allow undoing them', async () => {
    const transfers = { transfer: jest.fn().mockRejectedValue(new Error('boom')) };
    const invoker = new CommandInvoker();
    await expect(invoker.run(new TransferCommand(transfers, {} as LedgerService, { fromAccountId: 'a', toAccountId: 'b', amountMinor: 1, channel: 'web' }))).rejects.toThrow('boom');
    const [record] = invoker.list();
    expect(record).toMatchObject({ status: 'FAILED', error: 'boom' });
    await expect(invoker.undo(record.commandId)).rejects.toThrow('FAILED');
  });
});
