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

  constructor(
    private readonly fetcher: EntryFetcher,
    private readonly accountId: string,
    private readonly options: HistoryOptions = {},
  ) {}

  async next(): Promise<IteratorResult<LedgerEntryEntity>> {
    if (this.buffer.length === 0 && !this.exhausted) await this.loadNextPage();
    const entry = this.buffer.shift();
    return entry ? { value: entry, done: false } : { value: undefined, done: true };
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<LedgerEntryEntity> {
    return this;
  }

  private async loadNextPage(): Promise<void> {
    const pageSize = this.options.pageSize ?? 200;
    const page = await this.fetcher.fetchPage(this.accountId, this.cursor, pageSize, this.options);
    this.pagesFetched++;
    this.buffer = page;
    if (page.length < pageSize) this.exhausted = true;
    const last = page[page.length - 1];
    if (last) this.cursor = { createdAt: last.createdAt, id: last.id };
  }
}

/** Real Postgres implementation of the page fetcher. */
export class TypeOrmEntryFetcher implements EntryFetcher {
  constructor(private readonly repository: Repository<LedgerEntryEntity>) {}
}
