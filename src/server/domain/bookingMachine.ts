import { BookingStatus, UserRole } from '../../types/index.js';

export type BookingActor = UserRole | 'SYSTEM';

const TRANSITIONS: Record<BookingStatus, Partial<Record<BookingStatus, BookingActor[]>>> = {
  DRAFT: {
    PENDING_APPROVAL: ['VENDOR', 'ADMIN'],
    PAYMENT_PENDING: ['VENDOR', 'ADMIN'],
    CANCELLED: ['VENDOR', 'ADMIN'],
  },
  PENDING_APPROVAL: {
    APPROVED: ['HOST', 'ADMIN'],
    PAYMENT_PENDING: ['HOST', 'ADMIN'],
    REJECTED: ['HOST', 'ADMIN'],
    CANCELLED: ['VENDOR', 'HOST', 'ADMIN'],
  },
  APPROVED: {
    PAYMENT_PENDING: ['VENDOR', 'HOST', 'ADMIN', 'SYSTEM'],
    CANCELLED: ['VENDOR', 'HOST', 'ADMIN'],
    REJECTED: ['HOST', 'ADMIN'],
  },
  PAYMENT_PENDING: {
    PAID: ['ADMIN', 'SYSTEM'],
    PAYMENT_FAILED: ['ADMIN', 'SYSTEM'],
    CANCELLED: ['VENDOR', 'HOST', 'ADMIN'],
  },
  PAYMENT_FAILED: {
    PAYMENT_PENDING: ['VENDOR', 'ADMIN', 'SYSTEM'],
    CANCELLED: ['VENDOR', 'HOST', 'ADMIN'],
  },
  PAID: {
    ACTIVE: ['ADMIN', 'SYSTEM'],
    CANCELLED: ['VENDOR', 'HOST', 'ADMIN'],
  },
  ACTIVE: {
    EXPIRING: ['ADMIN', 'SYSTEM'],
    COMPLETED: ['ADMIN', 'SYSTEM'],
    CANCELLED: ['VENDOR', 'HOST', 'ADMIN'],
    DISPUTED: ['VENDOR', 'HOST', 'ADMIN'],
  },
  EXPIRING: {
    COMPLETED: ['ADMIN', 'SYSTEM'],
    CANCELLED: ['VENDOR', 'HOST', 'ADMIN'],
    DISPUTED: ['VENDOR', 'HOST', 'ADMIN'],
  },
  COMPLETED: {},
  CANCELLED: {},
  REJECTED: {},
  DISPUTED: {
    ACTIVE: ['ADMIN'],
    COMPLETED: ['ADMIN'],
    CANCELLED: ['ADMIN'],
  },
};

export function canTransition(from: BookingStatus, to: BookingStatus, actor: BookingActor): boolean {
  const allowed = TRANSITIONS[from]?.[to];
  return Boolean(allowed?.includes(actor));
}

export function assertTransition(from: BookingStatus, to: BookingStatus, actor: BookingActor): void {
  if (!canTransition(from, to, actor)) {
    throw new Error(`Cannot change booking from ${from} to ${to} as ${actor}.`);
  }
}

export function normalizeHostApproval(requested: BookingStatus): BookingStatus {
  if (requested === 'APPROVED') return 'PAYMENT_PENDING';
  return requested;
}

export function initialBookingStatus(autoApprove: boolean): BookingStatus {
  return autoApprove ? 'PAYMENT_PENDING' : 'PENDING_APPROVAL';
}

export function isPaidLike(status: BookingStatus): boolean {
  return status === 'PAID' || status === 'ACTIVE' || status === 'EXPIRING' || status === 'COMPLETED';
}
