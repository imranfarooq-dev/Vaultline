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
export interface CreditReportProvider {
  getReport(applicantName: string): Promise<CreditReport>;
}

/** Adaptee: the legacy client we cannot change (simulated, deterministic by name). */
export class LegacyCreditBureauClient {
  async FETCH_RPT(customerName: string): Promise<string> {
    const hash = [...customerName.toUpperCase()].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) % 100_000, 7);
    const score = 550 + (hash % 300);
    const defaulted = /default/i.test(customerName) ? 'Y' : 'N';
    return `CUST=${customerName.toUpperCase()}|SCR=${String(score).padStart(4, '0')}|DFLT=${defaulted}|ENQ=${String(hash % 6).padStart(2, '0')}`;
  }
}

/** The adapter. */
export class LegacyCreditBureauAdapter implements CreditReportProvider {
  constructor(private readonly legacy: LegacyCreditBureauClient = new LegacyCreditBureauClient()) {}

  async getReport(applicantName: string): Promise<CreditReport> {
    const raw = await this.legacy.FETCH_RPT(applicantName);
    const fields = Object.fromEntries(raw.split('|').map((pair) => pair.split('=') as [string, string]));
    return {
      score: Number.parseInt(fields.SCR, 10),
      hasDefaults: fields.DFLT === 'Y',
      recentEnquiries: Number.parseInt(fields.ENQ, 10),
    };
  }
}
