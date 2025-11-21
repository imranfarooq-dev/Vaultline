/**
 * ============================================================================
 * PATTERN: FLYWEIGHT (Structural)
 * ============================================================================
 * Problem : A statement can contain thousands of amounts. If each amount
 *           carried its own copy of { code, name, symbol, decimals } we would
 *           waste memory on identical data.
 * Solution: Split data into
 *             - INTRINSIC state: shared and immutable (the Currency object)
 *             - EXTRINSIC state: unique per use (the amount), passed in.
 *           A factory hands out the same shared Currency object every time.
 *
 * Analogy : A printing press has one metal block for the letter "A" that it
 *           reuses on every page, instead of casting a new "A" each time.
 * ============================================================================
 */
export class Currency {
  constructor(
    readonly code: string,
    readonly name: string,
    readonly symbol: string,
    readonly decimals: number,
  ) {
    Object.freeze(this);
  }

  /** The amount is EXTRINSIC state: it is supplied by the caller. */
  format(amountMinor: number): string {
    const major = amountMinor / 10 ** this.decimals;
    return `${this.symbol} ${major.toLocaleString('en-US', {
      minimumFractionDigits: this.decimals,
      maximumFractionDigits: this.decimals,
    })}`;
  }
}

const KNOWN_CURRENCIES: Record<string, [name: string, symbol: string, decimals: number]> = {
  PKR: ['Pakistani Rupee', 'Rs', 2],
  USD: ['US Dollar', '$', 2],
  EUR: ['Euro', '€', 2],
  GBP: ['British Pound', '£', 2],
  AED: ['UAE Dirham', 'AED', 2],
  SAR: ['Saudi Riyal', 'SAR', 2],
};

/** The flyweight factory. */
export class CurrencyRegistry {
  private readonly pool = new Map<string, Currency>();

  get(code: string): Currency {
    const key = code.toUpperCase();
    const cached = this.pool.get(key);
    if (cached) return cached;

    const definition = KNOWN_CURRENCIES[key];
    if (!definition) throw new Error(`Unsupported currency: ${code}`);

    const currency = new Currency(key, ...definition);
    this.pool.set(key, currency);
    return currency;
  }
}
