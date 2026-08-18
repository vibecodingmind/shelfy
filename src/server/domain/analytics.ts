import { Booking, HostAnalytics, Shelf, VendorAnalytics } from '../../types/index.js';
import { financeSummaryForHost } from '../services/finance.js';
import { DatabaseSchema } from '../seedData.js';

export function vendorAnalytics(vendorId: string, data: Pick<DatabaseSchema, 'bookings'>): VendorAnalytics {
  const mine = data.bookings.filter((b) => b.vendorId === vendorId);
  const active = mine.filter((b) => ['ACTIVE', 'EXPIRING', 'PAID'].includes(b.status));
  const expiringSoon = mine.filter((b) => b.status === 'EXPIRING').length;
  const completed = mine.filter((b) => b.status === 'COMPLETED').length;
  const renewed = mine.filter((b) => b.notes?.includes('[RENEWAL]')).length;

  const cityMap = new Map<string, number>();
  for (const b of mine) {
    const city = b.shopCity || 'Unknown';
    cityMap.set(city, (cityMap.get(city) || 0) + 1);
  }

  const byStatus: Record<string, number> = {};
  for (const b of mine) {
    byStatus[b.status] = (byStatus[b.status] || 0) + 1;
  }

  const totalSpend = mine.filter((b) => b.paymentStatus === 'PAID').reduce((s, b) => s + b.totalPriceTzs, 0);
  const paidCount = mine.filter((b) => b.paymentStatus === 'PAID').length;

  return {
    totalBookings: mine.length,
    activeBookings: active.length,
    totalSpendTzs: totalSpend,
    avgMonthlySpendTzs: paidCount ? Math.round(totalSpend / paidCount) : 0,
    topCities: [...cityMap.entries()]
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    bookingsByStatus: byStatus,
    expiringSoon,
    renewalRatePercent: completed ? Math.round((renewed / completed) * 100) : 0,
  };
}

export function hostAnalytics(
  hostId: string,
  data: Pick<DatabaseSchema, 'bookings' | 'shelves' | 'ledgerAccounts' | 'ledgerEntries' | 'withdrawals'>
): HostAnalytics {
  const mine = data.bookings.filter((b) => b.hostId === hostId);
  const myShelfIds = new Set(
    data.shelves.filter((s) => {
      return mine.some((b) => b.shelfId === s.id);
    }).map((s) => s.id)
  );

  const shelfStats = new Map<string, { shelfName: string; bookings: number; earningsTzs: number }>();
  for (const b of mine) {
    const cur = shelfStats.get(b.shelfId) || { shelfName: b.shelfName || b.shelfId, bookings: 0, earningsTzs: 0 };
    cur.bookings += 1;
    if (b.paymentStatus === 'PAID') cur.earningsTzs += b.hostEarningsTzs;
    shelfStats.set(b.shelfId, cur);
  }

  const byStatus: Record<string, number> = {};
  for (const b of mine) {
    byStatus[b.status] = (byStatus[b.status] || 0) + 1;
  }

  const finance = financeSummaryForHost(
    {
      ...data,
      settings: (data as DatabaseSchema).settings || {
        commissionPercentage: 10,
        autoApproveBookings: false,
        pesapalEnvironment: 'sandbox',
        currency: 'TZS',
        maintenanceMode: false,
        shelfCategories: [],
        shelfTypes: [],
        minWithdrawalTzs: 20000,
      },
    } as DatabaseSchema,
    hostId
  );
  const activeRentals = mine.filter((b) => ['ACTIVE', 'EXPIRING', 'PAID'].includes(b.status)).length;
  const totalSlots = Math.max(1, myShelfIds.size);
  const occupied = mine.filter((b) => ['ACTIVE', 'EXPIRING'].includes(b.status)).length;

  return {
    totalBookings: mine.length,
    pendingApprovals: mine.filter((b) => b.status === 'PENDING_APPROVAL').length,
    activeRentals,
    totalEarningsTzs: finance.totalEarnedTzs,
    availableBalanceTzs: finance.availableTzs,
    occupancyRatePercent: Math.round((occupied / totalSlots) * 100),
    topShelves: [...shelfStats.entries()]
      .map(([shelfId, s]) => ({ shelfId, ...s }))
      .sort((a, b) => b.earningsTzs - a.earningsTzs)
      .slice(0, 5),
    bookingsByStatus: byStatus,
  };
}
