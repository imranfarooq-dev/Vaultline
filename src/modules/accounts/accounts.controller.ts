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

  @Get()
  @ApiQuery({ name: 'ownerName', required: false })
  async list(@Query('ownerName') ownerName?: string) {
    return (await this.service.list(ownerName)).map((a) => this.service.present(a));
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.present(await this.service.findById(id));
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'STATE: activate / freeze / unfreeze / close' })
  async changeStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeStatusDto) {
    return this.service.present(await this.service.changeStatus(id, dto.action));
  }
}
