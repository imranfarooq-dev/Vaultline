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
}
