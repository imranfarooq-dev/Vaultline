import { randomUUID } from 'node:crypto';
import { NotFoundError, BusinessRuleError } from '../../../common/errors/domain.errors';
import { LedgerService } from '../ledger.service';
import { MoneyTransferService, TransferRequest } from '../transfer/money-transfer.decorators';

/**
 * ============================================================================
 * PATTERN: COMMAND (Behavioral)
 * ============================================================================
 * Problem : We want to execute banking actions, keep a history of them, and
 *           UNDO them later. If the controller calls the ledger directly,
 *           the action is gone the moment it finishes; nothing remembers it.
 * Solution: Wrap each request in an OBJECT that knows how to execute() and
 *           undo() itself. An INVOKER runs commands and keeps their history.
 *           The invoker doesn't know what a deposit is; it just runs commands.
 *
 * Analogy : A waiter writes your order on a slip. The slip can be queued,
 *           handed to the kitchen, or torn up to cancel.
 * ============================================================================
 */
export interface BankCommand {
  readonly name: string;
  readonly summary: Record<string, unknown>;
  execute(): Promise<{ reference: string }>;
  undo(reference: string): Promise<object>;
}
