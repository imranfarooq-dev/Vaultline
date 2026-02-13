import { Module } from '@nestjs/common';
import { FraudController } from './fraud.controller';
import { FraudRuleEngine } from './fraud-rule.engine';

@Module({
  controllers: [FraudController],
  providers: [FraudRuleEngine],
  exports: [FraudRuleEngine],
})
export class FraudModule {}
