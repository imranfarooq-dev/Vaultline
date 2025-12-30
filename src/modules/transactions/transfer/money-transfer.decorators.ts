import { Logger } from '@nestjs/common';
import { FraudSuspectedError } from '../../../common/errors/domain.errors';
import { FraudRuleEngine } from '../../fraud/fraud-rule.engine';
import { LedgerService } from '../ledger.service';

/**
 * ============================================================================
 * PATTERN: DECORATOR (Structural)
 * ============================================================================
 * Problem : A basic transfer just moves money. On top of that we want fraud
 *           screening, a fee, and audit timing. Stuffing all of that into one
 *           class mixes concerns; creating subclasses for every combination
 *           ("FeeFraudTransfer", "FeeOnlyTransfer"...) explodes.
 * Solution: Wrap the basic service in layers. Every layer has the SAME
 *           interface, does its extra work, and delegates to the layer inside.
 *           Layers can be added, removed or reordered at wiring time.
 *
 *     Audit( FraudScreening( Fee( LedgerTransfer ) ) )
 *
 * Analogy : Plain chai -> add milk -> add elaichi -> add sugar. Each addition
 *           wraps the cup; it is still "a cup of chai".
 *
 * Not to be confused with TypeScript's @Decorators (like @Injectable()),
 * which are a language feature for attaching metadata. Related idea, different thing.
 * ============================================================================
 */
export type Channel = 'web' | 'mobile' | 'branch';

export interface TransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amountMinor: number;
  channel: Channel;
  description?: string;
  /** Filled in by decorators, not by the caller. */
  feeMinor?: number;
}

export interface TransferResult {
  reference: string;
  amountMinor: number;
  feeMinor: number;
  fromBalanceAfterMinor: number;
  toBalanceAfterMinor: number;
  /** Which layers the request passed through, innermost last. Great for learning. */
  pipeline: string[];
}

export interface MoneyTransferService {
  transfer(request: TransferRequest): Promise<TransferResult>;
}

export const MONEY_TRANSFER_SERVICE = Symbol('MONEY_TRANSFER_SERVICE');

/** The core component being decorated. */
export class LedgerTransferService implements MoneyTransferService {
  constructor(private readonly ledger: LedgerService) {}

  async transfer(request: TransferRequest): Promise<TransferResult> {
    const result = await this.ledger.transfer({
      fromAccountId: request.fromAccountId,
      toAccountId: request.toAccountId,
      amountMinor: request.amountMinor,
      feeMinor: request.feeMinor ?? 0,
      description: request.description,
    });
    return { ...result, amountMinor: request.amountMinor, pipeline: ['ledger'] };
  }
}

/** Base decorator: forwards everything. Concrete decorators override transfer(). */
export abstract class TransferServiceDecorator implements MoneyTransferService {
  constructor(protected readonly inner: MoneyTransferService) {}

  transfer(request: TransferRequest): Promise<TransferResult> {
    return this.inner.transfer(request);
  }
}

export class TransferFeeDecorator extends TransferServiceDecorator {
  constructor(inner: MoneyTransferService, private readonly feeMinor: number) {
    super(inner);
  }

  override async transfer(request: TransferRequest): Promise<TransferResult> {
    // Branch transfers cost more than digital ones.
    const fee = request.channel === 'branch' ? this.feeMinor + 10_000 : this.feeMinor;
    const result = await this.inner.transfer({ ...request, feeMinor: (request.feeMinor ?? 0) + fee });
    return { ...result, pipeline: ['fee', ...result.pipeline] };
  }
}

export class FraudScreeningDecorator extends TransferServiceDecorator {
  constructor(inner: MoneyTransferService, private readonly fraud: FraudRuleEngine) {
    super(inner);
  }

  override async transfer(request: TransferRequest): Promise<TransferResult> {
    const now = new Date();
    const verdict = this.fraud.evaluate({
      amount: request.amountMinor,
      channel: request.channel,
      hour: now.getHours(),
      dayOfWeek: now.getDay(),
    });
    if (verdict.suspicious) {
      throw new FraudSuspectedError('Transfer blocked by fraud rules', { matchedRules: verdict.matchedRules });
    }
    const result = await this.inner.transfer(request);
    return { ...result, pipeline: ['fraud-screening', ...result.pipeline] };
  }
}

export class AuditTimingDecorator extends TransferServiceDecorator {
  private readonly logger = new Logger('TransferAudit');

  override async transfer(request: TransferRequest): Promise<TransferResult> {
    const started = Date.now();
    try {
      const result = await this.inner.transfer(request);
      this.logger.log(`OK ${result.reference} amount=${request.amountMinor} in ${Date.now() - started}ms`);
      return { ...result, pipeline: ['audit', ...result.pipeline] };
    } catch (error) {
      this.logger.warn(`FAILED transfer amount=${request.amountMinor} after ${Date.now() - started}ms: ${(error as Error).message}`);
      throw error;
    }
  }
}
