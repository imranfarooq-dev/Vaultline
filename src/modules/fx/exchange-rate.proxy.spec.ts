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

  it('expires entries after the TTL', async () => {
    jest.useFakeTimers({ now: 0, doNotFake: ['setTimeout'] });
    const real = new ExternalExchangeRateService(0);
    const proxy = new CachingExchangeRateProxy(real, 1000);
    await proxy.getRate('EUR', 'PKR');
    jest.setSystemTime(1500);
    await proxy.getRate('EUR', 'PKR');
    expect(real.calls).toBe(2);
    jest.useRealTimers();
  });

  it('serves a stale rate when the provider fails', async () => {
    let fail = false;
    const flaky: ExchangeRateProvider = {
      getRate: async (from, to) => {
        if (fail) throw new Error('timeout');
        return { from, to, rate: 2, asOf: 'x' };
      },
    };
    const proxy = new CachingExchangeRateProxy(flaky, -1); // TTL -1: every call is a miss
    await proxy.getRate('A', 'B');
    fail = true;
    expect(await proxy.getRate('A', 'B')).toMatchObject({ rate: 2, source: 'stale-cache' });
  });
});
