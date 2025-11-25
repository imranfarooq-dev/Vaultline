import { CurrencyRegistry } from './currency.flyweight';
import { ReferenceNumberGenerator } from './reference-number.singleton';

describe('Singleton: ReferenceNumberGenerator', () => {
  beforeEach(() => ReferenceNumberGenerator.resetForTesting());

  it('always returns the very same instance', () => {
    expect(ReferenceNumberGenerator.getInstance()).toBe(ReferenceNumberGenerator.getInstance());
  });

  it('hands out unique, increasing references from the shared sequence', () => {
    const a = ReferenceNumberGenerator.getInstance().next('TXN');
    const b = ReferenceNumberGenerator.getInstance().next('TXN');
    expect(a).not.toEqual(b);
    expect(a).toMatch(/^TXN-\d{8}-[A-Z0-9]{4}-000001[A-Z0-9]{2}$/);
    expect(b).toContain('-000002');
  });

  it('cannot be constructed with new (private constructor)', () => {
    // @ts-expect-error the constructor is private: this line would not compile
    const attempt = () => new ReferenceNumberGenerator();
    expect(attempt).toBeDefined();
  });
});

describe('Flyweight: CurrencyRegistry', () => {
  it('returns the same shared object for the same currency code', () => {
    const registry = new CurrencyRegistry();
    const first = registry.get('PKR');
    const again = registry.get('pkr');
    expect(first).toBe(again);
  });

  it('keeps one object per currency no matter how many amounts are formatted', () => {
    const registry = new CurrencyRegistry();
    for (let i = 0; i < 10_000; i++) registry.get(i % 2 ? 'PKR' : 'USD').format(i);
    expect(registry.sharedInstanceCount).toBe(2);
  });

  it('formats the extrinsic amount with the intrinsic currency data', () => {
    expect(new CurrencyRegistry().get('PKR').format(125050)).toBe('Rs 1,250.50');
  });

  it('shared objects are immutable', () => {
    const pkr = new CurrencyRegistry().get('PKR');
    expect(() => Object.assign(pkr, { symbol: 'X' })).toThrow();
  });
});
