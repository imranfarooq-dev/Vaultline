import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, MoreThanOrEqual } from 'typeorm';
import { BusinessRuleError, NotFoundError } from '../../common/errors/domain.errors';
import { AccountEntity, LedgerEntryEntity, LedgerEntryType } from '../../database/entities';
import { ReferenceNumberGenerator } from '../core/reference-number.singleton';
import { DomainEventBus } from '../messaging/domain-event-bus.observer';
import { createEvent, DomainEvent, EventTypes } from '../messaging/domain-events';
import { buildTransactionValidationChain } from './validation/transaction-validation.chain';

export interface PostingOptions {
  description?: string;
  type?: LedgerEntryType;
}

export interface PostingResult {
  reference: string;
  accountId: string;
  amountMinor: number;
  balanceAfterMinor: number;
}

export interface LedgerTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amountMinor: number;
  feeMinor: number;
  description?: string;
}

export interface LedgerTransferResult {
  reference: string;
  feeMinor: number;
  fromBalanceAfterMinor: number;
  toBalanceAfterMinor: number;
}

const REVERSAL_PREFIX = 'REVERSAL_OF:';

/**
 * The only place that changes balances.
 *
 * Every operation:
 *   1. opens a DB transaction
 *   2. locks the account rows (SELECT ... FOR UPDATE) so two requests cannot
 *      spend the same money at the same time
 *   3. runs the validation chain
 *   4. writes balance + ledger entries
 *   5. commits, and only THEN publishes events
 *
 * Production note: publishing after commit can lose an event if the process
 * crashes between steps 4 and 5. The "transactional outbox" pattern fixes that
 * (see docs/ARCHITECTURE.md).
 */
@Injectable()
export class LedgerService {
  private readonly validationChain = buildTransactionValidationChain();

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly references: ReferenceNumberGenerator,
    private readonly events: DomainEventBus,
  ) {}

  async deposit(accountId: string, amountMinor: number, options: PostingOptions = {}): Promise<PostingResult> {
    const result = await this.dataSource.transaction(async (manager) => {
      const account = await this.lockAccount(manager, accountId);
      this.validationChain.validate({ operation: 'DEPOSIT', amountMinor, account, withdrawnTodayMinor: 0 });
      return this.post(manager, account, amountMinor, options.type ?? LedgerEntryType.DEPOSIT, this.references.next('DEP'), options.description);
    });
    await this.emit(createEvent(EventTypes.MONEY_DEPOSITED, { ...result }));
    return result;
  }

  async withdraw(accountId: string, amountMinor: number, options: PostingOptions = {}): Promise<PostingResult> {
    const result = await this.dataSource.transaction(async (manager) => {
      const account = await this.lockAccount(manager, accountId);
      const withdrawnTodayMinor = await this.withdrawnToday(manager, accountId);
      this.validationChain.validate({ operation: 'WITHDRAWAL', amountMinor, account, withdrawnTodayMinor });
      return this.post(manager, account, -amountMinor, options.type ?? LedgerEntryType.WITHDRAWAL, this.references.next('WDL'), options.description);
    });
    await this.emit(createEvent(EventTypes.MONEY_WITHDRAWN, { ...result, amountMinor }));
    return result;
  }

  async transfer(input: LedgerTransferInput): Promise<LedgerTransferResult> {
    if (input.fromAccountId === input.toAccountId) throw new BusinessRuleError('Cannot transfer to the same account');

    const reference = this.references.next('TRF');
    const result = await this.dataSource.transaction(async (manager) => {
      // Always lock in the same (sorted) order to avoid deadlocks between opposite transfers.
      const [firstId, secondId] = [input.fromAccountId, input.toAccountId].sort();
      const first = await this.lockAccount(manager, firstId);
      const second = await this.lockAccount(manager, secondId);
      const from = first.id === input.fromAccountId ? first : second;
      const to = first.id === input.toAccountId ? first : second;

      if (from.currency !== to.currency) throw new BusinessRuleError('Cross-currency transfers must go through FX conversion');

      const totalDebit = input.amountMinor + input.feeMinor;
      const withdrawnTodayMinor = await this.withdrawnToday(manager, from.id);
      this.validationChain.validate({ operation: 'WITHDRAWAL', amountMinor: totalDebit, account: from, withdrawnTodayMinor });
      this.validationChain.validate({ operation: 'DEPOSIT', amountMinor: input.amountMinor, account: to, withdrawnTodayMinor: 0 });

      const description = input.description ?? `Transfer ${from.accountNumber} -> ${to.accountNumber}`;
      await this.post(manager, from, -input.amountMinor, LedgerEntryType.TRANSFER_OUT, reference, description);
      if (input.feeMinor > 0) await this.post(manager, from, -input.feeMinor, LedgerEntryType.FEE, reference, 'Transfer fee');
      const credit = await this.post(manager, to, input.amountMinor, LedgerEntryType.TRANSFER_IN, reference, description);

      return { reference, feeMinor: input.feeMinor, fromBalanceAfterMinor: from.balanceMinor, toBalanceAfterMinor: credit.balanceAfterMinor };
    });

    await this.emit(
      createEvent(EventTypes.MONEY_TRANSFERRED, {
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        amountMinor: input.amountMinor,
        feeMinor: input.feeMinor,
        reference,
      }),
    );
    return result;
  }

  /** Undo by writing opposite entries (never by deleting history). */
  async reverse(originalReference: string): Promise<{ reference: string; reversedEntries: number }> {
    const reversalReference = this.references.next('REV');
    const reversed = await this.dataSource.transaction(async (manager) => {
      const alreadyReversed = await manager.exists(LedgerEntryEntity, { where: { description: `${REVERSAL_PREFIX}${originalReference}` } });
      if (alreadyReversed) throw new BusinessRuleError(`Transaction ${originalReference} was already reversed`);

      const entries = await manager.find(LedgerEntryEntity, { where: { reference: originalReference }, order: { createdAt: 'ASC' } });
      if (entries.length === 0) throw new NotFoundError(`No transaction with reference ${originalReference}`);

      const accountIds = [...new Set(entries.map((e) => e.accountId))].sort();
      const accounts = new Map<string, AccountEntity>();
      for (const id of accountIds) accounts.set(id, await this.lockAccount(manager, id));

      for (const entry of entries) {
        const account = accounts.get(entry.accountId)!;
        if (account.balanceMinor - entry.amountMinor < 0) {
          throw new BusinessRuleError(`Cannot reverse: account ${account.accountNumber} no longer has enough balance`);
        }
        await this.post(manager, account, -entry.amountMinor, LedgerEntryType.REVERSAL, reversalReference, `${REVERSAL_PREFIX}${originalReference}`);
      }
      return entries;
    });

    for (const entry of reversed) {
      await this.emit(
        createEvent(EventTypes.TRANSACTION_REVERSED, {
          accountId: entry.accountId,
          originalReference,
          reference: reversalReference,
          amountMinor: -entry.amountMinor,
        }),
      );
    }
    return { reference: reversalReference, reversedEntries: reversed.length };
  }

  private async lockAccount(manager: EntityManager, accountId: string): Promise<AccountEntity> {
    const account = await manager.findOne(AccountEntity, { where: { id: accountId }, lock: { mode: 'pessimistic_write' } });
    if (!account) throw new NotFoundError(`Account ${accountId} not found`);
    return account;
  }
}
