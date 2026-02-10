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
