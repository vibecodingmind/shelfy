import { describe, expect, it } from 'vitest';
import { quoteCancellation } from './cancellation.js';
import { haversineMeters, gpsWithinRadius } from './gps.js';
import { isPublishedShop, isPublishedShelf, listingStatusOf, publicShelves } from './listings.js';
import { quoteWithdrawal } from './withdrawals.js';
import { isDataUrlImage, tickBookingStatuses } from './operations.js';
import { refundCapturedPostings } from './ledger.js';
import { canTransition } from './bookingMachine.js';
import { Shop, Shelf } from '../../types/index.js';

const shop = (partial: Partial<Shop> = {}): Shop => ({
  id: 'shop_1',
  hostId: 'h1',
  name: 'Test Shop',
  description: '',
  address: '1 Street',
  city: 'Dar es Salaam',
  region: 'Dar es Salaam',
  latitude: -6.7644,
  longitude: 39.2483,
  photos: [],
  status: 'ACTIVE',
  verificationStatus: 'VERIFIED',
  listingStatus: 'PUBLISHED',
  shopType: 'SUPERMARKET',
  createdAt: '',
  updatedAt: '',
  ...partial,
});

const shelf = (partial: Partial<Shelf> = {}): Shelf => ({
  id: 'shelf_1',
  shopId: 'shop_1',
  name: 'Bay',
  description: '',
  widthCm: 100,
  heightCm: 40,
  depthCm: 40,
  shelfType: 'EYE_LEVEL',
  locationInsideShop: 'Aisle',
  monthlyPriceTzs: 50000,
  availabilityStatus: 'AVAILABLE',
  allowedCategories: [],
  photos: [],
  status: 'ACTIVE',
  verificationStatus: 'VERIFIED',
  listingStatus: 'PUBLISHED',
  createdAt: '',
  updatedAt: '',
  ...partial,
});

describe('cancellation quotes', () => {
  const base = {
    totalPriceTzs: 100000,
    platformFeeTzs: 10000,
    hostEarningsTzs: 90000,
    startDate: '2026-09-01',
    now: new Date('2026-08-01T00:00:00.000Z'),
  };

  it('cancels unpaid bookings with no money movement', () => {
    const quote = quoteCancellation({ ...base, status: 'PAYMENT_PENDING', paymentStatus: 'PENDING', actor: 'VENDOR' });
    expect(quote.allowed).toBe(true);
    expect(quote.moneyMoved).toBe(false);
    expect(quote.refundVendorTzs).toBe(0);
  });

  it('fully refunds PAID bookings that are not yet active', () => {
    const quote = quoteCancellation({ ...base, status: 'PAID', paymentStatus: 'PAID', actor: 'VENDOR' });
    expect(quote.refundVendorTzs).toBe(100000);
    expect(quote.reverseHostTzs).toBe(90000);
  });

  it('applies the 10% fee when cancelling an unused active booking', () => {
    const quote = quoteCancellation({ ...base, status: 'ACTIVE', paymentStatus: 'PAID', actor: 'VENDOR' });
    expect(quote.refundVendorTzs).toBe(90000);
    expect(quote.cancellationFeeTzs).toBe(10000);
    expect(quote.reverseHostTzs).toBe(90000);
  });

  it('keeps host earnings after the free-cancel window', () => {
    const quote = quoteCancellation({
      ...base,
      status: 'ACTIVE',
      paymentStatus: 'PAID',
      actor: 'VENDOR',
      now: new Date('2026-08-28T00:00:00.000Z'),
    });
    expect(quote.refundVendorTzs).toBe(0);
    expect(quote.hostKeepsTzs).toBe(90000);
  });

  it('refunds 100% when the host cancels after payment', () => {
    const quote = quoteCancellation({ ...base, status: 'ACTIVE', paymentStatus: 'PAID', actor: 'HOST' });
    expect(quote.refundVendorTzs).toBe(100000);
  });
});

