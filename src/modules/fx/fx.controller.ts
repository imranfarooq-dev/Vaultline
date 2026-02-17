import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrencyRegistry } from '../core/currency.flyweight';
import { CachingExchangeRateProxy } from './exchange-rate.proxy';

@ApiTags('FX (Proxy)')
@Controller('fx')
export class FxController {
  constructor(private readonly rates: CachingExchangeRateProxy, private readonly currencies: CurrencyRegistry) {}
}
