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
});
