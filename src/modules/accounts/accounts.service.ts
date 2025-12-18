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
}
