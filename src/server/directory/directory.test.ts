import { describe, expect, it } from 'vitest';
import { normalizePlaceId } from './directoryStore.js';

describe('directoryStore', () => {
  it('normalizes place ids', () => {
    expect(normalizePlaceId('places/ChIJxyz')).toBe('ChIJxyz');
    expect(normalizePlaceId('ChIJxyz')).toBe('ChIJxyz');
  });
});
