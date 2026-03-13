import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoanDraftDto } from './dto/loan.dto';
import { LoansService } from './loans.service';

@ApiTags('Loans (Builder, Memento, Mediator, Adapter)')
@Controller('loans')
export class LoansController {
  constructor(private readonly loans: LoansService) {}

  @Post('drafts')
  @ApiOperation({ summary: 'Start a loan draft' })
  create(@Body() dto: LoanDraftDto) {
    return this.loans.createDraft(dto);
  }

  @Get('drafts/:id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.loans.getDraft(id);
  }
}
