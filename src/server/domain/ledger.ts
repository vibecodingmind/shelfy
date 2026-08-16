export type LedgerAccountType =
  | 'PLATFORM_CLEARING'
  | 'PLATFORM_COMMISSION'
  | 'PLATFORM_CANCELLATION_FEE'
  | 'HOST_PENDING'
  | 'HOST_AVAILABLE'
  | 'HOST_WITHDRAWAL_HOLD'
  | 'VENDOR_REFUND';

export type LedgerOwnerType = 'PLATFORM' | 'HOST' | 'VENDOR';

export type LedgerEntryType =
  | 'VENDOR_PAYMENT'
  | 'PLATFORM_COMMISSION'
  | 'HOST_PAYABLE'
  | 'HOST_RELEASE'
  | 'HOST_WITHDRAWAL'
  | 'HOST_PAYOUT'
  | 'REFUND'
  | 'CANCELLATION_FEE'
  | 'ADJUSTMENT';

export type LedgerDirection = 'DEBIT' | 'CREDIT';

export interface LedgerAccount {
  id: string;
  ownerType: LedgerOwnerType;
  ownerId: string;
  type: LedgerAccountType;
}

export interface LedgerEntry {
  id: string;
  accountId: string;
  amountTzs: number;
  direction: LedgerDirection;
  type: LedgerEntryType;
  refType: string;
  refId: string;
  idempotencyKey: string;
  memo?: string;
  createdAt: string;
}

export interface LedgerPosting {
  account: { ownerType: LedgerOwnerType; ownerId: string; type: LedgerAccountType };
  amountTzs: number;
  direction: LedgerDirection;
  type: LedgerEntryType;
}

export function accountKey(ownerType: LedgerOwnerType, ownerId: string, type: LedgerAccountType): string {
  return `acct_${ownerType}_${ownerId}_${type}`;
}

export function signedAmount(entry: Pick<LedgerEntry, 'amountTzs' | 'direction'>): number {
  return entry.direction === 'CREDIT' ? entry.amountTzs : -entry.amountTzs;
}

export function balanceForAccount(entries: LedgerEntry[], accountId: string): number {
  return entries.filter((e) => e.accountId === accountId).reduce((sum, e) => sum + signedAmount(e), 0);
}

export function hostBalances(input: {
  hostId: string;
  accounts: LedgerAccount[];
  entries: LedgerEntry[];
}): { pendingTzs: number; availableTzs: number; heldTzs: number; totalEarnedTzs: number } {
  const pendingId = accountKey('HOST', input.hostId, 'HOST_PENDING');
  const availableId = accountKey('HOST', input.hostId, 'HOST_AVAILABLE');
  const holdId = accountKey('HOST', input.hostId, 'HOST_WITHDRAWAL_HOLD');
  const pendingTzs = balanceForAccount(input.entries, pendingId);
  const availableTzs = balanceForAccount(input.entries, availableId);
  const heldTzs = balanceForAccount(input.entries, holdId);
  const totalEarnedTzs = input.entries
    .filter((e) => e.accountId === pendingId && e.type === 'HOST_PAYABLE' && e.direction === 'CREDIT')
    .reduce((sum, e) => sum + e.amountTzs, 0);
  return { pendingTzs, availableTzs, heldTzs, totalEarnedTzs };
}

/** Double-entry postings when a vendor payment is confirmed. */
export function paymentCapturedPostings(input: {
  hostId: string;
  totalPriceTzs: number;
  platformFeeTzs: number;
  hostEarningsTzs: number;
}): LedgerPosting[] {
  return [
    {
      account: { ownerType: 'PLATFORM', ownerId: 'platform', type: 'PLATFORM_CLEARING' },
      amountTzs: input.totalPriceTzs,
      direction: 'DEBIT',
      type: 'VENDOR_PAYMENT',
    },
    {
      account: { ownerType: 'PLATFORM', ownerId: 'platform', type: 'PLATFORM_COMMISSION' },
      amountTzs: input.platformFeeTzs,
      direction: 'CREDIT',
      type: 'PLATFORM_COMMISSION',
    },
    {
      account: { ownerType: 'HOST', ownerId: input.hostId, type: 'HOST_PENDING' },
      amountTzs: input.hostEarningsTzs,
      direction: 'CREDIT',
      type: 'HOST_PAYABLE',
    },
  ];
}

