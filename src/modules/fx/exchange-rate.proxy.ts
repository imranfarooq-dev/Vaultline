import { Injectable, Logger } from '@nestjs/common';
import { BusinessRuleError, DependencyUnavailableError } from '../../common/errors/domain.errors';

/**
 * ============================================================================
 * PATTERN: PROXY (Structural)
 * ============================================================================
 * Problem : Exchange rates come from an external provider that is slow
 *           (hundreds of ms), charges per call, and rate-limits us. Calling it
 *           for every single conversion is expensive and fragile.
 * Solution: Put a PROXY in front of it with the SAME interface. Callers can't
 *           tell the difference, but the proxy adds:
 *             - caching        (serve recent rates from memory)
 *             - rate limiting  (protect the provider and our bill)
 *             - fallback       (serve a stale rate if the provider is down)
 *
 * Analogy : A secretary in front of a busy manager: answers common questions
 *           herself and only lets important calls through.
 *
 * Decorator vs Proxy: structurally identical (wrap + same interface).
 * Decorator ADDS behaviour the caller wants; Proxy CONTROLS ACCESS to the real object.
 * ============================================================================
 */
export interface Rate {
  from: string;
  to: string;
  rate: number;
  asOf: string;
}

export interface ExchangeRateProvider {
  getRate(from: string, to: string): Promise<Rate>;
}

/** The "real subject": simulates a slow, rate-limited third-party API. */
export class ExternalExchangeRateService implements ExchangeRateProvider {
  calls = 0;
  private static readonly PKR_PER_UNIT: Record<string, number> = { PKR: 1, USD: 281.5, EUR: 305.2, GBP: 356.8, AED: 76.6, SAR: 75.0 };

  constructor(private readonly latencyMs = 300) {}

  async getRate(from: string, to: string): Promise<Rate> {
    this.calls++;
    await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    const f = ExternalExchangeRateService.PKR_PER_UNIT[from];
    const t = ExternalExchangeRateService.PKR_PER_UNIT[to];
    if (!f || !t) throw new BusinessRuleError(`No rate for ${from}/${to}`);
    return { from, to, rate: Number((f / t).toFixed(6)), asOf: new Date().toISOString() };
  }
}

@Injectable()
export class CachingExchangeRateProxy implements ExchangeRateProvider {
  private readonly logger = new Logger(CachingExchangeRateProxy.name);
  private readonly cache = new Map<string, { rate: Rate; storedAt: number }>();
  private recentCalls: number[] = [];
  stats = { hits: 0, misses: 0, staleServed: 0 };

  constructor(
    private readonly real: ExchangeRateProvider = new ExternalExchangeRateService(),
    private readonly ttlMs = 60_000,
    private readonly maxCallsPerMinute = 30,
  ) {}
}
