import { dbEngine } from '../db.js';

function parseRange(from?: string, to?: string): { start: Date; end: Date } {
  const end = to ? new Date(`${to}T23:59:59.999Z`) : new Date();
  const start = from ? new Date(`${from}T00:00:00.000Z`) : new Date(end.getTime() - 30 * 86400000);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const now = new Date();
    return { start: new Date(now.getTime() - 30 * 86400000), end: now };
  }
  return { start, end };
}

function inRange(iso: string, start: Date, end: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function bucketKey(iso: string, granularity: 'day' | 'week'): string {
  const d = new Date(iso);
  if (granularity === 'week') {
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
    return monday.toISOString().slice(0, 10);
  }
  return iso.slice(0, 10);
}

export function buildAdminAnalytics(query: { from?: string; to?: string; granularity?: string }) {
  const { start, end } = parseRange(query.from, query.to);
  const granularity = query.granularity === 'week' ? 'week' : 'day';
  const db = dbEngine.db;

  const usersInRange = db.users.filter((u) => inRange(u.createdAt, start, end));
  const bookingsInRange = db.bookings.filter((b) => inRange(b.createdAt, start, end));
  const paymentsInRange = db.payments.filter((p) => inRange(p.createdAt, start, end));

  const registrationsSeries: Record<string, number> = {};
  for (const u of usersInRange) {
    const k = bucketKey(u.createdAt, granularity);
    registrationsSeries[k] = (registrationsSeries[k] || 0) + 1;
  }

  const revenueSeries: Record<string, number> = {};
  const paymentSuccessSeries: Record<string, number> = {};
  const paymentFailSeries: Record<string, number> = {};
  for (const p of paymentsInRange) {
    const k = bucketKey(p.createdAt, granularity);
    if (p.status === 'PAID') {
      revenueSeries[k] = (revenueSeries[k] || 0) + p.amountTzs;
      paymentSuccessSeries[k] = (paymentSuccessSeries[k] || 0) + 1;
    } else if (p.status === 'FAILED') {
      paymentFailSeries[k] = (paymentFailSeries[k] || 0) + 1;
    }
  }

  const bookingsSeries: Record<string, number> = {};
  for (const b of bookingsInRange) {
    const k = bucketKey(b.createdAt, granularity);
    bookingsSeries[k] = (bookingsSeries[k] || 0) + 1;
  }

  const activeSubs = (db.subscriptions || []).filter((s) => s.status === 'ACTIVE' || s.status === 'TRIAL').length;
  const expiringSubs = (db.subscriptions || []).filter((s) => {
    if (s.status !== 'ACTIVE') return false;
    const endAt = new Date(s.currentPeriodEnd).getTime();
    const now = Date.now();
    return endAt > now && endAt - now < 14 * 86400000;
  }).length;

  return {
    range: { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10), granularity },
    kpis: {
      totalUsers: db.users.length,
      usersRegisteredInRange: usersInRange.length,
      vendors: db.users.filter((u) => u.role === 'VENDOR').length,
      hosts: db.users.filter((u) => u.role === 'HOST').length,
      agents: db.users.filter((u) => u.role === 'FIELD_AGENT').length,
      admins: db.users.filter((u) => u.role === 'ADMIN').length,
      activeAccounts: db.users.filter((u) => u.status === 'ACTIVE').length,
      suspendedAccounts: db.users.filter((u) => u.status === 'SUSPENDED').length,
      products: db.products.length,
      shops: db.shops.length,
      shelves: db.shelves.length,
      bookingsTotal: db.bookings.length,
      bookingsInRange: bookingsInRange.length,
      pendingBookings: db.bookings.filter((b) => ['PENDING_APPROVAL', 'PAYMENT_PENDING', 'DRAFT'].includes(b.status)).length,
      completedBookings: db.bookings.filter((b) => b.status === 'COMPLETED').length,
      paymentsSuccessful: db.payments.filter((p) => p.status === 'PAID').length,
      paymentsPending: db.payments.filter((p) => p.status === 'PENDING').length,
      paymentsFailed: db.payments.filter((p) => p.status === 'FAILED').length,
      revenueTzsInRange: paymentsInRange.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amountTzs, 0),
      platformFeesTzs: db.bookings.filter((b) => b.paymentStatus === 'PAID').reduce((s, b) => s + b.platformFeeTzs, 0),
      pendingWithdrawals: db.withdrawals.filter((w) => w.status === 'PENDING' || w.status === 'APPROVED').length,
      pendingVerifications: db.verificationRequests.filter((v) => v.status === 'PENDING' || v.status === 'UNDER_REVIEW').length,
      pendingInspections: db.fieldVisits.filter((v) => v.status === 'SCHEDULED' || v.status === 'PENDING').length,
      activeSubscriptions: activeSubs,
      expiringSubscriptions: expiringSubs,
    },
    series: {
      registrations: Object.entries(registrationsSeries).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
      revenueTzs: Object.entries(revenueSeries).sort(([a], [b]) => a.localeCompare(b)).map(([date, amountTzs]) => ({ date, amountTzs })),
      bookings: Object.entries(bookingsSeries).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
      paymentsSuccess: Object.entries(paymentSuccessSeries).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
      paymentsFailed: Object.entries(paymentFailSeries).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
    },
  };
}
