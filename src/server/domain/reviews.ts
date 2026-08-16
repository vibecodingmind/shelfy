import { BookingStatus, UserRole } from '../../types/index.js';

export function canReviewBooking(input: {
  status: BookingStatus;
  reviewerId: string;
  vendorId: string;
  hostId: string;
  existing: Array<{ bookingId: string; reviewerId: string }>;
  bookingId: string;
}): { ok: true; targetRole: 'HOST' | 'VENDOR' } | { ok: false; message: string } {
  if (input.status !== 'COMPLETED') {
    return { ok: false, message: 'Reviews are only allowed after a booking is completed.' };
  }
  if (input.existing.some((r) => r.bookingId === input.bookingId && r.reviewerId === input.reviewerId)) {
    return { ok: false, message: 'You already reviewed this booking.' };
  }
  if (input.reviewerId === input.vendorId) return { ok: true, targetRole: 'HOST' };
  if (input.reviewerId === input.hostId) return { ok: true, targetRole: 'VENDOR' };
  return { ok: false, message: 'Only the vendor or host on this booking can leave a review.' };
}

export function validRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

export function canOpenDispute(input: {
  status: BookingStatus;
  actorId: string;
  actorRole: UserRole;
  vendorId: string;
  hostId: string;
  existingOpen: boolean;
}): { ok: true } | { ok: false; message: string } {
  if (!['ACTIVE', 'EXPIRING'].includes(input.status)) {
    return { ok: false, message: 'This booking cannot be disputed in its current status.' };
  }
  if (input.existingOpen) {
    return { ok: false, message: 'A dispute is already open for this booking.' };
  }
  if (input.actorRole === 'ADMIN') return { ok: true };
  if (input.actorId !== input.vendorId && input.actorId !== input.hostId) {
    return { ok: false, message: 'Only the vendor or host on this booking can open a dispute.' };
  }
  return { ok: true };
}
