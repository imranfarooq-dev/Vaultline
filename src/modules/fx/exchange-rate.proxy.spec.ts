import { DependencyUnavailableError } from '../../common/errors/domain.errors';
import { CachingExchangeRateProxy, ExchangeRateProvider, ExternalExchangeRateService } from './exchange-rate.proxy';

describe('Proxy: caching exchange-rate provider', () => {
  it('behaves exactly like the real provider from the outside', async () => {
    const real = new ExternalExchangeRateService(0);
    const proxy = new CachingExchangeRateProxy(real);
    const direct = await real.getRate('USD', 'PKR');
    const viaProxy = await proxy.getRate('USD', 'PKR');
    expect(viaProxy.rate).toBe(direct.rate);
  });

  it('serves repeat lookups from cache without calling the provider', async () => {
    const real = new ExternalExchangeRateService(0);
    const proxy = new CachingExchangeRateProxy(real);
    expect((await proxy.getRate('USD', 'PKR')).source).toBe('provider');
    expect((await proxy.getRate('USD', 'PKR')).source).toBe('cache');
    expect(real.calls).toBe(1);
    expect(proxy.stats).toMatchObject({ hits: 1, misses: 1 });
  });
});
