import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { ChangeStatusDto, OpenAccountDto } from './dto/account.dto';

@ApiTags('Accounts (Factory Method, Prototype, State, Strategy, Visitor, Composite, Flyweight)')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly service: AccountsService) {}

  @Get('products')
  @ApiOperation({ summary: 'PROTOTYPE: products cloned from a few base prototypes' })
  products() {
    return this.service.products();
  }

  @Get('currencies')
  @ApiOperation({ summary: 'FLYWEIGHT: how many shared Currency objects exist' })
  currencies() {
    return this.service.currencyStats();
  }

  @Get('reports/month-end')
  @ApiOperation({ summary: 'VISITOR: fee, tax and risk reports over all accounts' })
  monthEnd() {
    return this.service.monthEndReport();
  }

  @Get('portfolio/:ownerName')
  @ApiOperation({ summary: 'COMPOSITE: tree of groups and accounts with rolled-up totals' })
  portfolio(@Param('ownerName') ownerName: string) {
    return this.service.portfolio(ownerName);
  }

  @Post()
  @ApiOperation({ summary: 'FACTORY METHOD: open an account (status PENDING)' })
  async open(@Body() dto: OpenAccountDto) {
    return this.service.present(await this.service.open(dto));
  }
}
