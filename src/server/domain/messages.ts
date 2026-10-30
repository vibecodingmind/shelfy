import { BookingStatus } from '../../types/index.js';

const MESSAGEABLE: BookingStatus[] = [
  'PENDING_APPROVAL',
  'APPROVED',
  'PAYMENT_PENDING',
  'PAYMENT_FAILED',
  'PAID',
  'ACTIVE',
  'EXPIRING',
  'DISPUTED',
  'COMPLETED',
];

export function canMessageBookingCounterparties(input: {
  senderId: string;
  senderRole: string;
  receiverId: string;
  booking?: { vendorId: string; hostId: string; status: BookingStatus; updatedAt?: string; endDate?: string } | null;
}): { ok: true } | { ok: false; message: string } {
  if (input.senderRole === 'ADMIN') return { ok: true };
  if (!input.booking) {
    return { ok: false, message: 'Messages require an authorized booking relationship.' };
  }
  if (!MESSAGEABLE.includes(input.booking.status)) {
    return { ok: false, message: 'Messaging is not available for this booking status.' };
  }
  const parties = [input.booking.vendorId, input.booking.hostId];
  if (!parties.includes(input.senderId) || !parties.includes(input.receiverId)) {
    return { ok: false, message: 'You can only message the other party on this booking.' };
  }
  if (input.senderId === input.receiverId) {
    return { ok: false, message: 'Cannot message yourself.' };
  }
  if (input.booking.status === 'COMPLETED') {
    const updated = input.booking.updatedAt ? new Date(input.booking.updatedAt).getTime() : 0;
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (updated && Date.now() - updated > thirtyDays) {
      return { ok: false, message: 'Messaging on completed bookings expires after 30 days.' };
    }
  }
  return { ok: true };
}

/** Pre-booking questions: vendor (or any non-host user) ↔ shop host. */
export function canMessageShopListing(input: {
  senderId: string;
  receiverId: string;
  shop: { id: string; hostId: string; status?: string; deletedAt?: string | null };
}): { ok: true } | { ok: false; message: string } {
  if (input.shop.deletedAt) {
    return { ok: false, message: 'This shop is not available for messages.' };
  }
  if (input.shop.status && input.shop.status !== 'ACTIVE') {
    return { ok: false, message: 'This shop is not accepting messages right now.' };
  }
  const { hostId } = input.shop;
  if (input.senderId === input.receiverId) {
    return { ok: false, message: 'Cannot message yourself.' };
  }
  if (input.receiverId === hostId && input.senderId !== hostId) {
    return { ok: true };
  }
  if (input.senderId === hostId && input.receiverId !== hostId) {
    return { ok: true };
  }
  return { ok: false, message: 'You can only message the host of this shop listing.' };
}
