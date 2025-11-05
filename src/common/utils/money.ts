/**
 * Money is always stored as an INTEGER number of minor units
 * (paisa for PKR, cents for USD). Floating point numbers cannot represent
 * 0.1 exactly, so they must never be used for balances.
 *
 *   PKR 1,250.50  ->  125050 minor units
 */
export const toMinor = (major: number, decimals = 2): number => Math.round(major * 10 ** decimals);
export const toMajor = (minor: number, decimals = 2): number => minor / 10 ** decimals;

/** Percent of an amount, rounded to the nearest minor unit (banker's rounding is out of scope). */
export const percentOf = (amountMinor: number, percent: number): number => Math.round((amountMinor * percent) / 100);
