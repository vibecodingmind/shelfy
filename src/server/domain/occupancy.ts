import { BLOCKING_BOOKING_STATUSES } from './pricing.js';

const PAID_OCCUPANCY_STATUSES = ['PAID', 'ACTIVE', 'EXPIRING', 'COMPLETED'] as const;

function dayCount(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

function overlapDays(startA: string, endA: string, startB: string, endB: string): number {
  const start = startA > startB ? startA : startB;
  const end = endA < endB ? endA : endB;
  return dayCount(start, end);
}

export function occupancyWindow(now = new Date(), days = 30): { windowStart: string; windowEnd: string; windowDays: number } {
  const start = now.toISOString().slice(0, 10);
  const endDate = new Date(`${start}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() + days);
  const windowEnd = endDate.toISOString().slice(0, 10);
  return { windowStart: start, windowEnd, windowDays: days };
}

export function occupancyForShelf(input: {
  shelfId: string;
  bookings: Array<{ shelfId: string; startDate: string; endDate: string; status: string }>;
  windowStart: string;
  windowEnd: string;
}): { windowDays: number; reservedDays: number; paidDays: number; reservedPercent: number; paidPercent: number } {
  const windowDays = dayCount(input.windowStart, input.windowEnd);
  const relevant = input.bookings.filter((b) => b.shelfId === input.shelfId);
  const reservedDays = relevant
    .filter((b) => (BLOCKING_BOOKING_STATUSES as readonly string[]).includes(b.status))
    .reduce((sum, b) => sum + overlapDays(b.startDate, b.endDate, input.windowStart, input.windowEnd), 0);
  const paidDays = relevant
    .filter((b) => (PAID_OCCUPANCY_STATUSES as readonly string[]).includes(b.status))
    .reduce((sum, b) => sum + overlapDays(b.startDate, b.endDate, input.windowStart, input.windowEnd), 0);
  const cap = (days: number) => (windowDays ? Math.min(100, Math.round((Math.min(days, windowDays) / windowDays) * 100)) : 0);
  return {
    windowDays,
    reservedDays: Math.min(reservedDays, windowDays),
    paidDays: Math.min(paidDays, windowDays),
    reservedPercent: cap(reservedDays),
    paidPercent: cap(paidDays),
  };
}

export function occupancySummary(input: {
  shelves: Array<{ id: string }>;
  bookings: Array<{ shelfId: string; startDate: string; endDate: string; status: string }>;
  windowStart: string;
  windowEnd: string;
}): { windowStart: string; windowEnd: string; windowDays: number; shelfCount: number; paidPercent: number; reservedPercent: number } {
  const windowDays = dayCount(input.windowStart, input.windowEnd);
  const shelfCount = input.shelves.length;
  const capacity = shelfCount * windowDays;
  let reservedDays = 0;
  let paidDays = 0;
  for (const shelf of input.shelves) {
    const row = occupancyForShelf({
      shelfId: shelf.id,
      bookings: input.bookings,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
    });
    reservedDays += row.reservedDays;
    paidDays += row.paidDays;
  }
  const pct = (days: number) => (capacity ? Math.round((days / capacity) * 100) : 0);
  return {
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    windowDays,
    shelfCount,
    paidPercent: pct(paidDays),
    reservedPercent: pct(reservedDays),
  };
}
