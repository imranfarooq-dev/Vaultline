import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OpenAccountDto } from '../accounts/dto/account.dto';
import { BankingFacade } from './banking.facade';

@ApiTags('Banking (Facade)')
@Controller('banking')
export class BankingController {
  constructor(private readonly facade: BankingFacade) {}

  @Post('onboard')
  @ApiOperation({ summary: 'One call: open + deposit + activate + events (with rollback)' })
  onboard(@Body() dto: OpenAccountDto) {
    return this.facade.onboardCustomer({ ...dto, initialDepositMinor: dto.initialDepositMinor ?? 0 });
  }

  @Get('customers/:ownerName/overview')
  @ApiOperation({ summary: 'Customer 360: portfolio + recent activity in one call' })
  overview(@Param('ownerName') ownerName: string) {
    return this.facade.customerOverview(ownerName);
  }
}
