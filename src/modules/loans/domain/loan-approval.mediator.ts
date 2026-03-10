import { LoanStatus } from '../../../database/entities';
import { LoanApplication } from './loan-application.builder';
import { CreditReportProvider } from './credit-bureau.adapter';

/**
 * ============================================================================
 * PATTERN: MEDIATOR (Behavioral)
 * ============================================================================
 * Problem : Approving a loan involves several desks: credit check,
 *           affordability, compliance. If each desk called the next directly
 *           (credit -> affordability -> compliance), every desk would know about
 *           the others and changing the process would touch all of them.
 * Solution: Desks only talk to a MEDIATOR ("I finished, here's my result").
 *           The mediator owns the workflow and decides who acts next.
 *           Desks stay independent and reusable.
 *
 * Analogy : Planes never talk to each other; they all talk to the control
 *           tower, which coordinates who lands next.
 * ============================================================================
 */
export type DeskEvent =
  | 'credit.passed' | 'credit.borderline' | 'credit.rejected'
  | 'affordability.passed' | 'affordability.failed'
  | 'compliance.passed' | 'compliance.manual-review';

export interface LoanMediator {
  notify(sender: LoanDesk, event: DeskEvent, detail: string): Promise<void>;
}

export abstract class LoanDesk {
  abstract readonly name: string;
  protected mediator!: LoanMediator;

  setMediator(mediator: LoanMediator): void {
    this.mediator = mediator;
  }

  abstract review(application: LoanApplication): Promise<void>;
}

export class CreditCheckDesk extends LoanDesk {
  readonly name = 'Credit desk';
  constructor(private readonly bureau: CreditReportProvider) { super(); }

  async review(application: LoanApplication): Promise<void> {
    const report = await this.bureau.getReport(application.applicantName);
    const detail = `score ${report.score}, defaults ${report.hasDefaults ? 'yes' : 'no'}, enquiries ${report.recentEnquiries}`;
    if (report.hasDefaults || report.score < 600) return this.mediator.notify(this, 'credit.rejected', detail);
    if (report.score < 680) return this.mediator.notify(this, 'credit.borderline', detail);
    return this.mediator.notify(this, 'credit.passed', detail);
  }
}

export class AffordabilityDesk extends LoanDesk {
  readonly name = 'Affordability desk';
  private static readonly ANNUAL_RATE = 0.2; // 20% illustrative

  /** Standard amortised instalment formula. */
  static monthlyInstalmentMinor(amountMinor: number, termMonths: number): number {
    const r = AffordabilityDesk.ANNUAL_RATE / 12;
    return Math.round((amountMinor * r) / (1 - Math.pow(1 + r, -termMonths)));
  }

  async review(application: LoanApplication): Promise<void> {
    const instalment = AffordabilityDesk.monthlyInstalmentMinor(application.amountMinor, application.termMonths);
    const ratio = instalment / application.monthlyIncomeMinor;
    const detail = `instalment ${(instalment / 100).toFixed(0)} = ${(ratio * 100).toFixed(1)}% of income`;
    return this.mediator.notify(this, ratio > 0.4 ? 'affordability.failed' : 'affordability.passed', detail);
  }
}
