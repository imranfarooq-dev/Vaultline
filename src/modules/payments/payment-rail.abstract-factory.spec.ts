import { quotePayment, RaastPaymentFactory, railFactoryFor, SwiftPaymentFactory } from './payment-rail.abstract-factory';

describe('Abstract Factory: payment rails', () => {
  const domestic = { amountMinor: 5_000_000, currency: 'PKR', beneficiaryName: 'Bilal', beneficiaryIban: 'PK36SCBL0000001123456702' };
  const international = { amountMinor: 10_000_000, currency: 'USD', beneficiaryName: 'Bilal', beneficiaryIban: 'DE89370400440532013000', beneficiaryBic: 'DEUTDEFF', purpose: 'Tuition' };

  it('selects the factory for a rail', () => {
    expect(railFactoryFor('RAAST')).toBeInstanceOf(RaastPaymentFactory);
    expect(railFactoryFor('SWIFT')).toBeInstanceOf(SwiftPaymentFactory);
  });
});
