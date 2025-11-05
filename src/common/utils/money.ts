/**
 * Money is always stored as an INTEGER number of minor units
 * (paisa for PKR, cents for USD). Floating point numbers cannot represent
 * 0.1 exactly, so they must never be used for balances.
 *
 *   PKR 1,250.50  ->  125050 minor units
 */
export const toMinor = (major: number, decimals = 2): number => Math.round(major * 10 ** decimals);
