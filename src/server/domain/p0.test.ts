import { describe, expect, it } from 'vitest';
import { validatePassword, isDemoEmail } from './passwords.js';
import { publicUser } from './publicUser.js';
import { addMonthsIsoDate, calculateBookingQuote, datesOverlap } from './pricing.js';
import { assertTransition, canTransition, initialBookingStatus, normalizeHostApproval } from './bookingMachine.js';
import { canMessageBookingCounterparties } from './messages.js';
import { amountsMatch, mapPesapalStatus, PESAPAL_STATUS } from '../payments/pesapal.js';
import { applyPostings, capturePaymentInLedger, financeSummaryForHost } from '../services/finance.js';
import { paymentCapturedPostings } from './ledger.js';
import { sandboxSignature, verifySandboxSignature, sandboxCompletionEnabled } from '../services/tokens.js';
import { buildCompleteSeedData } from '../seedData.js';
import { canAccessBooking, canAccessPayment, hasRole } from './rbac.js';
import { User } from '../../types/index.js';

function user(partial: Partial<User> & Pick<User, 'id' | 'role'>): User {
  return {
    name: 'Test',
    email: `${partial.id}@shelfy.test`,
    phone: '',
    passwordHash: 'hash',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

describe('password policy', () => {
  it('rejects short or simple passwords', () => {
    expect(validatePassword('short').ok).toBe(false);
    expect(validatePassword('nouppercase1!').ok).toBe(false);
    expect(validatePassword('NOLOWERCASE1!').ok).toBe(false);
    expect(validatePassword('NoNumber!!aa').ok).toBe(false);
    expect(validatePassword('NoSpecial12a').ok).toBe(false);
  });

  it('accepts a strong password', () => {
    expect(validatePassword('Password123!').ok).toBe(true);
  });

  it('recognizes demo emails', () => {
    expect(isDemoEmail('admin@shelfy.co.tz')).toBe(true);
    expect(isDemoEmail('someone@example.com')).toBe(false);
  });
});

describe('publicUser', () => {
  it('strips passwordHash and lockout fields', () => {
    const safe = publicUser(user({ id: 'u1', role: 'VENDOR', passwordHash: 'secret', failedLoginCount: 3, lockedUntil: '2099-01-01T00:00:00.000Z' }));
    expect((safe as any).passwordHash).toBeUndefined();
    expect((safe as any).failedLoginCount).toBeUndefined();
    expect((safe as any).lockedUntil).toBeUndefined();
    expect(safe.email).toContain('u1');
  });
});

describe('pricing and overlap', () => {
  it('splits commission 10% on 100000', () => {
    const quote = calculateBookingQuote({ monthlyPriceTzs: 100000, durationMonths: 1, commissionPercentage: 10 });
    expect(quote.totalPriceTzs).toBe(100000);
    expect(quote.platformFeeTzs).toBe(10000);
    expect(quote.hostEarningsTzs).toBe(90000);
  });

  it('detects overlapping ranges', () => {
    expect(datesOverlap('2026-08-01', '2026-10-01', '2026-09-01', '2026-11-01')).toBe(true);
    expect(datesOverlap('2026-08-01', '2026-09-01', '2026-09-01', '2026-10-01')).toBe(false);
    expect(addMonthsIsoDate('2026-01-15', 2)).toBe('2026-03-15');
  });
});

describe('booking state machine', () => {
  it('starts as pending approval unless auto-approve', () => {
    expect(initialBookingStatus(false)).toBe('PENDING_APPROVAL');
    expect(initialBookingStatus(true)).toBe('PAYMENT_PENDING');
  });

  it('maps host APPROVED to PAYMENT_PENDING', () => {
    expect(normalizeHostApproval('APPROVED')).toBe('PAYMENT_PENDING');
  });

  it('allows host to approve and rejects illegal jumps', () => {
    expect(canTransition('PENDING_APPROVAL', 'PAYMENT_PENDING', 'HOST')).toBe(true);
    expect(canTransition('PENDING_APPROVAL', 'ACTIVE', 'HOST')).toBe(false);
    expect(canTransition('PAYMENT_PENDING', 'PAID', 'VENDOR')).toBe(false);
    expect(canTransition('PAYMENT_PENDING', 'PAID', 'SYSTEM')).toBe(true);
    expect(() => assertTransition('ACTIVE', 'PAID', 'ADMIN')).toThrow();
  });
});

describe('message authorization', () => {
  const booking = { vendorId: 'v1', hostId: 'h1', status: 'ACTIVE' as const };

  it('allows counterparties on an active booking', () => {
    expect(canMessageBookingCounterparties({ senderId: 'v1', senderRole: 'VENDOR', receiverId: 'h1', booking }).ok).toBe(true);
  });

  it('rejects strangers and missing bookings', () => {
    expect(canMessageBookingCounterparties({ senderId: 'v2', senderRole: 'VENDOR', receiverId: 'h1', booking }).ok).toBe(false);
    expect(canMessageBookingCounterparties({ senderId: 'v1', senderRole: 'VENDOR', receiverId: 'h1' }).ok).toBe(false);
  });

  it('allows admin moderation', () => {
    expect(canMessageBookingCounterparties({ senderId: 'admin', senderRole: 'ADMIN', receiverId: 'h1', booking }).ok).toBe(true);
  });
});

describe('rbac', () => {
  const vendor = user({ id: 'v1', role: 'VENDOR' });
  const host = user({ id: 'h1', role: 'HOST' });
  const agent = user({ id: 'a1', role: 'FIELD_AGENT' });
  const booking = { vendorId: 'v1', hostId: 'h1' };

  it('scopes booking and payment access', () => {
    expect(canAccessBooking(vendor, booking)).toBe(true);
    expect(canAccessBooking(host, booking)).toBe(true);
    expect(canAccessBooking(agent, booking)).toBe(false);
    expect(canAccessPayment(vendor, { vendorId: 'v1' })).toBe(true);
    expect(canAccessPayment(agent, { vendorId: 'v1' })).toBe(false);
    expect(hasRole(agent, ['VENDOR'])).toBe(false);
  });
});

describe('ledger', () => {
  it('posts a captured payment once and computes host pending', () => {
    const db = buildCompleteSeedData();
    db.ledgerAccounts = [];
    db.ledgerEntries = [];
    const booking = {
      id: 'bk_test',
      hostId: 'usr_host_1',
      totalPriceTzs: 100000,
      platformFeeTzs: 10000,
      hostEarningsTzs: 90000,
    };
    expect(capturePaymentInLedger(db, booking, 'pay_test')).toBe(true);
    expect(capturePaymentInLedger(db, booking, 'pay_test')).toBe(false);
    const summary = financeSummaryForHost(db, 'usr_host_1');
    expect(summary.pendingTzs).toBe(90000);
    expect(summary.availableTzs).toBe(0);
    const posts = paymentCapturedPostings(booking);
    expect(posts).toHaveLength(3);
  });

  it('rejects a second apply with the same idempotency prefix', () => {
    const db = buildCompleteSeedData();
    db.ledgerAccounts = [];
    db.ledgerEntries = [];
    const posts = paymentCapturedPostings({
      hostId: 'h',
      totalPriceTzs: 50,
      platformFeeTzs: 5,
      hostEarningsTzs: 45,
    });
    expect(applyPostings(db, posts, { refType: 'Payment', refId: 'p1', idempotencyPrefix: 'payment:p1:captured' })).toBe(true);
    expect(applyPostings(db, posts, { refType: 'Payment', refId: 'p1', idempotencyPrefix: 'payment:p1:captured' })).toBe(false);
  });
});

describe('pesapal mapping', () => {
  it('maps official status codes', () => {
    expect(mapPesapalStatus(PESAPAL_STATUS.COMPLETED)).toBe('PAID');
    expect(mapPesapalStatus(PESAPAL_STATUS.FAILED)).toBe('FAILED');
    expect(mapPesapalStatus(PESAPAL_STATUS.REVERSED)).toBe('REFUNDED');
    expect(amountsMatch(100000, 100000)).toBe(true);
    expect(amountsMatch(100000, 99999)).toBe(false);
  });
});

describe('sandbox signature', () => {
  it('accepts only the HMAC for that payment id', () => {
    const good = sandboxSignature('pay_1');
    expect(verifySandboxSignature('pay_1', good)).toBe(true);
    expect(verifySandboxSignature('pay_1', sandboxSignature('pay_2'))).toBe(false);
    expect(verifySandboxSignature('pay_1', 'nope')).toBe(false);
  });

  it('refuses JWT fallback in production live mode', () => {
    const env = {
      NODE_ENV: 'production',
      PESAPAL_ENVIRONMENT: 'live',
      JWT_SECRET: 'prod_jwt',
    };
    expect(sandboxCompletionEnabled(env)).toBe(false);
    expect(verifySandboxSignature('pay_1', 'anything', env)).toBe(false);
  });

  it('requires explicit PESAPAL_SANDBOX_KEY in production sandbox', () => {
    const env = {
      NODE_ENV: 'production',
      PESAPAL_ENVIRONMENT: 'sandbox',
      PESAPAL_SANDBOX_KEY: 'sandbox_hmac',
    };
    const sig = sandboxSignature('pay_1', env);
    expect(verifySandboxSignature('pay_1', sig, env)).toBe(true);
  });
});
