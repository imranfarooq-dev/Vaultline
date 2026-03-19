import { Logger } from '@nestjs/common';
import { AccountEntity } from '../../database/entities';

/**
 * ============================================================================
 * PATTERN: TEMPLATE METHOD (Behavioral)
 * ============================================================================
 * Problem : Banks run many nightly batch jobs (post interest, flag dormant
 *           accounts, charge fees). Every job repeats the same skeleton:
 *           log start -> load accounts -> process each one safely ->
 *           collect failures -> summarise -> log end.
 *           Copy-pasting that skeleton means fixing a bug in 5 places.
 * Solution: The base class owns the skeleton in ONE final method, run().
 *           Subclasses fill in only the steps that differ
 *           (loadAccounts, processAccount) and can optionally override hooks.
 *
 * Analogy : Every exam follows the same routine (enter, get paper, write,
 *           submit); only the subject questions change.
 * ============================================================================
 */
export interface JobReport {
  job: string;
  startedAt: string;
  durationMs: number;
  scanned: number;
  affected: number;
  failed: number;
  details: string[];
  errors: string[];
}

export abstract class EndOfDayJob {
  protected readonly logger = new Logger(this.constructor.name);
  abstract readonly name: string;

  /** THE template method. Subclasses must not override it. */
  async run(): Promise<JobReport> {
    const started = Date.now();
    const report: JobReport = { job: this.name, startedAt: new Date(started).toISOString(), durationMs: 0, scanned: 0, affected: 0, failed: 0, details: [], errors: [] };

    await this.beforeRun();
    const accounts = await this.loadAccounts();
    report.scanned = accounts.length;

    for (const account of accounts) {
      try {
        const outcome = await this.processAccount(account);
        if (outcome) {
          report.affected++;
          report.details.push(outcome);
        }
      } catch (error) {
        // One bad account must not stop the whole batch.
        report.failed++;
        report.errors.push(`${account.accountNumber}: ${(error as Error).message}`);
      }
    }

    report.durationMs = Date.now() - started;
    await this.afterRun(report);
    return report;
  }

  // ----- steps subclasses MUST implement -----
  protected abstract loadAccounts(): Promise<AccountEntity[]>;
  /** Return a description if the account was affected, or null if skipped. */
  protected abstract processAccount(account: AccountEntity): Promise<string | null>;
}
