import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'node:crypto';
import { In, Repository } from 'typeorm';
import { BusinessRuleError, NotFoundError } from '../../common/errors/domain.errors';
import { AccountEntity, AccountStatus, AccountType } from '../../database/entities';
import { CurrencyRegistry } from '../core/currency.flyweight';
import { DomainEventBus } from '../messaging/domain-event-bus.observer';
import { createEvent, EventTypes } from '../messaging/domain-events';
import { AccountProductCatalog } from './domain/account-product.prototype';
import { stateOf } from './domain/account-state';
import { accountCreatorFor } from './domain/account.factory';
import { MaintenanceFeeVisitor, RiskExposureVisitor, toElement, WithholdingTaxVisitor } from './domain/account.visitor';
import { InterestCalculator } from './domain/interest.strategy';
import { AccountLeaf, PortfolioGroup } from './domain/portfolio.composite';
import { OpenAccountDto } from './dto/account.dto';

@Injectable()
export class AccountsService {
  private readonly interest = new InterestCalculator();

  constructor(
    @InjectRepository(AccountEntity) private readonly accounts: Repository<AccountEntity>,
    private readonly currencies: CurrencyRegistry,
    private readonly catalog: AccountProductCatalog,
    private readonly events: DomainEventBus,
  ) {}

  /** FACTORY METHOD + PROTOTYPE + FLYWEIGHT working together. */
  async open(dto: OpenAccountDto): Promise<AccountEntity> {
    if (!this.currencies.isSupported(dto.currency)) {
      throw new BusinessRuleError(`Currency ${dto.currency} is not supported`, { supported: this.currencies.supportedCodes() });
    }

    const product = dto.productCode ? this.catalog.get(dto.productCode) : undefined;
    if (dto.productCode && !product) throw new NotFoundError(`Unknown product ${dto.productCode}`);

    const blueprint = accountCreatorFor(dto.type).open({
      ownerName: dto.ownerName,
      currency: dto.currency,
      initialDepositMinor: dto.initialDepositMinor ?? 0,
      product,
    });

    const { minimumOpeningBalanceMinor: _minimum, ...columns } = blueprint;
    const account = await this.accounts.save(this.accounts.create({ ...columns, accountNumber: this.newAccountNumber() }));

    await this.events.publish(
      createEvent(EventTypes.ACCOUNT_OPENED, {
        accountId: account.id,
        accountNumber: account.accountNumber,
        ownerName: account.ownerName,
        type: account.type,
        currency: account.currency,
      }),
    );
    return account;
  }

  async findById(id: string): Promise<AccountEntity> {
    const account = await this.accounts.findOneBy({ id });
    if (!account) throw new NotFoundError(`Account ${id} not found`);
    return account;
  }

  list(ownerName?: string): Promise<AccountEntity[]> {
    return this.accounts.find({ where: ownerName ? { ownerName } : {}, order: { createdAt: 'DESC' }, take: 100 });
  }

  /** STATE: the current state object decides whether the transition is legal. */
  async changeStatus(id: string, action: 'activate' | 'freeze' | 'unfreeze' | 'close'): Promise<AccountEntity> {
    const account = await this.findById(id);
    const current = stateOf(account.status);
    const next = action === 'close' ? current.close(account.balanceMinor) : current[action]();

    const from = account.status;
    account.status = next.status;
    const saved = await this.accounts.save(account); // @VersionColumn gives optimistic locking

    await this.events.publish(createEvent(EventTypes.ACCOUNT_STATUS_CHANGED, { accountId: id, from, to: next.status }));
    return saved;
  }

  /** COMPOSITE: build a tree of groups and accounts, then ask the root for totals. */
  async portfolio(ownerName: string) {
    const accounts = await this.accounts.find({ where: { ownerName, status: In([AccountStatus.ACTIVE, AccountStatus.FROZEN, AccountStatus.PENDING]) } });
    if (accounts.length === 0) throw new NotFoundError(`No accounts for ${ownerName}`);

    const everyday = new PortfolioGroup('Everyday banking');
    const savings = new PortfolioGroup('Savings');
    const investments = new PortfolioGroup('Investments');

    for (const account of accounts) {
      const leaf = new AccountLeaf(account);
      if (account.type === AccountType.CURRENT) everyday.add(leaf);
      else if (account.type === AccountType.SAVINGS) savings.add(leaf);
      else investments.add(leaf);
    }

    // A group inside a group: "Wealth" contains both savings and investments.
    const wealth = new PortfolioGroup('Wealth').add(savings, investments);
    const root = new PortfolioGroup(`${ownerName} - total relationship`).add(everyday, wealth);

    return {
      ...(root.toJSON() as object),
      formattedTotals: Object.entries(root.totals()).map(([code, minor]) => this.currencies.get(code).format(minor)),
    };
  }

  /** STRATEGY: the calculator picks an interest algorithm by account type. */
  async interestPreview(id: string) {
    const account = await this.findById(id);
    const { strategy, monthlyInterestMinor } = this.interest.calculate(account.type, account.balanceMinor, account.annualInterestRate);
    const currency = this.currencies.get(account.currency);
    return { accountId: id, type: account.type, strategy, annualRate: account.annualInterestRate, monthlyInterestMinor, formatted: currency.format(monthlyInterestMinor) };
  }

  /** VISITOR: three different reports over the same accounts, no changes to account classes. */
  async monthEndReport() {
    const accounts = await this.accounts.find({ where: { status: In([AccountStatus.ACTIVE, AccountStatus.FROZEN]) }, take: 1000 });
    const fee = new MaintenanceFeeVisitor();
    const tax = new WithholdingTaxVisitor();
    const risk = new RiskExposureVisitor();

    const rows = accounts.map((account) => {
      const element = toElement(account);
      return {
        accountNumber: account.accountNumber,
        type: account.type,
        maintenanceFeeMinor: element.accept(fee),
        withholdingTaxMinor: element.accept(tax),
        risk: element.accept(risk),
      };
    });

    return {
      accounts: rows.length,
      totalFeesMinor: rows.reduce((s, r) => s + r.maintenanceFeeMinor, 0),
      totalTaxMinor: rows.reduce((s, r) => s + r.withholdingTaxMinor, 0),
      highRisk: rows.filter((r) => r.risk === 'HIGH').length,
      rows,
    };
  }

  products() {
    return this.catalog.list();
  }

  /** FLYWEIGHT in use: every response formats through shared Currency objects. */
  present(account: AccountEntity) {
    const currency = this.currencies.get(account.currency);
    return { ...account, balanceFormatted: currency.format(account.balanceMinor), dailyLimitFormatted: currency.format(account.dailyWithdrawalLimitMinor) };
  }
}
