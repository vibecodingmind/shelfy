import { DatabaseSchema } from '../seedData.js';
import { newId } from '../domain/ids.js';
import {
  LedgerPosting,
  accountKey,
  hostBalances,
  paymentCapturedPostings,
  releaseHostPayablePostings,
  refundCapturedPostings,
  withdrawalHoldPostings,
  payoutCompletedPostings,
  payoutFailedPostings,
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

export function refundBookingInLedger(
  db: DatabaseSchema,
  booking: { id: string; vendorId: string; hostId: string; refundVendorTzs: number; reverseHostTzs: number; reverseCommissionTzs: number; cancellationFeeTzs: number },
  hostShareAlreadyReleased = false
): boolean {
  if (booking.refundVendorTzs + booking.reverseHostTzs + booking.reverseCommissionTzs + booking.cancellationFeeTzs <= 0) {
    return false;
  }
  return applyPostings(
    db,
    refundCapturedPostings({ ...booking, hostShareAlreadyReleased }),
    {
      refType: 'Booking',
      refId: booking.id,
      idempotencyPrefix: `booking:${booking.id}:refund`,
      memo: `Cancellation refund for ${booking.id}`,
    }
  );
}

export function holdWithdrawalInLedger(db: DatabaseSchema, hostId: string, amountTzs: number, withdrawalId: string): boolean {
  return applyPostings(db, withdrawalHoldPostings(hostId, amountTzs), {
    refType: 'Withdrawal',
    refId: withdrawalId,
    idempotencyPrefix: `withdrawal:${withdrawalId}:hold`,
    memo: `Hold for withdrawal ${withdrawalId}`,
  });
}

export function completePayoutInLedger(db: DatabaseSchema, hostId: string, amountTzs: number, withdrawalId: string): boolean {
  return applyPostings(db, payoutCompletedPostings(hostId, amountTzs), {
    refType: 'Withdrawal',
    refId: withdrawalId,
    idempotencyPrefix: `withdrawal:${withdrawalId}:paid`,
    memo: `Payout completed ${withdrawalId}`,
  });
}

export function failPayoutInLedger(db: DatabaseSchema, hostId: string, amountTzs: number, withdrawalId: string): boolean {
  return applyPostings(db, payoutFailedPostings(hostId, amountTzs), {
    refType: 'Withdrawal',
    refId: withdrawalId,
    idempotencyPrefix: `withdrawal:${withdrawalId}:failed`,
    memo: `Payout failed ${withdrawalId}`,
  });
}

export function financeSummaryForHost(db: DatabaseSchema, hostId: string) {
  const balances = hostBalances({ hostId, accounts: db.ledgerAccounts, entries: db.ledgerEntries });
  const withdrawnTzs = (db.withdrawals || [])
    .filter((w) => w.hostId === hostId && w.status === 'COMPLETED')
    .reduce((sum, w) => sum + w.amountTzs, 0);
  return {
    ...balances,
    withdrawnTzs,
    minWithdrawalTzs: db.settings.minWithdrawalTzs || 20000,
    currency: db.settings.currency || 'TZS',
  };
}
