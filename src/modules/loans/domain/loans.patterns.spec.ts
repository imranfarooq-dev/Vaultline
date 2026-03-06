import { BusinessRuleError } from '../../../common/errors/domain.errors';
import { LoanStatus } from '../../../database/entities';
import { CreditReport, CreditReportProvider, LegacyCreditBureauAdapter, LegacyCreditBureauClient } from './credit-bureau.adapter';
import { LoanApplication, LoanApplicationBuilder } from './loan-application.builder';
import { AffordabilityDesk, ComplianceDesk, CreditCheckDesk, LoanApprovalMediator } from './loan-approval.mediator';
import { LoanDraft, LoanDraftCaretaker } from './loan-draft.memento';

const validBuilder = () =>
  new LoanApplicationBuilder().forApplicant('Ali Raza').disbursedTo('acc-1').borrowing(50_000_000).overMonths(24).for('car').earningMonthly(40_000_000);
