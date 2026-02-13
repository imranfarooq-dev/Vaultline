/**
 * ============================================================================
 * PATTERN: INTERPRETER (Behavioral)
 * ============================================================================
 * Problem : The fraud team wants to change rules like
 *               amount > 5000000 AND channel == 'mobile'
 *           WITHOUT asking developers to redeploy code each time.
 * Solution: Define a tiny language (a grammar), turn each rule into a tree of
 *           expression objects, and let every node INTERPRET itself against a
 *           context (the transaction being checked).
 *
 * Analogy : A calculator reading "5 + 3 * 2": it breaks the text into pieces,
 *           understands their meaning, and evaluates the result.
 *
 * Grammar (from lowest to highest precedence):
 *   expression  := orExpr
 *   orExpr      := andExpr ( "OR" andExpr )*
 *   andExpr     := notExpr ( "AND" notExpr )*
 *   notExpr     := "NOT" notExpr | primary
 *   primary     := "(" expression ")" | comparison
 *   comparison  := IDENTIFIER OPERATOR value
 *   value       := NUMBER | 'STRING' | true | false
 *   OPERATOR    := > | >= | < | <= | == | !=
 * ============================================================================
 */
export type RuleContext = Record<string, string | number | boolean | undefined>;

/** Every node of the syntax tree implements this one method. */
export interface Expression {
  interpret(context: RuleContext): boolean;
  toString(): string;
}

// ---------- Terminal expression ----------
type Operator = '>' | '>=' | '<' | '<=' | '==' | '!=';

export class ComparisonExpression implements Expression {
  constructor(
    private readonly variable: string,
    private readonly operator: Operator,
    private readonly value: string | number | boolean,
  ) {}

  interpret(context: RuleContext): boolean {
    const actual = context[this.variable];
    if (actual === undefined) return false; // unknown data never triggers a rule
    switch (this.operator) {
      case '==': return actual === this.value;
      case '!=': return actual !== this.value;
      case '>': return Number(actual) > Number(this.value);
      case '>=': return Number(actual) >= Number(this.value);
      case '<': return Number(actual) < Number(this.value);
      case '<=': return Number(actual) <= Number(this.value);
    }
  }

  toString(): string {
    return `${this.variable} ${this.operator} ${typeof this.value === 'string' ? `'${this.value}'` : this.value}`;
  }
}

// ---------- Non-terminal expressions ----------
export class AndExpression implements Expression {
  constructor(private readonly left: Expression, private readonly right: Expression) {}
  interpret(context: RuleContext): boolean { return this.left.interpret(context) && this.right.interpret(context); }
  toString(): string { return `(${this.left} AND ${this.right})`; }
}

export class OrExpression implements Expression {
  constructor(private readonly left: Expression, private readonly right: Expression) {}
  interpret(context: RuleContext): boolean { return this.left.interpret(context) || this.right.interpret(context); }
  toString(): string { return `(${this.left} OR ${this.right})`; }
}

export class NotExpression implements Expression {
  constructor(private readonly inner: Expression) {}
  interpret(context: RuleContext): boolean { return !this.inner.interpret(context); }
  toString(): string { return `NOT ${this.inner}`; }
}

// ---------- Tokenizer + parser: text -> expression tree ----------
type Token = { kind: 'ident' | 'number' | 'string' | 'bool' | 'op' | 'and' | 'or' | 'not' | 'lparen' | 'rparen'; text: string };

export class RuleSyntaxError extends Error {}

const tokenize = (source: string): Token[] => {
  const pattern = /\s*(>=|<=|==|!=|>|<|\(|\)|'[^']*'|-?\d+(?:\.\d+)?|[A-Za-z_][A-Za-z0-9_]*)/y;
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    if (/^\s*$/.test(source.slice(index))) break;
    pattern.lastIndex = index;
    const match = pattern.exec(source);
    if (!match) throw new RuleSyntaxError(`Unexpected character at position ${index}: "${source.slice(index, index + 10)}"`);
    index = pattern.lastIndex;
    const text = match[1];

    if (text === '(') tokens.push({ kind: 'lparen', text });
    else if (text === ')') tokens.push({ kind: 'rparen', text });
    else if (/^(>=|<=|==|!=|>|<)$/.test(text)) tokens.push({ kind: 'op', text });
    else if (text.startsWith("'")) tokens.push({ kind: 'string', text: text.slice(1, -1) });
    else if (/^-?\d/.test(text)) tokens.push({ kind: 'number', text });
    else if (/^(AND|OR|NOT)$/i.test(text)) tokens.push({ kind: text.toLowerCase() as 'and' | 'or' | 'not', text });
    else if (/^(true|false)$/i.test(text)) tokens.push({ kind: 'bool', text: text.toLowerCase() });
    else tokens.push({ kind: 'ident', text });
  }
  return tokens;
};

export class FraudRuleParser {
  private tokens: Token[] = [];
  private position = 0;

  parse(source: string): Expression {
    this.tokens = tokenize(source);
    this.position = 0;
    if (this.tokens.length === 0) throw new RuleSyntaxError('Rule is empty');
    const expression = this.parseOr();
    if (this.position < this.tokens.length) throw new RuleSyntaxError(`Unexpected token "${this.tokens[this.position].text}"`);
    return expression;
  }

  private parseOr(): Expression {
    let left = this.parseAnd();
    while (this.peek()?.kind === 'or') {
      this.position++;
      left = new OrExpression(left, this.parseAnd());
    }
    return left;
  }

  private parseAnd(): Expression {
    let left = this.parseNot();
    while (this.peek()?.kind === 'and') {
      this.position++;
      left = new AndExpression(left, this.parseNot());
    }
    return left;
  }

  private parseNot(): Expression {
    if (this.peek()?.kind === 'not') {
      this.position++;
      return new NotExpression(this.parseNot());
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Expression {
    if (this.peek()?.kind === 'lparen') {
      this.position++;
      const inner = this.parseOr();
      this.expect('rparen');
      return inner;
    }
    const variable = this.expect('ident').text;
    const operator = this.expect('op').text as Operator;
    const valueToken = this.advance();
    if (!valueToken) throw new RuleSyntaxError(`Missing value after "${variable} ${operator}"`);

    switch (valueToken.kind) {
      case 'number': return new ComparisonExpression(variable, operator, Number(valueToken.text));
      case 'string': return new ComparisonExpression(variable, operator, valueToken.text);
      case 'bool': return new ComparisonExpression(variable, operator, valueToken.text === 'true');
      default: throw new RuleSyntaxError(`Expected a value but found "${valueToken.text}"`);
    }
  }

  private peek(): Token | undefined { return this.tokens[this.position]; }
  private advance(): Token | undefined { return this.tokens[this.position++]; }
  private expect(kind: Token['kind']): Token {
    const token = this.advance();
    if (!token || token.kind !== kind) throw new RuleSyntaxError(`Expected ${kind} but found "${token?.text ?? 'end of rule'}"`);
    return token;
  }
}
