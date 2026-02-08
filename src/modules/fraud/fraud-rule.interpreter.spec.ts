import { AppConfigService } from '../../config/app-config.service';
import { FraudRuleEngine } from './fraud-rule.engine';
import { AndExpression, ComparisonExpression, FraudRuleParser, NotExpression, RuleSyntaxError } from './fraud-rule.interpreter';

describe('Interpreter: fraud rule language', () => {
  const parser = new FraudRuleParser();
  const evaluate = (rule: string, ctx: Record<string, string | number | boolean>) => parser.parse(rule).interpret(ctx);
});
