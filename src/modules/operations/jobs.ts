import { In, Repository } from 'typeorm';
import { AccountEntity, AccountStatus, AccountType, LedgerEntryEntity, LedgerEntryType } from '../../database/entities';
import { InterestCalculator } from '../accounts/domain/interest.strategy';
import { LedgerService } from '../transactions/ledger.service';
import { EndOfDayJob, JobReport } from './end-of-day.template-method';

/** Posts monthly profit to savings and term deposit accounts (uses STRATEGY inside). */
export class InterestPostingJob extends EndOfDayJob {
  readonly name = 'interest-posting';
  private readonly calculator = new InterestCalculator();

  constructor(private readonly accounts: Repository<AccountEntity>, private readonly ledger: LedgerService) {
    super();
  }

  protected loadAccounts() {
    return this.accounts.find({ where: { status: AccountStatus.ACTIVE, type: In([AccountType.SAVINGS, AccountType.FIXED_DEPOSIT]) } });
  }

  protected async processAccount(account: AccountEntity): Promise<string | null> {
    const { strategy, monthlyInterestMinor } = this.calculator.calculate(account.type, account.balanceMinor, account.annualInterestRate);
    if (monthlyInterestMinor <= 0) return null;
    const posting = await this.ledger.deposit(account.id, monthlyInterestMinor, { type: LedgerEntryType.INTEREST, description: `Monthly profit (${strategy})` });
    return `${account.accountNumber}: +${monthlyInterestMinor} (${strategy}) ref ${posting.reference}`;
  }
}

/** Flags active accounts with no activity for N days. Overrides a hook too. */
export class DormancyReviewJob extends EndOfDayJob {
  readonly name = 'dormancy-review';
}
