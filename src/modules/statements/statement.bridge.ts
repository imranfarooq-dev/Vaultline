import { Currency } from '../core/currency.flyweight';

/**
 * ============================================================================
 * PATTERN: BRIDGE (Structural)
 * ============================================================================
 * Problem : We have 2 kinds of statement (Mini, Detailed) and 3 output formats
 *           (CSV, JSON, Text). With inheritance that's 6 classes
 *           (MiniCsvStatement, DetailedJsonStatement, ...). Add a PDF format and
 *           an Annual statement and it's 12. The classes multiply.
 * Solution: Split the two dimensions into two separate hierarchies and connect
 *           them with a reference (the "bridge"):
 *             ABSTRACTION     Statement  -> WHAT goes in the statement
 *             IMPLEMENTATION  Renderer   -> HOW it is written out
 *           2 statements + 3 renderers = 5 classes, combinable freely.
 *
 * Analogy : One TV remote design that works with Samsung, LG or Sony TVs.
 *           New remotes and new TV brands can be added independently.
 * ============================================================================
 */
export interface StatementLine {
  date: string;
  reference: string;
  type: string;
  description: string;
  amountMinor: number;
  balanceAfterMinor: number;
}

export interface StatementData {
  accountNumber: string;
  ownerName: string;
  currency: Currency;
  currentBalanceMinor: number;
  lines: StatementLine[]; // oldest first
}

/** Format-independent document produced by the abstraction. */
export interface StatementDocument {
  title: string;
  header: Record<string, string>;
  columns: string[];
  rows: string[][];
  summary: Record<string, string>;
}

// ===================== IMPLEMENTATION hierarchy =====================
export interface StatementRenderer {
  readonly contentType: string;
  render(document: StatementDocument): string;
}

export class CsvStatementRenderer implements StatementRenderer {
  readonly contentType = 'text/csv';
  render(d: StatementDocument): string {
    const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    return [d.columns, ...d.rows].map((row) => row.map(escape).join(',')).join('\n');
  }
}

export class JsonStatementRenderer implements StatementRenderer {
  readonly contentType = 'application/json';
  render(d: StatementDocument): string {
    const rows = d.rows.map((row) => Object.fromEntries(d.columns.map((c, i) => [c, row[i]])));
    return JSON.stringify({ title: d.title, header: d.header, summary: d.summary, rows }, null, 2);
  }
}

export class PlainTextStatementRenderer implements StatementRenderer {
  readonly contentType = 'text/plain';
  render(d: StatementDocument): string {
    const widths = d.columns.map((c, i) => Math.max(c.length, ...d.rows.map((r) => r[i].length)));
    const line = (cells: string[]) => cells.map((cell, i) => cell.padEnd(widths[i])).join('  ');
    return [
      d.title.toUpperCase(),
      ...Object.entries(d.header).map(([k, v]) => `${k}: ${v}`),
      '',
      line(d.columns),
      widths.map((w) => '-'.repeat(w)).join('  '),
      ...d.rows.map(line),
      '',
      ...Object.entries(d.summary).map(([k, v]) => `${k}: ${v}`),
    ].join('\n');
  }
}

// ===================== ABSTRACTION hierarchy =====================
export abstract class Statement {
  /** The bridge: the abstraction HAS-A renderer instead of IS-A format. */
  constructor(protected readonly renderer: StatementRenderer) {}

  generate(data: StatementData): { contentType: string; body: string } {
    return { contentType: this.renderer.contentType, body: this.renderer.render(this.compose(data)) };
  }

  protected abstract compose(data: StatementData): StatementDocument;

  protected header(data: StatementData): Record<string, string> {
    return { Account: data.accountNumber, Owner: data.ownerName, Currency: data.currency.code, Generated: new Date().toISOString() };
  }
}

/** Last 10 transactions, no summary maths. */
export class MiniStatement extends Statement {
  protected compose(data: StatementData): StatementDocument {
    const lines = data.lines.slice(-10);
    return {
      title: 'Mini statement',
      header: this.header(data),
      columns: ['date', 'reference', 'amount'],
      rows: lines.map((l) => [l.date.slice(0, 10), l.reference, data.currency.format(l.amountMinor)]),
      summary: { 'Available balance': data.currency.format(data.currentBalanceMinor) },
    };
  }
}

/** Every line plus opening/closing balance and totals. */
export class DetailedStatement extends Statement {
  protected compose(data: StatementData): StatementDocument {
    const credits = data.lines.filter((l) => l.amountMinor > 0).reduce((s, l) => s + l.amountMinor, 0);
    const debits = data.lines.filter((l) => l.amountMinor < 0).reduce((s, l) => s + l.amountMinor, 0);
    const first = data.lines[0];
    const opening = first ? first.balanceAfterMinor - first.amountMinor : data.currentBalanceMinor;
    const c = data.currency;

    return {
      title: 'Detailed statement',
      header: this.header(data),
      columns: ['date', 'reference', 'type', 'description', 'amount', 'balance'],
      rows: data.lines.map((l) => [l.date, l.reference, l.type, l.description, c.format(l.amountMinor), c.format(l.balanceAfterMinor)]),
      summary: {
        'Opening balance': c.format(opening),
        'Total credits': c.format(credits),
        'Total debits': c.format(debits),
        'Closing balance': c.format(data.currentBalanceMinor),
        Transactions: String(data.lines.length),
      },
    };
  }
}
