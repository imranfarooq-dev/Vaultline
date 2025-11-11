import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { bigintTransformer } from '../../common/utils/bigint.transformer';

export enum LedgerEntryType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  FEE = 'FEE',
  INTEREST = 'INTEREST',
  REVERSAL = 'REVERSAL',
}

/**
 * An immutable line in the ledger. Balances are never edited silently:
 * every change is a new entry, and a mistake is fixed with a REVERSAL entry.
 */
@Entity('ledger_entries')
@Index(['accountId', 'createdAt', 'id'])
export class LedgerEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @Column({ type: 'varchar', length: 20 })
  type: LedgerEntryType;

  /** Positive for credits, negative for debits. */
  @Column({ name: 'amount_minor', type: 'bigint', transformer: bigintTransformer })
  amountMinor: number;
}
