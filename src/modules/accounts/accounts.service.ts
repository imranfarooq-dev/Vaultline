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
}
