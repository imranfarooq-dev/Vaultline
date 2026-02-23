import { quotePayment, RaastPaymentFactory, railFactoryFor, SwiftPaymentFactory } from './payment-rail.abstract-factory';

describe('Abstract Factory: payment rails', () => {
  const domestic = { amountMinor: 5_000_000, currency: 'PKR', beneficiaryName: 'Bilal', beneficiaryIban: 'PK36SCBL0000001123456702' };
  const international = { amountMinor: 10_000_000, currency: 'USD', beneficiaryName: 'Bilal', beneficiaryIban: 'DE89370400440532013000', beneficiaryBic: 'DEUTDEFF', purpose: 'Tuition' };

  it('selects the factory for a rail', () => {
    expect(railFactoryFor('RAAST')).toBeInstanceOf(RaastPaymentFactory);
    expect(railFactoryFor('SWIFT')).toBeInstanceOf(SwiftPaymentFactory);
  });

  it('RAAST family: free, instant, JSON message', () => {
    const quote = quotePayment(new RaastPaymentFactory(), domestic, 'PAY-1');
    expect(quote).toMatchObject({ rail: 'RAAST', valid: true, feeMinor: 0, settlementTime: 'Instant (seconds)' });
    expect(JSON.parse((quote as { message: string }).message)).toMatchObject({ scheme: 'RAAST', msgId: 'PAY-1', amount: '50000.00' });
  });

  it('SWIFT family: flat + percentage fee, MT103-style message', () => {
    const quote = quotePayment(new SwiftPaymentFactory(), international, 'PAY-2') as { feeMinor: number; message: string };
    expect(quote.feeMinor).toBe(250_000 + 10_000);
    expect(quote.message).toContain(':20:PAY-2');
    expect(quote.message).toContain(':57A:DEUTDEFF');
  });

  it('each family validates with its own rules', () => {
    expect(quotePayment(new RaastPaymentFactory(), international, 'X')).toMatchObject({ valid: false, errors: expect.arrayContaining(['RAAST only supports PKR']) });
    expect(quotePayment(new SwiftPaymentFactory(), domestic, 'X')).toMatchObject({ valid: false, errors: expect.arrayContaining(['A valid BIC/SWIFT code is required']) });
  });

  it('client code works with any factory through the interfaces only', () => {
    for (const factory of [new RaastPaymentFactory(), new SwiftPaymentFactory()]) {
      expect(typeof factory.createValidator().validate).toBe('function');
      expect(typeof factory.createFeeCalculator().feeMinor).toBe('function');
      expect(typeof factory.createMessageFormatter().format).toBe('function');
    }
  });
});
