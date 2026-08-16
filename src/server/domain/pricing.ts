export function calculateBookingQuote(input: {
  monthlyPriceTzs: number;
  durationMonths: number;
  commissionPercentage: number;
}): { monthlyPriceTzs: number; durationMonths: number; totalPriceTzs: number; platformFeeTzs: number; hostEarningsTzs: number } {
  const durationMonths = Math.max(1, Math.floor(Number(input.durationMonths) || 1));
  const monthlyPriceTzs = Math.max(0, Math.round(Number(input.monthlyPriceTzs) || 0));
  const totalPriceTzs = monthlyPriceTzs * durationMonths;
  const rate = Math.min(100, Math.max(0, Number(input.commissionPercentage) || 0)) / 100;
  const platformFeeTzs = Math.round(totalPriceTzs * rate);
  const hostEarningsTzs = totalPriceTzs - platformFeeTzs;
  return { monthlyPriceTzs, durationMonths, totalPriceTzs, platformFeeTzs, hostEarningsTzs };
}

export function datesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && startB < endA;
}

export const BLOCKING_BOOKING_STATUSES = [
  'PENDING_APPROVAL',
  'APPROVED',
  'PAYMENT_PENDING',
  'PAYMENT_FAILED',
  'PAID',
  'ACTIVE',
  'EXPIRING',
  'DISPUTED',
] as const;

export function addMonthsIsoDate(startDate: string, months: number): string {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    const fallback = new Date();
    fallback.setUTCMonth(fallback.getUTCMonth() + months);
    return fallback.toISOString().slice(0, 10);
  }
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + months);
  return end.toISOString().slice(0, 10);
}
