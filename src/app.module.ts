import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { AiModule } from './modules/ai/ai.module';
import { BankingModule } from './modules/banking/banking.module';
import { CoreModule } from './modules/core/core.module';
import { FraudModule } from './modules/fraud/fraud.module';
import { FxModule } from './modules/fx/fx.module';
import { HealthModule } from './modules/health/health.module';
import { LoansModule } from './modules/loans/loans.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OperationsModule } from './modules/operations/operations.module';
import { PatternsModule } from './modules/patterns/patterns.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { StatementsModule } from './modules/statements/statements.module';
import { TransactionsModule } from './modules/transactions/transactions.module';

/** The HTTP API process (APP_MODE=api). */
@Module({
  imports: [
    // infrastructure
    AppConfigModule,
    DatabaseModule,
    CoreModule,
    MessagingModule,
    HealthModule,
    // business features
    PatternsModule,
    AccountsModule,
    TransactionsModule,
    FraudModule,
    PaymentsModule,
    FxModule,
    LoansModule,
    StatementsModule,
    OperationsModule,
    BankingModule,
    NotificationsModule,
    AiModule,
  ],
})
export class AppModule {}
