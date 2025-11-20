import { CurrencyRegistry } from './currency.flyweight';
import { ReferenceNumberGenerator } from './reference-number.singleton';

describe('Singleton: ReferenceNumberGenerator', () => {
  beforeEach(() => ReferenceNumberGenerator.resetForTesting());
});
