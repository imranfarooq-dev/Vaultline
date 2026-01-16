import { AccountEntity, AccountStatus, AccountType, LedgerEntryEntity, LedgerEntryType } from '../../src/database/entities';

/** Test data builders: every test states only the fields it cares about. */
export const anAccount = (overrides: Partial<AccountEntity> = {}): AccountEntity =>
  Object.assign(new AccountEntity(), {
    id: '11111111-1111-4111-8111-111111111111',
    accountNumber: 'PK00NBPT0000000000000001',
    ownerName: 'Test Customer',
    type: AccountType.SAVINGS,
    currency: 'PKR',
    productCode: null,
    balanceMinor: 1_000_000,
    dailyWithdrawalLimitMinor: 5_000_000,
    annualInterestRate: 12,
    status: AccountStatus.ACTIVE,
    version: 1,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

export const anEntry = (i: number, overrides: Partial<LedgerEntryEntity> = {}): LedgerEntryEntity =>
  Object.assign(new LedgerEntryEntity(), {
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    accountId: '11111111-1111-4111-8111-111111111111',
    type: LedgerEntryType.DEPOSIT,
    amountMinor: 1000,
    balanceAfterMinor: 1000 * i,
    reference: `REF-${i}`,
    description: `entry ${i}`,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)),
    ...overrides,
  });
