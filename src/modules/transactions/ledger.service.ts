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
}
