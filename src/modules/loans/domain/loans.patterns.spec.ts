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

  it('snapshots are immutable', () => {
    const snapshot = new LoanDraft({ amountMinor: 1 }).save();
    expect(() => {
      (snapshot.getState() as { amountMinor: number }).amountMinor = 99;
    }).toThrow();
  });

  it('caretaker keeps an undo stack per draft', () => {
    const caretaker = new LoanDraftCaretaker();
    const { id } = caretaker.create({ amountMinor: 100 });
    caretaker.change(id, { amountMinor: 200 });
    caretaker.change(id, { termMonths: 36 });
    expect(caretaker.get(id).undoSteps).toBe(2);

    expect(caretaker.undo(id).values).toEqual({ amountMinor: 200 });
    expect(caretaker.undo(id).values).toEqual({ amountMinor: 100 });
    expect(() => caretaker.undo(id)).toThrow('Nothing to undo');
  });
});

describe('Adapter: legacy credit bureau', () => {
  it('translates the pipe-delimited legacy format into a clean object', async () => {
    const legacy = { FETCH_RPT: jest.fn().mockResolvedValue('CUST=ALI|SCR=0712|DFLT=N|ENQ=03') } as unknown as LegacyCreditBureauClient;
    await expect(new LegacyCreditBureauAdapter(legacy).getReport('Ali')).resolves.toEqual({ score: 712, hasDefaults: false, recentEnquiries: 3 });
  });

  it('works with the simulated legacy client end to end', async () => {
    const report = await new LegacyCreditBureauAdapter().getReport('Known Defaulter');
    expect(report.hasDefaults).toBe(true);
    expect(report.score).toBeGreaterThanOrEqual(550);
  });
});

describe('Mediator: loan approval workflow', () => {
  const bureau = (report: CreditReport): CreditReportProvider => ({ getReport: async () => report });
  const mediatorWith = (report: CreditReport) => new LoanApprovalMediator(new CreditCheckDesk(bureau(report)), new AffordabilityDesk(), new ComplianceDesk());
  const good: CreditReport = { score: 750, hasDefaults: false, recentEnquiries: 0 };

  it('approves when every desk passes, in the order the mediator decides', async () => {
    const decision = await mediatorWith(good).decide(validBuilder().build());
    expect(decision.status).toBe(LoanStatus.APPROVED);
    expect(decision.log.map((l) => l.split(':')[1].trim().split(' ')[0])).toEqual(['credit.passed', 'affordability.passed', 'compliance.passed']);
  });

  it('stops early: a credit rejection means other desks never review', async () => {
    const decision = await mediatorWith({ ...good, hasDefaults: true }).decide(validBuilder().build());
    expect(decision.status).toBe(LoanStatus.REJECTED);
    expect(decision.log).toHaveLength(1);
  });

  it('borderline credit that passes everything else goes to manual review', async () => {
    const decision = await mediatorWith({ ...good, score: 650 }).decide(validBuilder().build());
    expect(decision.status).toBe(LoanStatus.MANUAL_REVIEW);
    expect(decision.log).toHaveLength(3);
  });
});
