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

export class DepositCommand implements BankCommand {
  readonly name = 'deposit';
  constructor(private readonly ledger: LedgerService, private readonly accountId: string, private readonly amountMinor: number, private readonly description?: string) {}
  get summary() { return { accountId: this.accountId, amountMinor: this.amountMinor }; }
  execute() { return this.ledger.deposit(this.accountId, this.amountMinor, { description: this.description }); }
  undo(reference: string) { return this.ledger.reverse(reference); }
}

export class WithdrawCommand implements BankCommand {
  readonly name = 'withdraw';
  constructor(private readonly ledger: LedgerService, private readonly accountId: string, private readonly amountMinor: number, private readonly description?: string) {}
  get summary() { return { accountId: this.accountId, amountMinor: this.amountMinor }; }
  execute() { return this.ledger.withdraw(this.accountId, this.amountMinor, { description: this.description }); }
  undo(reference: string) { return this.ledger.reverse(reference); }
}

export class TransferCommand implements BankCommand {
  readonly name = 'transfer';
  constructor(private readonly transfers: MoneyTransferService, private readonly ledger: LedgerService, private readonly request: TransferRequest) {}
  get summary() { return { ...this.request }; }
  async execute() { return { ...(await this.transfers.transfer(this.request)) }; }
  undo(reference: string) { return this.ledger.reverse(reference); }
}

export interface CommandRecord {
  commandId: string;
  name: string;
  summary: Record<string, unknown>;
  status: 'EXECUTED' | 'FAILED' | 'UNDONE';
  reference?: string;
  error?: string;
  executedAt: string;
  undoneAt?: string;
}

/**
 * The INVOKER. History lives in memory (per pod) to keep the example small;
 * a real bank would persist it. Reversals themselves are always persisted.
 */
export class CommandInvoker {
  private readonly history = new Map<string, { command: BankCommand; record: CommandRecord }>();
  private static readonly MAX_HISTORY = 500;
}
