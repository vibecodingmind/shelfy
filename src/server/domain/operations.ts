import { Booking, BookingStatus } from '../../types/index.js';
import { BLOCKING_BOOKING_STATUSES } from './pricing.js';
import { canTransition } from './bookingMachine.js';

export interface BookingTickChange {
  bookingId: string;
  from: BookingStatus;
  to: BookingStatus;
  releaseHost: boolean;
}

export function tickBookingStatuses(input: {
  bookings: Booking[];
  now?: Date;
  graceHours?: number;
  expiringDays?: number;
}): BookingTickChange[] {
  const now = input.now || new Date();
  const graceMs = (input.graceHours ?? 24) * 60 * 60 * 1000;
  const expiringDays = input.expiringDays ?? 7;
  const changes: BookingTickChange[] = [];

  for (const booking of input.bookings) {
    if (booking.status !== 'ACTIVE' && booking.status !== 'EXPIRING') continue;
    const end = new Date(`${booking.endDate}T23:59:59.000Z`);
    const untilEndDays = (end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);

    if (booking.status === 'ACTIVE' && untilEndDays <= expiringDays && untilEndDays > 0 && canTransition('ACTIVE', 'EXPIRING', 'SYSTEM')) {
      changes.push({ bookingId: booking.id, from: 'ACTIVE', to: 'EXPIRING', releaseHost: false });
      continue;
    }

    if (now.getTime() > end.getTime() + graceMs && canTransition(booking.status, 'COMPLETED', 'SYSTEM')) {
      changes.push({ bookingId: booking.id, from: booking.status, to: 'COMPLETED', releaseHost: true });
    }
  }

  return changes;
}

export function shelfShouldBeAvailable(shelfId: string, bookings: Booking[]): boolean {
  return !bookings.some(
    (b) => b.shelfId === shelfId && BLOCKING_BOOKING_STATUSES.includes(b.status as (typeof BLOCKING_BOOKING_STATUSES)[number])
  );
}

export function isDataUrlImage(value: string): { ok: true; mime: string } | { ok: false; message: string } {
  const match = /^data:(image\/(jpeg|jpg|png|webp));base64,/.exec(value);
  if (!match) return { ok: false, message: 'Only JPEG, PNG, or WebP images are allowed.' };
  const approxBytes = Math.ceil(((value.split(',')[1] || '').length * 3) / 4);
  if (approxBytes > 2.5 * 1024 * 1024) return { ok: false, message: 'Image must be 2.5MB or smaller.' };
  return { ok: true, mime: match[1] };
}
