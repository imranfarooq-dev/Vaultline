/**
 * ============================================================================
 * PATTERN: ADAPTER (Structural) - second example
 * ============================================================================
 * The national credit bureau exposes an old API that returns a pipe-delimited
 * string with cryptic keys:   "CUST=ALI RAZA|SCR=0712|DFLT=N|ENQ=03"
 * Our loan code wants a clean object: { score: 712, hasDefaults: false, ... }.
 * The adapter translates between the two so the legacy format never leaks in.
 * ============================================================================
 */

/** Target interface: what OUR code wants. */
export interface CreditReport {
  score: number;
  hasDefaults: boolean;
  recentEnquiries: number;
}
