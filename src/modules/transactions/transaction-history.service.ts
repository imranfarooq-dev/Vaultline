import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntryEntity } from '../../database/entities';
import { HistoryOptions, LedgerHistoryIterator, TypeOrmEntryFetcher } from './ledger-history.iterator';

@Injectable()
export class TransactionHistoryService {
  private readonly fetcher: TypeOrmEntryFetcher;

  constructor(@InjectRepository(LedgerEntryEntity) private readonly entries: Repository<LedgerEntryEntity>) {
    this.fetcher = new TypeOrmEntryFetcher(entries);
  }

  iterate(accountId: string, options: HistoryOptions = {}): LedgerHistoryIterator {
    return new LedgerHistoryIterator(this.fetcher, accountId, options);
  }
}
