import { AccountEntity } from './account.entity';
import { LedgerEntryEntity } from './ledger-entry.entity';
import { LoanApplicationEntity } from './loan-application.entity';
import { NotificationEntity } from './notification.entity';

export * from './account.entity';
export * from './ledger-entry.entity';
export * from './loan-application.entity';
export * from './notification.entity';

export const ALL_ENTITIES = [AccountEntity, LedgerEntryEntity, LoanApplicationEntity, NotificationEntity];
