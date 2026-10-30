import { describe, expect, it } from 'vitest';
import { amountsMatch, azamPayConfigured, mapAzamPayCallbackStatus } from './azampay.js';

describe('azampay', () => {
  it('maps callback statuses', () => {
    expect(mapAzamPayCallbackStatus({ transactionstatus: 'success' })).toBe('PAID');
    expect(mapAzamPayCallbackStatus({ success: true })).toBe('PAID');
    expect(mapAzamPayCallbackStatus({ transactionstatus: 'failed' })).toBe('FAILED');
    expect(mapAzamPayCallbackStatus({})).toBe('PENDING');
  });

  it('matches TZS amounts', () => {
    expect(amountsMatch(100_000, '100000')).toBe(true);
    expect(amountsMatch(100_000, 100_000)).toBe(true);
    expect(amountsMatch(100_000, 100_001)).toBe(false);
  });

  it('detects configuration from env', () => {
    expect(
      azamPayConfigured({
        AZAMPAY_APP_NAME: 'Shelfy',
        AZAMPAY_CLIENT_ID: 'id',
        AZAMPAY_CLIENT_SECRET: 'secret',
      } as NodeJS.ProcessEnv)
    ).toBe(true);
    expect(azamPayConfigured({} as NodeJS.ProcessEnv)).toBe(false);
  });
});
