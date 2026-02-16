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

  constructor(config: AppConfigService) {
    this.rules = config.fraudRules.map((source) => ({ source, expression: this.parser.parse(source) }));
    this.logger.log(`Loaded ${this.rules.length} fraud rule(s)`);
  }

  evaluate(context: RuleContext): FraudVerdict {
    const matchedRules = this.rules.filter((rule) => rule.expression.interpret(context)).map((rule) => rule.source);
    return { suspicious: matchedRules.length > 0, matchedRules };
  }

  /** Try an ad-hoc rule without saving it (used by POST /api/fraud/evaluate). */
  tryRule(source: string, context: RuleContext) {
    const expression = this.parser.parse(source);
    return { rule: source, parsedAs: expression.toString(), matched: expression.interpret(context) };
  }
}
