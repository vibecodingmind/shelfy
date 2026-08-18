import { Booking, DynamicPricingSuggestion, Shelf } from '../../types/index.js';

export function suggestDynamicPrice(input: {
  shelf: Shelf;
  bookings: Booking[];
  now?: Date;
}): DynamicPricingSuggestion {
  const now = input.now || new Date();
  const shelfBookings = input.bookings.filter((b) => b.shelfId === input.shelf.id);
  const recent = shelfBookings.filter((b) => {
    const created = new Date(b.createdAt).getTime();
    return now.getTime() - created < 90 * 24 * 60 * 60 * 1000;
  });
  const paidRecent = recent.filter((b) => b.paymentStatus === 'PAID').length;
  const active = shelfBookings.filter((b) => ['ACTIVE', 'EXPIRING', 'PAID'].includes(b.status)).length;

  const demandScore = Math.min(100, paidRecent * 15 + active * 10 + (input.shelf.avgRating || 0) * 8);
  const occupancyPercent = active > 0 ? Math.min(100, active * 50) : 0;

  let multiplier = 1;
  let reason = 'Stable demand — maintain current price.';
  if (demandScore >= 70 && occupancyPercent >= 50) {
    multiplier = 1.12;
    reason = 'High demand and strong occupancy — consider a modest increase.';
  } else if (demandScore < 30 && occupancyPercent < 25) {
    multiplier = 0.92;
    reason = 'Low recent bookings — a promotional rate may improve fill rate.';
  } else if (input.shelf.avgRating && input.shelf.avgRating >= 4.5) {
    multiplier = 1.05;
    reason = 'Excellent reviews support a slight premium.';
  }

  const suggested = Math.round(input.shelf.monthlyPriceTzs * multiplier / 1000) * 1000;

  return {
    shelfId: input.shelf.id,
    currentPriceTzs: input.shelf.monthlyPriceTzs,
    suggestedPriceTzs: Math.max(10000, suggested),
    demandScore: Math.round(demandScore),
    occupancyPercent: Math.round(occupancyPercent),
    reason,
  };
}
