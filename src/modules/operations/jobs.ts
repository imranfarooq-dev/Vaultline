import { In, Repository } from 'typeorm';
import { AccountEntity, AccountStatus, AccountType, LedgerEntryEntity, LedgerEntryType } from '../../database/entities';
import { InterestCalculator } from '../accounts/domain/interest.strategy';
import { LedgerService } from '../transactions/ledger.service';
import { EndOfDayJob, JobReport } from './end-of-day.template-method';

/** Posts monthly profit to savings and term deposit accounts (uses STRATEGY inside). */
export class InterestPostingJob extends EndOfDayJob {
  readonly name = 'interest-posting';
  private readonly calculator = new InterestCalculator();
}
