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
