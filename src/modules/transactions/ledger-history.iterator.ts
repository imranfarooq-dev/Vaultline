import { Repository } from 'typeorm';
import { LedgerEntryEntity } from '../../database/entities';

/**
 * ============================================================================
 * PATTERN: ITERATOR (Behavioral)
 * ============================================================================
 * Problem : An account can have 2 million ledger entries. Loading them all
 *           into memory crashes the pod, and callers shouldn't have to know
 *           about SQL pagination, cursors or page sizes.
 * Solution: An ITERATOR hands out entries one at a time through a simple
 *           `next()` / `for await...of` interface, fetching pages from the
 *           database behind the scenes (keyset pagination: fast at any depth).
 *
 * Analogy : Pressing "next song" on a playlist without knowing whether songs
 *           live on your phone, in a database, or on a server.
 * ============================================================================
 */
export interface HistoryOptions {
  pageSize?: number;
  from?: Date;
  to?: Date;
}

export interface EntryFetcher {
  /** Fetch the next page strictly AFTER the given cursor. */
  fetchPage(accountId: string, after: { createdAt: Date; id: string } | null, limit: number, options: HistoryOptions): Promise<LedgerEntryEntity[]>;
}

export class LedgerHistoryIterator implements AsyncIterableIterator<LedgerEntryEntity> {
  private buffer: LedgerEntryEntity[] = [];
  private cursor: { createdAt: Date; id: string } | null = null;
  private exhausted = false;
  pagesFetched = 0;
}
