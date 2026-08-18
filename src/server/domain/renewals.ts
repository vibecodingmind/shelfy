import { Booking, BookingStatus } from '../../types/index.js';
import { assertTransition } from './bookingMachine.js';
import { addMonthsIsoDate, BLOCKING_BOOKING_STATUSES, calculateBookingQuote, datesOverlap } from './pricing.js';
import { DatabaseSchema } from '../seedData.js';

export function canRenewBooking(booking: Booking): { ok: true } | { ok: false; message: string } {
  if (!['ACTIVE', 'EXPIRING', 'COMPLETED'].includes(booking.status)) {
    return { ok: false, message: 'Only active, expiring, or recently completed bookings can be renewed.' };
  }
  if (booking.paymentStatus !== 'PAID') {
    return { ok: false, message: 'Original booking must be paid before renewal.' };
  }
  return { ok: true };
}

export function quoteRenewal(input: {
  booking: Booking;
  durationMonths: number;
  commissionPercentage: number;
}): {
  startDate: string;
  endDate: string;
  quote: ReturnType<typeof calculateBookingQuote>;
} {
  const startDate = input.booking.status === 'COMPLETED' ? input.booking.endDate : input.booking.endDate;
  const quote = calculateBookingQuote({
    monthlyPriceTzs: input.booking.monthlyPriceTzs,
    durationMonths: input.durationMonths,
    commissionPercentage: input.commissionPercentage,
  });
  const endDate = addMonthsIsoDate(startDate, quote.durationMonths);
  return { startDate, endDate, quote };
}

export function findRenewalOverlap(
  shelfId: string,
  startDate: string,
  endDate: string,
  bookings: Booking[],
  excludeBookingId?: string
): Booking | undefined {
  return bookings.find((b) => {
    if (b.shelfId !== shelfId) return false;
    if (excludeBookingId && b.id === excludeBookingId) return false;
    if (!BLOCKING_BOOKING_STATUSES.includes(b.status as (typeof BLOCKING_BOOKING_STATUSES)[number])) return false;
    return datesOverlap(startDate, endDate, b.startDate, b.endDate);
  });
}

export function initialRenewalStatus(autoApprove: boolean): BookingStatus {
  return autoApprove ? 'APPROVED' : 'PENDING_APPROVAL';
}
