import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundError } from '../../common/errors/domain.errors';
import { LoanApplicationEntity } from '../../database/entities';
import { AccountsService } from '../accounts/accounts.service';
import { DomainEventBus } from '../messaging/domain-event-bus.observer';
import { createEvent, EventTypes } from '../messaging/domain-events';
import { LegacyCreditBureauAdapter } from './domain/credit-bureau.adapter';
import { LoanApplicationBuilder } from './domain/loan-application.builder';
import { AffordabilityDesk, ComplianceDesk, CreditCheckDesk, LoanApprovalMediator } from './domain/loan-approval.mediator';
import { LoanDraftCaretaker, LoanDraftFields } from './domain/loan-draft.memento';

@Injectable()
export class LoansService {
  private readonly drafts = new LoanDraftCaretaker();
  private readonly bureau = new LegacyCreditBureauAdapter();

  constructor(
    @InjectRepository(LoanApplicationEntity) private readonly loans: Repository<LoanApplicationEntity>,
    private readonly accounts: AccountsService,
    private readonly events: DomainEventBus,
  ) {}

  createDraft(fields: LoanDraftFields) {
    return this.present(this.drafts.create(fields).id);
  }

  updateDraft(id: string, changes: LoanDraftFields) {
    this.drafts.change(id, changes); // MEMENTO: snapshot taken before the change
    return this.present(id);
  }

  undoDraft(id: string) {
    this.drafts.undo(id);
    return this.present(id);
  }

  getDraft(id: string) {
    return this.present(id);
  }

  /** BUILDER -> MEDIATOR -> persist -> OBSERVER (event). */
  async submit(id: string) {
    const { draft } = this.drafts.get(id);
    const f = draft.values;

    const builder = new LoanApplicationBuilder()
      .forApplicant(f.applicantName ?? '')
      .disbursedTo(f.accountId ?? '')
      .borrowing(f.amountMinor ?? 0)
      .overMonths(f.termMonths ?? 12)
      .for(f.purpose ?? 'personal')
      .earningMonthly(f.monthlyIncomeMinor ?? 0);
    if (f.collateralDescription && f.collateralValueMinor) builder.securedBy(f.collateralDescription, f.collateralValueMinor);
    const application = builder.build();

    await this.accounts.findById(application.accountId); // must exist

    const mediator = new LoanApprovalMediator(new CreditCheckDesk(this.bureau), new AffordabilityDesk(), new ComplianceDesk());
    const decision = await mediator.decide(application);

    const saved = await this.loans.save(
      this.loans.create({
        applicantName: application.applicantName,
        accountId: application.accountId,
        amountMinor: application.amountMinor,
        termMonths: application.termMonths,
        purpose: application.purpose,
        monthlyIncomeMinor: application.monthlyIncomeMinor,
        status: decision.status,
        decisionLog: decision.log,
      }),
    );
    this.drafts.remove(id);

    await this.events.publish(createEvent(EventTypes.LOAN_DECIDED, { loanId: saved.id, accountId: saved.accountId, status: saved.status, amountMinor: saved.amountMinor }));
    return {
      ...saved,
      monthlyInstalmentMinor: AffordabilityDesk.monthlyInstalmentMinor(saved.amountMinor, saved.termMonths),
    };
  }

  async findById(id: string) {
    const loan = await this.loans.findOneBy({ id });
    if (!loan) throw new NotFoundError(`Loan ${id} not found`);
    return loan;
  }

  creditReport(name: string) {
    return this.bureau.getReport(name);
  }

  private present(id: string) {
    const { draft, undoSteps } = this.drafts.get(id);
    return { draftId: draft.id, fields: draft.values, undoSteps };
  }
}
