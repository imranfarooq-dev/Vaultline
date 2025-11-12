import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';
import { bigintTransformer } from '../../common/utils/bigint.transformer';

export enum AccountType {
  SAVINGS = 'SAVINGS',
  CURRENT = 'CURRENT',
  FIXED_DEPOSIT = 'FIXED_DEPOSIT',
}

export enum AccountStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  CLOSED = 'CLOSED',
}

@Entity('accounts')
export class AccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'account_number', length: 24 })
  accountNumber: string;

  @Index()
  @Column({ name: 'owner_name', length: 120 })
  ownerName: string;

  @Column({ type: 'varchar', length: 20 })
  type: AccountType;

  @Column({ length: 3 })
  currency: string;
}