export function releaseHostPayablePostings(hostId: string, hostEarningsTzs: number): LedgerPosting[] {
  return [
    {
      account: { ownerType: 'HOST', ownerId: hostId, type: 'HOST_PENDING' },
      amountTzs: hostEarningsTzs,
      direction: 'DEBIT',
      type: 'HOST_RELEASE',
    },
    {
      account: { ownerType: 'HOST', ownerId: hostId, type: 'HOST_AVAILABLE' },
      amountTzs: hostEarningsTzs,
      direction: 'CREDIT',
      type: 'HOST_RELEASE',
    },
  ];
}

export function withdrawalHoldPostings(hostId: string, amountTzs: number): LedgerPosting[] {
  return [
    {
      account: { ownerType: 'HOST', ownerId: hostId, type: 'HOST_AVAILABLE' },
      amountTzs: amountTzs,
      direction: 'DEBIT',
      type: 'HOST_WITHDRAWAL',
    },
    {
      account: { ownerType: 'HOST', ownerId: hostId, type: 'HOST_WITHDRAWAL_HOLD' },
      amountTzs: amountTzs,
      direction: 'CREDIT',
      type: 'HOST_WITHDRAWAL',
    },
  ];
}

export function payoutCompletedPostings(hostId: string, amountTzs: number): LedgerPosting[] {
  return [
    {
      account: { ownerType: 'HOST', ownerId: hostId, type: 'HOST_WITHDRAWAL_HOLD' },
      amountTzs: amountTzs,
      direction: 'DEBIT',
      type: 'HOST_PAYOUT',
    },
    {
      account: { ownerType: 'PLATFORM', ownerId: 'platform', type: 'PLATFORM_CLEARING' },
      amountTzs: amountTzs,
      direction: 'CREDIT',
      type: 'HOST_PAYOUT',
    },
  ];
}

export function payoutFailedPostings(hostId: string, amountTzs: number): LedgerPosting[] {
  return [
    {
      account: { ownerType: 'HOST', ownerId: hostId, type: 'HOST_WITHDRAWAL_HOLD' },
      amountTzs: amountTzs,
      direction: 'DEBIT',
      type: 'ADJUSTMENT',
    },
    {
      account: { ownerType: 'HOST', ownerId: hostId, type: 'HOST_AVAILABLE' },
      amountTzs: amountTzs,
      direction: 'CREDIT',
      type: 'ADJUSTMENT',
    },
  ];
}

export function refundCapturedPostings(input: {
  vendorId: string;
  hostId: string;
  refundVendorTzs: number;
  reverseHostTzs: number;
  reverseCommissionTzs: number;
  cancellationFeeTzs: number;
  hostShareAlreadyReleased: boolean;
}): LedgerPosting[] {
  const posts: LedgerPosting[] = [];
  if (input.reverseCommissionTzs > 0) {
    posts.push({
      account: { ownerType: 'PLATFORM', ownerId: 'platform', type: 'PLATFORM_COMMISSION' },
      amountTzs: input.reverseCommissionTzs,
      direction: 'DEBIT',
      type: 'REFUND',
    });
  }
  if (input.reverseHostTzs > 0) {
    posts.push({
      account: {
        ownerType: 'HOST',
        ownerId: input.hostId,
        type: input.hostShareAlreadyReleased ? 'HOST_AVAILABLE' : 'HOST_PENDING',
      },
      amountTzs: input.reverseHostTzs,
      direction: 'DEBIT',
      type: 'REFUND',
    });
  }
  if (input.cancellationFeeTzs > 0) {
    posts.push({
      account: { ownerType: 'PLATFORM', ownerId: 'platform', type: 'PLATFORM_CANCELLATION_FEE' },
      amountTzs: input.cancellationFeeTzs,
      direction: 'CREDIT',
      type: 'CANCELLATION_FEE',
    });
  }
  const clearingOut = input.refundVendorTzs;
  if (clearingOut > 0) {
    posts.push({
      account: { ownerType: 'PLATFORM', ownerId: 'platform', type: 'PLATFORM_CLEARING' },
      amountTzs: clearingOut,
      direction: 'CREDIT',
      type: 'REFUND',
    });
  }
  return posts;
}
