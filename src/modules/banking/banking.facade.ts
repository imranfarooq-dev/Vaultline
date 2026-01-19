import { Injectable, Logger } from '@nestjs/common';
import { AccountType } from '../../database/entities';
import { AccountsService } from '../accounts/accounts.service';
import { DomainEventBus } from '../messaging/domain-event-bus.observer';
import { createEvent, EventTypes } from '../messaging/domain-events';
import { LedgerService } from '../transactions/ledger.service';
import { TransactionHistoryService } from '../transactions/transaction-history.service';

/**
 * ============================================================================
 * PATTERN: FACADE (Structural)
 * ============================================================================
 * Problem : Onboarding a customer touches many subsystems in the right order:
 *           open account (factory + prototype) -> post initial deposit
 *           (ledger + validation chain) -> activate (state) -> publish event
 *           (observer + Kafka) -> undo the account if something fails.
 *           Every client (web, mobile, branch app) would have to know all that.
 * Solution: One FACADE with a simple method, onboardCustomer(), that hides
 *           the orchestration. Subsystems are still available for advanced use.
 *
 * Analogy : A car's START button hides fuel pump, battery, starter and
 *           engine checks behind one press.
 * ============================================================================
 */
export interface OnboardCustomerInput {
  ownerName: string;
  type: AccountType;
  currency: string;
  initialDepositMinor: number;
  productCode?: string;
}

@Injectable()
export class BankingFacade {
  private readonly logger = new Logger(BankingFacade.name);
}
