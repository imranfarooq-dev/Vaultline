import { Global, Module } from '@nestjs/common';
import { CurrencyRegistry } from './currency.flyweight';
import { ReferenceNumberGenerator } from './reference-number.singleton';

@Global()
@Module({
  providers: [
    // The classic singleton is handed to Nest as a ready-made value.
    { provide: ReferenceNumberGenerator, useValue: ReferenceNumberGenerator.getInstance() },
    CurrencyRegistry,
  ],
  exports: [ReferenceNumberGenerator, CurrencyRegistry],
})
export class CoreModule {}
