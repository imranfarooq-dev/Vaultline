import { Module } from '@nestjs/common';
import { CachingExchangeRateProxy, ExternalExchangeRateService } from './exchange-rate.proxy';
import { FxController } from './fx.controller';

@Module({
  controllers: [FxController],
  providers: [{ provide: CachingExchangeRateProxy, useFactory: () => new CachingExchangeRateProxy(new ExternalExchangeRateService()) }],
  exports: [CachingExchangeRateProxy],
})
export class FxModule {}
