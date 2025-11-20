import { CurrencyRegistry } from './currency.flyweight';
import { ReferenceNumberGenerator } from './reference-number.singleton';

describe('Singleton: ReferenceNumberGenerator', () => {
  beforeEach(() => ReferenceNumberGenerator.resetForTesting());

  it('always returns the very same instance', () => {
    expect(ReferenceNumberGenerator.getInstance()).toBe(ReferenceNumberGenerator.getInstance());
  });
});
