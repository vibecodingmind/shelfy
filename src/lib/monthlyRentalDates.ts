/** Client-side date helpers aligned with `src/server/domain/pricing.ts`. */

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

export function addDaysIsoDate(startDate: string, days: number): string {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return startDate;
  start.setUTCDate(start.getUTCDate() + days);
  return start.toISOString().slice(0, 10);
}

export function datesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && startB < endA;
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** A calendar day is occupied if it falls inside [range.start, range.end) */
export function isDayOccupied(dateStr: string, bookedRanges: { startDate: string; endDate: string }[]): boolean {
  for (const range of bookedRanges) {
    if (dateStr >= range.startDate && dateStr < range.endDate) return true;
  }
  return false;
}

export function rangeOverlapsAnyBooking(
  start: string,
  end: string,
  bookedRanges: { startDate: string; endDate: string }[]
): boolean {
  return bookedRanges.some((r) => datesOverlap(start, end, r.startDate, r.endDate));
}

export function durationMonthsFromRange(start: string, end: string): number {
  const startD = new Date(`${start}T00:00:00.000Z`);
  const endD = new Date(`${end}T00:00:00.000Z`);
  if (Number.isNaN(startD.getTime()) || Number.isNaN(endD.getTime())) return 1;
  let months = (endD.getUTCFullYear() - startD.getUTCFullYear()) * 12 + (endD.getUTCMonth() - startD.getUTCMonth());
  if (endD.getUTCDate() > startD.getUTCDate()) months += 1;
  if (endD.getUTCDate() < startD.getUTCDate()) months -= 1;
  return Math.max(1, months);
}

export function findEarliestAvailableStart(
  bookedRanges: { startDate: string; endDate: string }[],
  durationMonths: number,
  fromDate: string
): string | null {
  let candidate = fromDate;
  for (let i = 0; i < 800; i++) {
    const end = addMonthsIsoDate(candidate, durationMonths);
    if (!rangeOverlapsAnyBooking(candidate, end, bookedRanges)) return candidate;
    candidate = addDaysIsoDate(candidate, 1);
  }
  return null;
}

export function formatShortDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
