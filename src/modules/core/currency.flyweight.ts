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
}
