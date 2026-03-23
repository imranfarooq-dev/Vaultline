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
