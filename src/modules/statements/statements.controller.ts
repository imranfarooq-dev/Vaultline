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

  @Get(':accountId')
  @ApiOperation({ summary: 'Any statement type x any format: 2 x 3 combinations from 5 classes' })
  @ApiQuery({ name: 'type', enum: ['mini', 'detailed'], required: false })
  @ApiQuery({ name: 'format', enum: ['csv', 'json', 'text'], required: false })
  async statement(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Res() res: Response,
    @Query('type') type: 'mini' | 'detailed' = 'mini',
    @Query('format') format: 'csv' | 'json' | 'text' = 'text',
  ) {
    const StatementClass = STATEMENTS[type];
    const rendererFactory = RENDERERS[format];
    if (!StatementClass || !rendererFactory) throw new BusinessRuleError('type must be mini|detailed and format csv|json|text');

    const account = await this.accounts.findById(accountId);
    const lines: StatementLine[] = [];
    for await (const entry of this.history.iterate(accountId, { pageSize: 500 })) {
      lines.push({
        date: entry.createdAt.toISOString(),
        reference: entry.reference,
        type: entry.type,
        description: entry.description,
        amountMinor: entry.amountMinor,
        balanceAfterMinor: entry.balanceAfterMinor,
      });
    }

    const statement = new StatementClass(rendererFactory()); // <-- the bridge is assembled here
    const { contentType, body } = statement.generate({
      accountNumber: account.accountNumber,
      ownerName: account.ownerName,
      currency: this.currencies.get(account.currency),
      currentBalanceMinor: account.balanceMinor,
      lines,
    });
    res.type(contentType).send(body);
  }
}
