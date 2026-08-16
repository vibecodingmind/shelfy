import { describe, expect, it } from 'vitest';
import { Client } from 'pg';
import { publicUser } from './publicUser.js';
import { canAccessBooking, canAccessPayment, canAccessPayouts, canSelfRegister, isActiveForApi, ownsResource } from './rbac.js';
import { demoLoginAllowed } from './passwords.js';
import { canEditListing, isPublishedShop, publicShops } from './listings.js';
import {
  paymentCapturedPostings,
  postingsAreBalanced,
  refundCapturedPostings,
  releaseHostPayablePostings,
} from './ledger.js';
import { quoteCancellation } from './cancellation.js';
import { quoteWithdrawal } from './withdrawals.js';
import { canTransition, initialBookingStatus } from './bookingMachine.js';
import { capturePaymentInLedger, completePayoutInLedger, financeSummaryForHost, holdWithdrawalInLedger, refundBookingInLedger, releaseHostEarnings } from '../services/finance.js';
import { createAuthToken, rotateRefreshToken, revokeAuthTokens } from '../services/tokens.js';
import { safeUploadFilename } from '../services/storage.js';
import { corsOrigin } from '../middleware/securityHeaders.js';
import { resolvedAppUrl } from '../services/jwtSecret.js';
import { buildCompleteSeedData, DatabaseSchema } from '../seedData.js';
import { Shop } from '../../types/index.js';
import { User } from '../../types/index.js';

