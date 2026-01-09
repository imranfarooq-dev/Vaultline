import { Body, Controller, Get, Inject, Param, ParseIntPipe, ParseUUIDPipe, Post, Query, Res, DefaultValuePipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { DepositCommand, TransferCommand, WithdrawCommand, CommandInvoker } from './commands/bank.commands';
import { MoneyMovementDto, TransferDto } from './dto/transaction.dto';
import { LedgerService } from './ledger.service';
import { TransactionHistoryService } from './transaction-history.service';
import { MONEY_TRANSFER_SERVICE, MoneyTransferService } from './transfer/money-transfer.decorators';

@ApiTags('Transactions (Command, Chain of Responsibility, Decorator, Iterator)')
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly ledger: LedgerService,
    private readonly invoker: CommandInvoker,
    private readonly history: TransactionHistoryService,
    @Inject(MONEY_TRANSFER_SERVICE) private readonly transfers: MoneyTransferService,
  ) {}

  @Post('deposit')
  @ApiOperation({ summary: 'Deposit (runs as a Command, validated by the Chain)' })
  deposit(@Body() dto: MoneyMovementDto) {
    return this.invoker.run(new DepositCommand(this.ledger, dto.accountId, dto.amountMinor, dto.description));
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Withdraw (runs as a Command, validated by the Chain)' })
  withdraw(@Body() dto: MoneyMovementDto) {
    return this.invoker.run(new WithdrawCommand(this.ledger, dto.accountId, dto.amountMinor, dto.description));
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer through the decorated service: audit -> fraud -> fee -> ledger' })
  transfer(@Body() dto: TransferDto) {
    return this.invoker.run(new TransferCommand(this.transfers, this.ledger, dto));
  }

  @Get('commands')
  @ApiOperation({ summary: 'Command history kept by the invoker' })
  commands() {
    return this.invoker.list();
  }

  @Post('commands/:commandId/undo')
  @ApiOperation({ summary: 'Undo a command (writes reversal entries)' })
  undo(@Param('commandId', ParseUUIDPipe) commandId: string) {
    return this.invoker.undo(commandId);
  }

  @Post(':reference/reverse')
  @ApiOperation({ summary: 'Reverse any transaction by reference (works from any pod)' })
  reverse(@Param('reference') reference: string) {
    return this.ledger.reverse(reference);
  }

  @Get('accounts/:accountId')
  @ApiOperation({ summary: 'Most recent ledger entries' })
  recent(@Param('accountId', ParseUUIDPipe) accountId: string, @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number) {
    return this.history.recent(accountId, limit);
  }

  @Get('accounts/:accountId/export.csv')
  @ApiOperation({ summary: 'Stream full history as CSV using the Iterator (constant memory)' })
  async exportCsv(@Param('accountId', ParseUUIDPipe) accountId: string, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="ledger-${accountId}.csv"`);
    res.write('created_at,reference,type,amount_minor,balance_after_minor,description\n');

    const iterator = this.history.iterate(accountId, { pageSize: 500 });
    for await (const e of iterator) {
      res.write(`${e.createdAt.toISOString()},${e.reference},${e.type},${e.amountMinor},${e.balanceAfterMinor},"${e.description.replace(/"/g, '""')}"\n`);
    }
    res.end();
  }
}
