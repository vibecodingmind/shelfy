import { DatabaseSchema } from '../seedData.js';
import { newId } from '../domain/ids.js';
import {
  LedgerPosting,
  accountKey,
  hostBalances,
  paymentCapturedPostings,
  releaseHostPayablePostings,
} from '../domain/ledger.js';

export function applyPostings(
  db: DatabaseSchema,
  postings: LedgerPosting[],
  meta: { refType: string; refId: string; idempotencyPrefix: string; memo?: string }
): boolean {
  if (db.ledgerEntries.some((e) => e.idempotencyKey.startsWith(`${meta.idempotencyPrefix}:`))) {
    return false;
  }
  const now = new Date().toISOString();
  postings.forEach((post, index) => {
    const id = accountKey(post.account.ownerType, post.account.ownerId, post.account.type);
    if (!db.ledgerAccounts.some((a) => a.id === id)) {
      db.ledgerAccounts.push({
        id,
        ownerType: post.account.ownerType,
        ownerId: post.account.ownerId,
        type: post.account.type,
      });
    }
    db.ledgerEntries.push({
      id: newId('le'),
      accountId: id,
      amountTzs: post.amountTzs,
      direction: post.direction,
      type: post.type,
      refType: meta.refType,
      refId: meta.refId,
      idempotencyKey: `${meta.idempotencyPrefix}:${index}`,
      memo: meta.memo,
      createdAt: now,
    });
  });
  return true;
}

export function capturePaymentInLedger(db: DatabaseSchema, booking: {
  id: string;
  hostId: string;
  totalPriceTzs: number;
  platformFeeTzs: number;
  hostEarningsTzs: number;
}, paymentId: string): boolean {
  return applyPostings(db, paymentCapturedPostings(booking), {
    refType: 'Payment',
    refId: paymentId,
    idempotencyPrefix: `payment:${paymentId}:captured`,
    memo: `Vendor payment for booking ${booking.id}`,
  });
}

export function releaseHostEarnings(db: DatabaseSchema, booking: { id: string; hostId: string; hostEarningsTzs: number }): boolean {
  return applyPostings(db, releaseHostPayablePostings(booking.hostId, booking.hostEarningsTzs), {
    refType: 'Booking',
    refId: booking.id,
    idempotencyPrefix: `booking:${booking.id}:release`,
    memo: `Release host payable for completed booking ${booking.id}`,
  });
}

export function financeSummaryForHost(db: DatabaseSchema, hostId: string) {
  const balances = hostBalances({ hostId, accounts: db.ledgerAccounts, entries: db.ledgerEntries });
  const withdrawnTzs = db.payouts
    .filter((p) => p.hostId === hostId && p.status === 'COMPLETED')
    .reduce((sum, p) => sum + p.netAmountTzs, 0);
  return {
    ...balances,
    withdrawnTzs,
    minWithdrawalTzs: db.settings.minWithdrawalTzs || 20000,
    currency: db.settings.currency || 'TZS',
  };
}
