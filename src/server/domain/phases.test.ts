import { describe, expect, it } from 'vitest';
import { vendorAnalytics, hostAnalytics } from './analytics.js';
import { canRenewBooking, quoteRenewal } from './renewals.js';
import { buildBookingReceipt, bookingsToCsv } from './exports.js';
import { suggestDynamicPrice } from './dynamicPricing.js';
import { shelfMatchesSearch } from './savedSearches.js';
import { Booking, SavedSearch, Shelf } from '../../types/index.js';

describe('phase domain modules', () => {
  const booking: Booking = {
    id: 'bk_test',
    vendorId: 'usr_vendor_1',
    shelfId: 'sh_1',
    hostId: 'usr_host_1',
    startDate: '2026-01-01',
    endDate: '2026-02-01',
    durationMonths: 1,
    monthlyPriceTzs: 50000,
    totalPriceTzs: 50000,
    platformFeeTzs: 5000,
    hostEarningsTzs: 45000,
    status: 'ACTIVE',
    paymentStatus: 'PAID',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('computes vendor analytics', () => {
    const stats = vendorAnalytics('usr_vendor_1', { bookings: [booking] });
    expect(stats.totalBookings).toBe(1);
    expect(stats.activeBookings).toBe(1);
  });

  it('allows renewal for paid active booking', () => {
    expect(canRenewBooking(booking).ok).toBe(true);
    const quote = quoteRenewal({ booking, durationMonths: 2, commissionPercentage: 10 });
    expect(quote.quote.durationMonths).toBe(2);
  });

  it('builds receipt and csv export', () => {
    const receipt = buildBookingReceipt({ booking });
    expect(receipt.receiptNumber).toMatch(/^RCP-/);
    const csv = bookingsToCsv([booking]);
    expect(csv).toContain('bk_test');
  });

  it('suggests dynamic pricing', () => {
    const shelf: Shelf = {
      id: 'sh_1',
      shopId: 'shop_1',
      name: 'Eye Level',
      description: 'Prime',
      widthCm: 100,
      heightCm: 100,
      depthCm: 30,
      shelfType: 'EYE_LEVEL',
      locationInsideShop: 'Aisle 1',
      monthlyPriceTzs: 80000,
      availabilityStatus: 'AVAILABLE',
      allowedCategories: ['Snacks'],
      photos: [],
      status: 'ACTIVE',
      listingStatus: 'PUBLISHED',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const suggestion = suggestDynamicPrice({ shelf, bookings: [booking] });
    expect(suggestion.suggestedPriceTzs).toBeGreaterThan(0);
  });

  it('matches saved search filters', () => {
    const shelf: Shelf = {
      id: 'sh_2',
      shopId: 'shop_1',
      shopCity: 'Dar es Salaam',
      name: 'Counter',
      description: 'Snacks display',
      widthCm: 80,
      heightCm: 80,
      depthCm: 30,
      shelfType: 'COUNTER_DISPLAY',
      locationInsideShop: 'Checkout',
      monthlyPriceTzs: 60000,
      availabilityStatus: 'AVAILABLE',
      allowedCategories: ['Snacks'],
      photos: [],
      status: 'ACTIVE',
      listingStatus: 'PUBLISHED',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const search: SavedSearch = {
      id: 'ss_1',
      userId: 'usr_vendor_1',
      name: 'DSM Snacks',
      city: 'Dar',
      category: 'Snacks',
      maxPriceTzs: 100000,
      alertsEnabled: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    expect(shelfMatchesSearch(shelf, search)).toBe(true);
  });

  it('host analytics returns pending count', () => {
    const pending = { ...booking, id: 'bk_p', status: 'PENDING_APPROVAL' as const };
    const stats = hostAnalytics('usr_host_1', {
      bookings: [booking, pending],
      shelves: [{ ...({} as Shelf), id: 'sh_1', shopId: 's1' }],
      ledgerAccounts: [],
      ledgerEntries: [],
      withdrawals: [],
    });
    expect(stats.pendingApprovals).toBe(1);
  });
});
