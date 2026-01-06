import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigService } from '../../config/app-config.service';
import { AccountEntity, LedgerEntryEntity } from '../../database/entities';
import { FraudModule } from '../fraud/fraud.module';
import { FraudRuleEngine } from '../fraud/fraud-rule.engine';
import { CommandInvoker } from './commands/bank.commands';
import { LedgerService } from './ledger.service';
import { TransactionHistoryService } from './transaction-history.service';
import { TransactionsController } from './transactions.controller';
import {
  AuditTimingDecorator,
  FraudScreeningDecorator,
  LedgerTransferService,
  MONEY_TRANSFER_SERVICE,
  TransferFeeDecorator,
} from './transfer/money-transfer.decorators';

@Module({
  imports: [TypeOrmModule.forFeature([AccountEntity, LedgerEntryEntity]), FraudModule],
  controllers: [TransactionsController],
  providers: [
    LedgerService,
    TransactionHistoryService,
    CommandInvoker,
    {
      // DECORATOR wiring: read it inside-out. Reorder or remove a layer right here.
      provide: MONEY_TRANSFER_SERVICE,
      inject: [LedgerService, FraudRuleEngine, AppConfigService],
      useFactory: (ledger: LedgerService, fraud: FraudRuleEngine, config: AppConfigService) =>
        new AuditTimingDecorator(
          new FraudScreeningDecorator(
            new TransferFeeDecorator(
              new LedgerTransferService(ledger),
              config.internalTransferFeeMinor,
            ),
            fraud,
          ),
        ),
    },
  ],
  exports: [LedgerService, TransactionHistoryService, MONEY_TRANSFER_SERVICE],
})
export class TransactionsModule {}
