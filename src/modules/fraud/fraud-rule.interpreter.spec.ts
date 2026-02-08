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

  it.each([
    ['amount > 100', { amount: 101 }, true],
    ['amount >= 100', { amount: 100 }, true],
    ['amount < 100', { amount: 100 }, false],
    ["channel == 'mobile'", { channel: 'mobile' }, true],
    ["channel != 'mobile'", { channel: 'web' }, true],
    ['international == true', { international: true }, true],
    ['amount > -5', { amount: 0 }, true],
  ])('%s with %j -> %s', (rule, ctx, expected) => {
    expect(evaluate(rule, ctx)).toBe(expected);
  });
});
