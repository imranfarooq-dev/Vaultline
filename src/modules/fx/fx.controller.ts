import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrencyRegistry } from '../core/currency.flyweight';
import { CachingExchangeRateProxy } from './exchange-rate.proxy';

@ApiTags('FX (Proxy)')
@Controller('fx')
export class FxController {
  constructor(private readonly rates: CachingExchangeRateProxy, private readonly currencies: CurrencyRegistry) {}

  @Get('convert')
  @ApiOperation({ summary: 'Call twice: the first is slow (provider), the second instant (cache)' })
  @ApiQuery({ name: 'from', example: 'USD' })
  @ApiQuery({ name: 'to', example: 'PKR' })
  @ApiQuery({ name: 'amountMinor', example: 10000 })
  async convert(@Query('from') from: string, @Query('to') to: string, @Query('amountMinor', ParseIntPipe) amountMinor: number) {
    const started = Date.now();
    const rate = await this.rates.getRate(from.toUpperCase(), to.toUpperCase());
    const convertedMinor = Math.round(amountMinor * rate.rate);
    return {
      ...rate,
      amount: this.currencies.get(rate.from).format(amountMinor),
      converted: this.currencies.get(rate.to).format(convertedMinor),
      convertedMinor,
      tookMs: Date.now() - started,
      proxyStats: this.rates.stats,
    };
  }
}
