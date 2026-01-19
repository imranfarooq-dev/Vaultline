import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OpenAccountDto } from '../accounts/dto/account.dto';
import { BankingFacade } from './banking.facade';

@ApiTags('Banking (Facade)')
@Controller('banking')
export class BankingController {
  constructor(private readonly facade: BankingFacade) {}
}
