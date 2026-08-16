import { describe, expect, it } from 'vitest';
import { findByIdOrSlug, slugify, uniqueSlug } from './slugs.js';
import { occupancyForShelf, occupancySummary } from './occupancy.js';
import { isPublishedShop, publicShops } from './listings.js';
import { Shop } from '../../types/index.js';

describe('slugs', () => {
  it('builds unique SEO slugs', () => {
    expect(slugify('Juma Mini Market — Mikocheni')).toBe('juma-mini-market-mikocheni');
    expect(uniqueSlug('Eye Level Bay', [])).toBe('eye-level-bay');
    expect(uniqueSlug('Eye Level Bay', ['eye-level-bay'])).toBe('eye-level-bay-2');
    expect(findByIdOrSlug([{ id: 'shelf_1', slug: 'dar-eye-level' }], 'dar-eye-level')?.id).toBe('shelf_1');
  });
});

describe('occupancy', () => {
  it('counts paid overlap inside a 30-day window and ignores unpaid drafts', () => {
    const row = occupancyForShelf({
      shelfId: 's1',
      windowStart: '2026-09-01',
      windowEnd: '2026-10-01',
      bookings: [
        { shelfId: 's1', startDate: '2026-09-01', endDate: '2026-09-16', status: 'ACTIVE' },
        { shelfId: 's1', startDate: '2026-09-20', endDate: '2026-09-25', status: 'PENDING_APPROVAL' },
        { shelfId: 'other', startDate: '2026-09-01', endDate: '2026-10-01', status: 'ACTIVE' },
      ],
    });
    expect(row.windowDays).toBe(30);
    expect(row.paidDays).toBe(15);
    expect(row.paidPercent).toBe(50);
    expect(row.reservedDays).toBe(20);
  });

  it('averages occupancy across shelves', () => {
    const summary = occupancySummary({
      windowStart: '2026-09-01',
      windowEnd: '2026-10-01',
      shelves: [{ id: 's1' }, { id: 's2' }],
      bookings: [{ shelfId: 's1', startDate: '2026-09-01', endDate: '2026-10-01', status: 'ACTIVE' }],
    });
    expect(summary.paidPercent).toBe(50);
  });
});

describe('soft delete', () => {
  it('hides archived shops from the public catalogue', () => {
    const live: Shop = {
      id: 'shop_1',
      hostId: 'h1',
      name: 'Live',
      description: 'desc',
      address: '1 Street',
      city: 'Dar es Salaam',
      region: 'Dar es Salaam',
      latitude: -6.7,
      longitude: 39.2,
      photos: ['x'],
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      listingStatus: 'PUBLISHED',
      shopType: 'SUPERMARKET',
      createdAt: '',
      updatedAt: '',
    };
    const archived = { ...live, id: 'shop_2', deletedAt: '2026-08-16T00:00:00.000Z' };
    expect(isPublishedShop(archived)).toBe(false);
    expect(publicShops([live, archived]).map((s) => s.id)).toEqual(['shop_1']);
  });
});
