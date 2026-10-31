import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { decryptSecret, encryptSecret, maskSecret } from './encryption.js';

describe('integration encryption', () => {
  const prev = process.env.INTEGRATION_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.INTEGRATION_ENCRYPTION_KEY = 'a'.repeat(64);
  });

  afterEach(() => {
    process.env.INTEGRATION_ENCRYPTION_KEY = prev;
  });

  it('round-trips secrets', () => {
    const { ciphertext, iv, tag } = encryptSecret('secret-value-123');
    expect(decryptSecret(ciphertext, iv, tag)).toBe('secret-value-123');
  });

  it('masks secrets for display', () => {
    expect(maskSecret('abcdefghij')).toBe('****ghij');
  });
});
