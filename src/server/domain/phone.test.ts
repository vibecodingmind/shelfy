import { describe, expect, it } from 'vitest';
import { normalizeTzPhone } from './phone.js';

describe('normalizeTzPhone', () => {
  it('accepts common Tanzania formats', () => {
    expect(normalizeTzPhone('0754123456')).toBe('+255754123456');
    expect(normalizeTzPhone('+255 754 123 456')).toBe('+255754123456');
    expect(normalizeTzPhone('255754123456')).toBe('+255754123456');
  });

  it('rejects invalid numbers', () => {
    expect(normalizeTzPhone('123')).toBeNull();
    expect(normalizeTzPhone('')).toBeNull();
  });
});
