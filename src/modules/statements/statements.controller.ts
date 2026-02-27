import { Controller, Get, Param, ParseUUIDPipe, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { BusinessRuleError } from '../../common/errors/domain.errors';
import { AccountsService } from '../accounts/accounts.service';
import { CurrencyRegistry } from '../core/currency.flyweight';
import { TransactionHistoryService } from '../transactions/transaction-history.service';
import { RENDERERS, STATEMENTS, StatementLine } from './statement.bridge';

@ApiTags('Statements (Bridge, Iterator)')
@Controller('statements')
export class StatementsController {
  constructor(
    private readonly accounts: AccountsService,
    private readonly history: TransactionHistoryService,
    private readonly currencies: CurrencyRegistry,
  ) {}
}
