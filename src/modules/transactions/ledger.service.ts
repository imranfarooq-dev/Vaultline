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
