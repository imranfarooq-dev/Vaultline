import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { BankingController } from './banking.controller';
import { BankingFacade } from './banking.facade';

@Module({
  imports: [AccountsModule, TransactionsModule],
  controllers: [BankingController],
  providers: [BankingFacade],
})
export class BankingModule {}
