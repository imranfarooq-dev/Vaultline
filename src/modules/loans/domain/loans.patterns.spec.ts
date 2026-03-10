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

  it('collects ALL validation problems in one error', () => {
    try {
      new LoanApplicationBuilder().overMonths(1).build();
      fail('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessRuleError);
      expect((error as BusinessRuleError).details?.errors).toHaveLength(5);
    }
  });

  it('validates rules that span several fields (large loans need collateral)', () => {
    const big = () => validBuilder().borrowing(300_000_000);
    expect(() => big().build()).toThrow('collateral');
    expect(() => big().securedBy('House', 100_000_000).build()).toThrow('collateral');
    expect(big().securedBy('House', 200_000_000).build().collateral).toEqual({ description: 'House', valueMinor: 200_000_000 });
  });
});

describe('Memento: loan drafts', () => {
  it('originator saves and restores its own snapshots', () => {
    const draft = new LoanDraft({ amountMinor: 1 });
    const snapshot = draft.save();
    draft.update({ amountMinor: 2 });
    draft.restore(snapshot);
    expect(draft.values.amountMinor).toBe(1);
  });
});
