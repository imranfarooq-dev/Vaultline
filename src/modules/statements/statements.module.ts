import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { StatementsController } from './statements.controller';

@Module({
  imports: [AccountsModule, TransactionsModule],
  controllers: [StatementsController],
})
export class StatementsModule {}
