import { describe, it, expect, beforeEach } from '@jest/globals';

// We will import the factory after setting env vars in each test to ensure a fresh
// warnedOrigins Set is created per getCorsOptions() call.

describe('getCorsOptions origin callback', () => {
  beforeEach(() => {
    // ensure a predictable allow-list for tests
    process.env.ALLOWED_ORIGINS = 'http://allowed.test';
    delete process.env.COOKIE_DOMAIN;
  });

  it('allows origin that is in the ALLOWED_ORIGINS list', (done) => {
    // import only when env is set
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { getCorsOptions } = require('../../../config/dynamicCors');

    const opts = getCorsOptions();
    expect(opts).toBeDefined();

    const originFn = opts.origin as unknown as (o: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void;

    originFn('http://allowed.test', (err, allow) => {
      try {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      } catch (e) {
        done(e as Error);
      }
    });
  });

  it('denies unknown origin without passing an Error to the callback', (done) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { getCorsOptions } = require('../../../config/dynamicCors');

    const opts = getCorsOptions();
    const originFn = opts.origin as unknown as (o: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void;

    originFn('http://unknown.test', (err, allow) => {
      try {
        // The callback should be called with (null, false) — no Error object
        expect(err).toBeNull();
        expect(allow).toBe(false);
        done();
      } catch (e) {
        done(e as Error);
      }
    });
  });
});
