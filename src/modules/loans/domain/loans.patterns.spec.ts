import { BusinessRuleError } from '../../../common/errors/domain.errors';
import { LoanStatus } from '../../../database/entities';
import { CreditReport, CreditReportProvider, LegacyCreditBureauAdapter, LegacyCreditBureauClient } from './credit-bureau.adapter';
import { LoanApplication, LoanApplicationBuilder } from './loan-application.builder';
import { AffordabilityDesk, ComplianceDesk, CreditCheckDesk, LoanApprovalMediator } from './loan-approval.mediator';
import { LoanDraft, LoanDraftCaretaker } from './loan-draft.memento';

const validBuilder = () =>
  new LoanApplicationBuilder().forApplicant('Ali Raza').disbursedTo('acc-1').borrowing(50_000_000).overMonths(24).for('car').earningMonthly(40_000_000);

describe('Builder: loan application', () => {
  it('builds an immutable application step by step', () => {
    const app = validBuilder().withCoApplicant('Sara Raza').build();
    expect(app).toBeInstanceOf(LoanApplication);
    expect(app).toMatchObject({ applicantName: 'Ali Raza', amountMinor: 50_000_000, termMonths: 24, coApplicantName: 'Sara Raza' });
    expect(Object.isFrozen(app)).toBe(true);
  });
});
