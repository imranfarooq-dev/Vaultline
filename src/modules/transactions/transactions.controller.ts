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
}
