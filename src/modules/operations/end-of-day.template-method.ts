import { Logger } from '@nestjs/common';
import { AccountEntity } from '../../database/entities';

/**
 * ============================================================================
 * PATTERN: TEMPLATE METHOD (Behavioral)
 * ============================================================================
 * Problem : Banks run many nightly batch jobs (post interest, flag dormant
 *           accounts, charge fees). Every job repeats the same skeleton:
 *           log start -> load accounts -> process each one safely ->
 *           collect failures -> summarise -> log end.
 *           Copy-pasting that skeleton means fixing a bug in 5 places.
 * Solution: The base class owns the skeleton in ONE final method, run().
 *           Subclasses fill in only the steps that differ
 *           (loadAccounts, processAccount) and can optionally override hooks.
 *
 * Analogy : Every exam follows the same routine (enter, get paper, write,
 *           submit); only the subject questions change.
 * ============================================================================
 */
export interface JobReport {
  job: string;
  startedAt: string;
  durationMs: number;
  scanned: number;
  affected: number;
  failed: number;
  details: string[];
  errors: string[];
}
