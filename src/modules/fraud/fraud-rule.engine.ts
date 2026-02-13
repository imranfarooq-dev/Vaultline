import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { Expression, FraudRuleParser, RuleContext } from './fraud-rule.interpreter';

export interface FraudVerdict {
  suspicious: boolean;
  matchedRules: string[];
}

/** Loads rules from configuration once, then evaluates transactions against them. */
@Injectable()
export class FraudRuleEngine {
  private readonly logger = new Logger(FraudRuleEngine.name);
  private readonly parser = new FraudRuleParser();
  private readonly rules: { source: string; expression: Expression }[];
}
