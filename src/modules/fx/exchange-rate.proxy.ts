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
