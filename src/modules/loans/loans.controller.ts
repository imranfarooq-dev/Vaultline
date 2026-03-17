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

  @Patch('drafts/:id')
  @ApiOperation({ summary: 'MEMENTO: change fields (a snapshot is saved first)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: LoanDraftDto) {
    return this.loans.updateDraft(id, dto);
  }

  @Post('drafts/:id/undo')
  @ApiOperation({ summary: 'MEMENTO: restore the previous snapshot' })
  undo(@Param('id', ParseUUIDPipe) id: string) {
    return this.loans.undoDraft(id);
  }

  @Post('drafts/:id/submit')
  @ApiOperation({ summary: 'BUILDER validates, MEDIATOR coordinates credit/affordability/compliance desks' })
  submit(@Param('id', ParseUUIDPipe) id: string) {
    return this.loans.submit(id);
  }

  @Get('credit-report/:name')
  @ApiOperation({ summary: 'ADAPTER: legacy bureau string -> clean CreditReport object' })
  creditReport(@Param('name') name: string) {
    return this.loans.creditReport(name);
  }

  @Get(':id')
  find(@Param('id', ParseUUIDPipe) id: string) {
    return this.loans.findById(id);
  }
}
