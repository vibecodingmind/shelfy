import { Booking, BookingReceipt, Payment } from '../../types/index.js';

export function buildBookingReceipt(input: {
  booking: Booking;
  payment?: Payment;
}): BookingReceipt {
  const { booking, payment } = input;
  return {
    receiptNumber: `RCP-${booking.id.replace(/^bk_?/, '').slice(-8).toUpperCase()}`,
    bookingId: booking.id,
    vendorName: booking.vendorName || 'Vendor',
    vendorBusinessName: booking.vendorBusinessName,
    shelfName: booking.shelfName || 'Shelf',
    shopName: booking.shopName || 'Shop',
    shopCity: booking.shopCity || 'Tanzania',
    startDate: booking.startDate,
    endDate: booking.endDate,
    durationMonths: booking.durationMonths,
    monthlyPriceTzs: booking.monthlyPriceTzs,
    totalPriceTzs: booking.totalPriceTzs,
    platformFeeTzs: booking.platformFeeTzs,
    hostEarningsTzs: booking.hostEarningsTzs,
    paymentStatus: booking.paymentStatus,
    paidAt: payment?.paidAt,
    transactionReference: payment?.transactionReference,
    issuedAt: new Date().toISOString(),
  };
}

export function bookingsToCsv(bookings: Booking[]): string {
  const headers = [
    'id',
    'shelfName',
    'shopName',
    'shopCity',
    'startDate',
    'endDate',
    'durationMonths',
    'totalPriceTzs',
    'status',
    'paymentStatus',
    'createdAt',
  ];
  const rows = bookings.map((b) =>
    [
      b.id,
      csvEscape(b.shelfName || ''),
      csvEscape(b.shopName || ''),
      csvEscape(b.shopCity || ''),
      b.startDate,
      b.endDate,
      b.durationMonths,
      b.totalPriceTzs,
      b.status,
      b.paymentStatus,
      b.createdAt,
    ].join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