describe('listings', () => {
  it('hides draft shelves from the public catalogue', () => {
    const published = shop();
    const draft = shelf({ listingStatus: 'DRAFT', verificationStatus: 'PENDING' });
    expect(isPublishedShop(published)).toBe(true);
    expect(isPublishedShelf(draft, published)).toBe(false);
    expect(publicShelves([draft], [published]).length).toBe(0);
    expect(listingStatusOf({ verificationStatus: 'VERIFIED' })).toBe('PUBLISHED');
  });

  it('hides rejected shelves even when the shop is verified', () => {
    const published = shop();
    const rejected = shelf({ listingStatus: 'REJECTED', verificationStatus: 'REJECTED' });
    expect(isPublishedShelf(rejected, published)).toBe(false);
    expect(publicShelves([rejected, shelf()], [published]).length).toBe(1);
  });
});

describe('host cancellation rights', () => {
  it('lets a host cancel a paid booking', () => {
    expect(canTransition('PAID', 'CANCELLED', 'HOST')).toBe(true);
    expect(canTransition('ACTIVE', 'CANCELLED', 'HOST')).toBe(true);
  });
});

describe('gps', () => {
  it('accepts a check-in at the shop and rejects a far coordinate', () => {
    expect(haversineMeters(-6.7644, 39.2483, -6.7644, 39.2483)).toBe(0);
    expect(gpsWithinRadius({ shopLat: -6.7644, shopLng: 39.2483, userLat: -6.7645, userLng: 39.2484 }).ok).toBe(true);
    expect(gpsWithinRadius({ shopLat: -6.7644, shopLng: 39.2483, userLat: -6.8, userLng: 39.3 }).ok).toBe(false);
  });
});

describe('withdrawals', () => {
  it('blocks pending money, sub-minimum amounts, and duplicate in-flight requests', () => {
    expect(quoteWithdrawal({ amountTzs: 10000, availableTzs: 90000, minWithdrawalTzs: 20000, existing: [] }).ok).toBe(false);
    expect(quoteWithdrawal({ amountTzs: 50000, availableTzs: 10000, minWithdrawalTzs: 20000, existing: [] }).ok).toBe(false);
    expect(
      quoteWithdrawal({
        amountTzs: 25000,
        availableTzs: 90000,
        minWithdrawalTzs: 20000,
        existing: [{ id: 'w1', hostId: 'h', amountTzs: 1, method: 'MOBILE_MONEY', status: 'PENDING', createdAt: '', updatedAt: '' }],
      }).ok
    ).toBe(false);
    expect(quoteWithdrawal({ amountTzs: 25000, availableTzs: 90000, minWithdrawalTzs: 20000, existing: [] }).ok).toBe(true);
  });
});

describe('operations', () => {
  it('expires and completes bookings on the schedule', () => {
    const changes = tickBookingStatuses({
      now: new Date('2026-10-03T12:00:00.000Z'),
      graceHours: 24,
      bookings: [
        {
          id: 'b1',
          vendorId: 'v',
          shelfId: 's',
          hostId: 'h',
          startDate: '2026-08-01',
          endDate: '2026-10-01',
          durationMonths: 2,
          monthlyPriceTzs: 1,
          totalPriceTzs: 1,
          platformFeeTzs: 0,
          hostEarningsTzs: 1,
          status: 'ACTIVE',
          paymentStatus: 'PAID',
          createdAt: '',
          updatedAt: '',
        },
      ],
    });
    expect(changes[0]?.to).toBe('COMPLETED');
    expect(changes[0]?.releaseHost).toBe(true);
  });

  it('rejects oversized or non-image uploads', () => {
    expect(isDataUrlImage('data:text/plain;base64,abc').ok).toBe(false);
    expect(isDataUrlImage('data:image/png;base64,iVBORw0KGgo=').ok).toBe(true);
  });
});

describe('refund postings', () => {
  it('balances a 90% refund with a cancellation fee', () => {
    const posts = refundCapturedPostings({
      vendorId: 'v',
      hostId: 'h',
      refundVendorTzs: 90000,
      reverseHostTzs: 90000,
      reverseCommissionTzs: 10000,
      cancellationFeeTzs: 10000,
      hostShareAlreadyReleased: false,
    });
    const debit = posts.filter((p) => p.direction === 'DEBIT').reduce((s, p) => s + p.amountTzs, 0);
    const credit = posts.filter((p) => p.direction === 'CREDIT').reduce((s, p) => s + p.amountTzs, 0);
    expect(debit).toBe(credit);
  });
});
