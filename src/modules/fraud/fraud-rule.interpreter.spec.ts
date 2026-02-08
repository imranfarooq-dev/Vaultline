import { AppConfigService } from '../../config/app-config.service';
import { FraudRuleEngine } from './fraud-rule.engine';
import { AndExpression, ComparisonExpression, FraudRuleParser, NotExpression, RuleSyntaxError } from './fraud-rule.interpreter';

describe('Interpreter: fraud rule language', () => {
  const parser = new FraudRuleParser();
  const evaluate = (rule: string, ctx: Record<string, string | number | boolean>) => parser.parse(rule).interpret(ctx);

  it('interprets a hand-built expression tree (no parser involved)', () => {
    const tree = new AndExpression(new ComparisonExpression('amount', '>', 100), new NotExpression(new ComparisonExpression('channel', '==', 'web')));
    expect(tree.interpret({ amount: 500, channel: 'mobile' })).toBe(true);
    expect(tree.interpret({ amount: 500, channel: 'web' })).toBe(false);
  });
});
