import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountEntity, LedgerEntryEntity } from '../../database/entities';
import { TransactionsModule } from '../transactions/transactions.module';
import { OperationsController } from './operations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AccountEntity, LedgerEntryEntity]), TransactionsModule],
  controllers: [OperationsController],
})
export class OperationsModule {}