function user(partial: Partial<User> & Pick<User, 'id' | 'role'>): User {
  return {
    name: 'Test',
    email: `${partial.id}@shelfy.test`,
    phone: '',
    passwordHash: 'hash',
    status: 'ACTIVE',
    failedLoginCount: 4,
    lockedUntil: '2099-01-01T00:00:00.000Z',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

const shop = (partial: Partial<Shop> = {}): Shop => ({
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
  ...partial,
});

describe('security: public responses', () => {
  it('strips passwordHash, failedLoginCount, and lockedUntil', () => {
    const safe = publicUser(user({ id: 'u1', role: 'VENDOR' }));
    expect((safe as any).passwordHash).toBeUndefined();
    expect((safe as any).failedLoginCount).toBeUndefined();
    expect((safe as any).lockedUntil).toBeUndefined();
    expect(safe.email).toContain('u1');
  });
});

describe('security: registration and demo login', () => {
  it('allows only vendor and host self-register', () => {
    expect(canSelfRegister('VENDOR')).toBe(true);
    expect(canSelfRegister('HOST')).toBe(true);
    expect(canSelfRegister('ADMIN')).toBe(false);
    expect(canSelfRegister('FIELD_AGENT')).toBe(false);
  });

  it('blocks demo login in production unless ALLOW_DEMO_LOGIN=true', () => {
    expect(demoLoginAllowed({ NODE_ENV: 'production' })).toBe(false);
    expect(demoLoginAllowed({ NODE_ENV: 'production', ALLOW_DEMO_LOGIN: 'true' })).toBe(true);
    expect(demoLoginAllowed({ NODE_ENV: 'development' })).toBe(true);
  });
});

describe('security: IDOR and listing visibility', () => {
  const vendor = user({ id: 'v1', role: 'VENDOR' });
  const otherVendor = user({ id: 'v2', role: 'VENDOR' });
  const host = user({ id: 'h1', role: 'HOST' });
  const otherHost = user({ id: 'h2', role: 'HOST' });
  const agent = user({ id: 'a1', role: 'FIELD_AGENT' });
  const booking = { vendorId: 'v1', hostId: 'h1' };

  it('keeps bookings and payments inside the relationship', () => {
    expect(canAccessBooking(vendor, booking)).toBe(true);
    expect(canAccessBooking(otherVendor, booking)).toBe(false);
    expect(canAccessBooking(otherHost, booking)).toBe(false);
    expect(canAccessPayment(vendor, { vendorId: 'v1' })).toBe(true);
    expect(canAccessPayment(otherVendor, { vendorId: 'v1' })).toBe(false);
    expect(canAccessPayment(host, { vendorId: 'v1' }, booking)).toBe(true);
    expect(canAccessPayment(host, { vendorId: 'v1' })).toBe(false);
    expect(canAccessPayouts(host)).toBe(true);
    expect(canAccessPayouts(vendor)).toBe(false);
    expect(canAccessPayouts(agent)).toBe(false);
  });

  it('lets a host edit only their listing', () => {
    expect(canEditListing(host, 'h1')).toBe(true);
    expect(canEditListing(otherHost, 'h1')).toBe(false);
    expect(ownsResource(otherHost, 'h1')).toBe(false);
  });

  it('hides unpublished shops from strangers', () => {
    const live = shop();
    const draft = shop({ id: 'shop_draft', listingStatus: 'DRAFT', verificationStatus: 'PENDING' });
    expect(isPublishedShop(draft)).toBe(false);
    expect(publicShops([live, draft]).map((s) => s.id)).toEqual(['shop_1']);
    expect(publicShops([live, draft], otherVendor).map((s) => s.id)).toEqual(['shop_1']);
    expect(publicShops([live, draft], host).map((s) => s.id).sort()).toEqual(['shop_1', 'shop_draft']);
  });

  it('blocks suspended and pending users from the marketplace API', () => {
    expect(isActiveForApi(user({ id: 's1', role: 'VENDOR', status: 'SUSPENDED' }))).toBe(false);
    expect(isActiveForApi(user({ id: 'p1', role: 'VENDOR', status: 'PENDING' }))).toBe(false);
    expect(isActiveForApi(user({ id: 'p1', role: 'VENDOR', status: 'PENDING' }), true)).toBe(true);
  });
});

describe('security: refresh revoke and uploads', () => {
  it('invalidates refresh tokens after revoke (password reset / suspend)', () => {
    const db = { authTokens: [] } as unknown as DatabaseSchema;
    const issued = createAuthToken(db, 'usr_1', 'REFRESH', 7 * 24 * 60 * 60 * 1000);
    revokeAuthTokens(db, 'usr_1', 'REFRESH');
    expect(rotateRefreshToken(db, issued.raw)).toBeNull();
  });

  it('strips path traversal from upload filenames', () => {
    expect(safeUploadFilename('../etc/passwd.jpg')).toBe('passwd.jpg');
    expect(safeUploadFilename('ok-file.webp')).toBe('ok-file.webp');
    expect(() => safeUploadFilename('..')).toThrow();
  });

  it('restricts CORS origin in production when APP_URL is set', () => {
    expect(corsOrigin({ NODE_ENV: 'development' })).toBe(true);
    expect(corsOrigin({ NODE_ENV: 'production', APP_URL: 'https://shelfy.example/' })).toBe('https://shelfy.example');
    expect(corsOrigin({ NODE_ENV: 'production', RAILWAY_PUBLIC_DOMAIN: 'shelfy-production-d34d.up.railway.app' })).toBe(
      'https://shelfy-production-d34d.up.railway.app'
    );
    expect(corsOrigin({ NODE_ENV: 'production' })).toBe(true);
  });

  it('derives APP_URL from Railway public domain when unset', () => {
    expect(resolvedAppUrl({ APP_URL: 'https://shelfy.example/' })).toBe('https://shelfy.example');
    expect(resolvedAppUrl({ RAILWAY_PUBLIC_DOMAIN: 'shelfy-production-d34d.up.railway.app' }, 3000)).toBe(
      'https://shelfy-production-d34d.up.railway.app'
    );
  });
});

describe('money journey', () => {
  it('keeps ledger postings balanced from capture through payout', () => {
    const booking = { hostId: 'h1', totalPriceTzs: 100000, platformFeeTzs: 10000, hostEarningsTzs: 90000 };
    expect(postingsAreBalanced(paymentCapturedPostings(booking))).toBe(true);
    expect(postingsAreBalanced(releaseHostPayablePostings('h1', 90000))).toBe(true);
    expect(
      postingsAreBalanced(
        refundCapturedPostings({
          vendorId: 'v1',
          hostId: 'h1',
          refundVendorTzs: 90000,
          reverseHostTzs: 90000,
          reverseCommissionTzs: 10000,
          cancellationFeeTzs: 10000,
          hostShareAlreadyReleased: false,
        })
      )
    ).toBe(true);

    const db = buildCompleteSeedData();
    db.ledgerAccounts = [];
    db.ledgerEntries = [];
    db.withdrawals = [];
    const row = { id: 'bk_j', vendorId: 'v1', ...booking };
    expect(capturePaymentInLedger(db, row, 'pay_j')).toBe(true);
    expect(financeSummaryForHost(db, 'h1').pendingTzs).toBe(90000);
    expect(financeSummaryForHost(db, 'h1').availableTzs).toBe(0);
    expect(releaseHostEarnings(db, row)).toBe(true);
    expect(financeSummaryForHost(db, 'h1').pendingTzs).toBe(0);
    expect(financeSummaryForHost(db, 'h1').availableTzs).toBe(90000);
    expect(quoteWithdrawal({ amountTzs: 20000, availableTzs: 90000, minWithdrawalTzs: 20000, existing: [] }).ok).toBe(true);
    expect(holdWithdrawalInLedger(db, 'h1', 20000, 'w1')).toBe(true);
    expect(financeSummaryForHost(db, 'h1').availableTzs).toBe(70000);
    expect(completePayoutInLedger(db, 'h1', 20000, 'w1')).toBe(true);
    expect(financeSummaryForHost(db, 'h1').heldTzs).toBe(0);
  });

  it('refunds a paid unused booking and zeros host pending', () => {
    const db = buildCompleteSeedData();
    db.ledgerAccounts = [];
    db.ledgerEntries = [];
    const booking = {
      id: 'bk_c',
      vendorId: 'v1',
      hostId: 'h1',
      totalPriceTzs: 100000,
      platformFeeTzs: 10000,
      hostEarningsTzs: 90000,
    };
    capturePaymentInLedger(db, booking, 'pay_c');
    const quote = quoteCancellation({
      status: 'PAID',
      paymentStatus: 'PAID',
      startDate: '2026-09-01',
      totalPriceTzs: 100000,
      platformFeeTzs: 10000,
      hostEarningsTzs: 90000,
      actor: 'VENDOR',
    });
    expect(quote.refundVendorTzs).toBe(100000);
    expect(refundBookingInLedger(db, { ...booking, ...quote })).toBe(true);
    expect(financeSummaryForHost(db, 'h1').pendingTzs).toBe(0);
  });

  it('enforces approve-then-pay: host cannot jump pending approval to active', () => {
    expect(initialBookingStatus(false)).toBe('PENDING_APPROVAL');
    expect(canTransition('PENDING_APPROVAL', 'ACTIVE', 'HOST')).toBe(false);
    expect(canTransition('PENDING_APPROVAL', 'PAYMENT_PENDING', 'HOST')).toBe(true);
    expect(canTransition('PAYMENT_PENDING', 'PAID', 'VENDOR')).toBe(false);
  });
});

describe('postgres integration', () => {
  it('runs SELECT 1 when DATABASE_URL points at a reachable database', async (ctx) => {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) {
      ctx.skip();
      return;
    }
    const internal = url.includes('railway.internal') || url.includes('sslmode=disable');
    const client = new Client({
      connectionString: url,
      connectionTimeoutMillis: 2000,
      ssl: internal ? false : { rejectUnauthorized: false },
    });
    try {
      await client.connect();
    } catch {
      ctx.skip();
      return;
    }
    try {
      const result = await client.query('SELECT 1::int AS ok');
      expect(Number(result.rows[0].ok)).toBe(1);
    } finally {
      await client.end();
    }
  });
});
