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
