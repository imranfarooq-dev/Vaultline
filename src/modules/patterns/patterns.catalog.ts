/**
 * One place that maps every Gang of Four pattern to real code and a real
 * endpoint. Served at GET /api/patterns and checked by test/docs/patterns-catalog.spec.ts,
 * so this list can never silently drift from the code.
 */
export interface PatternEntry {
  pattern: string;
  category: 'Creational' | 'Structural' | 'Behavioral';
  inOneLine: string;
  file: string;
  tryIt: string;
}

export const PATTERN_CATALOG: PatternEntry[] = [
  // ---------------- Creational ----------------
  { pattern: 'Singleton', category: 'Creational', inOneLine: 'Exactly one shared reference-number generator', file: 'src/modules/core/reference-number.singleton.ts', tryIt: 'POST /api/transactions/deposit (see the reference)' },
];
