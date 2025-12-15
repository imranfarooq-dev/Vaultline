import { AccountEntity } from '../../../database/entities';

/**
 * ============================================================================
 * PATTERN: COMPOSITE (Structural)
 * ============================================================================
 * Problem : A customer's wealth is a TREE: a portfolio contains groups
 *           ("Everyday banking", "Investments"), groups contain accounts,
 *           and a group can contain other groups. Code that asks
 *           "what's the total?" should not care whether it holds one account
 *           or a whole tree.
 * Solution: Leaves (accounts) and composites (groups) share ONE interface.
 *           A group's total is simply the sum of its children's totals.
 *
 * Analogy : Folders and files. "Size" works on a single file or a folder full
 *           of folders; you use the same action either way.
 * ============================================================================
 */
export interface PortfolioComponent {
  readonly name: string;
  /** Totals per currency, e.g. { PKR: 1200000, USD: 50000 } */
  totals(): Record<string, number>;
  accountCount(): number;
  toJSON(): unknown;
}

export class AccountLeaf implements PortfolioComponent {
  constructor(private readonly account: AccountEntity) {}

  get name(): string {
    return `${this.account.type} ${this.account.accountNumber}`;
  }
  totals(): Record<string, number> {
    return { [this.account.currency]: this.account.balanceMinor };
  }
  accountCount(): number {
    return 1;
  }
  toJSON() {
    return { kind: 'account', name: this.name, status: this.account.status, totals: this.totals() };
  }
}

export class PortfolioGroup implements PortfolioComponent {
  private readonly children: PortfolioComponent[] = [];

  constructor(readonly name: string) {}

  add(...components: PortfolioComponent[]): this {
    this.children.push(...components);
    return this;
  }

  totals(): Record<string, number> {
    return this.children.reduce<Record<string, number>>((sum, child) => {
      for (const [currency, amount] of Object.entries(child.totals())) {
        sum[currency] = (sum[currency] ?? 0) + amount;
      }
      return sum;
    }, {});
  }

  accountCount(): number {
    return this.children.reduce((count, child) => count + child.accountCount(), 0);
  }

  toJSON() {
    return { kind: 'group', name: this.name, accounts: this.accountCount(), totals: this.totals(), children: this.children.map((c) => c.toJSON()) };
  }
}
