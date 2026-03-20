import { anAccount } from '../../../test/support/factories';
import { AccountEntity } from '../../database/entities';
import { EndOfDayJob, JobReport } from './end-of-day.template-method';

class RecordingJob extends EndOfDayJob {
  readonly name = 'recording';
  readonly calls: string[] = [];

  constructor(private readonly accounts: AccountEntity[]) {
    super();
  }

  protected override async beforeRun() { this.calls.push('beforeRun'); }
  protected async loadAccounts() { this.calls.push('loadAccounts'); return this.accounts; }
  protected async processAccount(account: AccountEntity) {
    this.calls.push(`process:${account.accountNumber}`);
    if (account.accountNumber === 'BAD') throw new Error('corrupt');
    return account.balanceMinor > 0 ? `${account.accountNumber} ok` : null;
  }
  protected override async afterRun(report: JobReport) { this.calls.push(`afterRun:${report.affected}`); }
}

describe('Template Method: end-of-day job skeleton', () => {
  it('runs the steps in the order fixed by the base class', async () => {
    const job = new RecordingJob([anAccount({ accountNumber: 'A' }), anAccount({ accountNumber: 'B' })]);
    await job.run();
    expect(job.calls).toEqual(['beforeRun', 'loadAccounts', 'process:A', 'process:B', 'afterRun:2']);
  });

  it('counts affected, skipped and failed accounts without stopping the batch', async () => {
    const job = new RecordingJob([anAccount({ accountNumber: 'A' }), anAccount({ accountNumber: 'BAD' }), anAccount({ accountNumber: 'Z', balanceMinor: 0 })]);
    const report = await job.run();
    expect(report).toMatchObject({ job: 'recording', scanned: 3, affected: 1, failed: 1, details: ['A ok'], errors: ['BAD: corrupt'] });
    expect(job.calls).toContain('process:Z'); // processing continued after the failure
  });
});
