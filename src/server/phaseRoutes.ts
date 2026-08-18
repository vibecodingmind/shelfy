import { Express, Response } from 'express';
import { dbEngine } from './db.js';
import { AuthenticatedRequest, logAuditEvent, requireAuth, requireRole } from './auth.js';
import { newId } from './domain/ids.js';
import { notify } from './services/notify.js';
import { vendorAnalytics, hostAnalytics } from './domain/analytics.js';
import { buildBookingReceipt, bookingsToCsv } from './domain/exports.js';
import { buildInspectionSummary } from './domain/inspectionSummary.js';
import {
  canRenewBooking,
  findRenewalOverlap,
  initialRenewalStatus,
  quoteRenewal,
} from './domain/renewals.js';
import { shelfMatchesSearch, findNewMatchesForSearch } from './domain/savedSearches.js';
import { suggestDynamicPrice } from './domain/dynamicPricing.js';
import { createEnterpriseAccount, addEnterpriseMember } from './domain/enterprise.js';
import { executeAutomatedPayout } from './domain/payoutAutomation.js';
import { quoteMultiCheckout } from './domain/multiCheckout.js';
import { publicShelves } from './domain/listings.js';
import { addMonthsIsoDate, BLOCKING_BOOKING_STATUSES, datesOverlap } from './domain/pricing.js';
import { NotificationPreference, SavedSearch } from '../types/index.js';
import { completePayoutInLedger } from './services/finance.js';

function history(bookingId: string, from: any, to: any, actorId: string | undefined, actorRole: string, reason?: string) {
  dbEngine.db.bookingStatusHistory.push({
    id: newId('bsh'),
    bookingId,
    fromStatus: from,
    toStatus: to,
    actorId,
    actorRole,
    reason,
    createdAt: new Date().toISOString(),
  });
}

function getNotificationPrefs(userId: string): NotificationPreference {
  const existing = dbEngine.db.notificationPreferences.find((p) => p.userId === userId);
  if (existing) return existing;
  const now = new Date().toISOString();
  const defaults: NotificationPreference = {
    userId,
    emailEnabled: true,
    smsEnabled: true,
    bookingAlerts: true,
    expiryReminders: true,
    savedSearchAlerts: true,
    marketingEmails: false,
    updatedAt: now,
  };
  dbEngine.db.notificationPreferences.push(defaults);
  return defaults;
}

function appUrl(): string {
  return process.env.APP_URL?.trim() || process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : 'http://localhost:3000';
}

export function registerPhaseRoutes(app: Express) {
  // Phase A: Booking history timeline
  app.get('/api/bookings/:id/history', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const booking = dbEngine.db.bookings.find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: { message: 'Booking not found.' } });
    const user = req.user!;
    if (user.role !== 'ADMIN' && booking.vendorId !== user.id && booking.hostId !== user.id) {
      return res.status(403).json({ success: false, error: { message: 'Access denied.' } });
    }
    const rows = dbEngine.db.bookingStatusHistory
      .filter((h) => h.bookingId === booking.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    res.json({ success: true, data: rows });
  });

  // Phase A: Receipt
  app.get('/api/bookings/:id/receipt', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const booking = dbEngine.db.bookings.find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: { message: 'Booking not found.' } });
    const user = req.user!;
    if (user.role !== 'ADMIN' && booking.vendorId !== user.id && booking.hostId !== user.id) {
      return res.status(403).json({ success: false, error: { message: 'Access denied.' } });
    }
    const payment = dbEngine.db.payments.find((p) => p.bookingId === booking.id && p.status === 'PAID');
    res.json({ success: true, data: buildBookingReceipt({ booking, payment }) });
  });

  // Phase A: CSV export
  app.get('/api/exports/bookings.csv', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    let bookings = [...dbEngine.db.bookings];
    if (user.role === 'VENDOR') bookings = bookings.filter((b) => b.vendorId === user.id);
    else if (user.role === 'HOST') bookings = bookings.filter((b) => b.hostId === user.id);
    else if (user.role !== 'ADMIN') bookings = [];
    const csv = bookingsToCsv(bookings);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="shelfy-bookings.csv"');
    res.send(csv);
  });

  // Phase A: Inspection summary / trust badges (public)
  app.get('/api/shelves/:id/inspection-summary', (req, res: Response) => {
    const summary = buildInspectionSummary(req.params.id, dbEngine.db);
    if (!summary) return res.status(404).json({ success: false, error: { message: 'Shelf not found.' } });
    res.json({ success: true, data: summary });
  });

  app.get('/api/shelves/:id/reports', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const shelf = dbEngine.db.shelves.find((s) => s.id === req.params.id);
    if (!shelf) return res.status(404).json({ success: false, error: { message: 'Shelf not found.' } });
    const user = req.user!;
    const shop = dbEngine.db.shops.find((s) => s.id === shelf.shopId);
    const isHost = shop?.hostId === user.id;
    const hasBooking = dbEngine.db.bookings.some(
      (b) => b.shelfId === shelf.id && (b.vendorId === user.id || b.hostId === user.id)
    );
    if (user.role !== 'ADMIN' && user.role !== 'FIELD_AGENT' && !isHost && !hasBooking) {
      return res.status(403).json({ success: false, error: { message: 'Access denied.' } });
    }
    const reports = dbEngine.db.shelfReports
      .filter((r) => r.shelfId === shelf.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
    res.json({ success: true, data: reports });
  });

  // Phase A: Notification preferences
  app.get('/api/notification-preferences', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, data: getNotificationPrefs(req.user!.id) });
  });

  app.put('/api/notification-preferences', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const prefs = getNotificationPrefs(req.user!.id);
    const allowed = ['emailEnabled', 'smsEnabled', 'bookingAlerts', 'expiryReminders', 'savedSearchAlerts', 'marketingEmails'] as const;
    for (const key of allowed) {
      if (req.body[key] !== undefined) (prefs as any)[key] = Boolean(req.body[key]);
    }
    prefs.updatedAt = new Date().toISOString();
    void dbEngine.saveAsync();
    res.json({ success: true, data: prefs });
  });

  // Phase B: Renewal
  app.post('/api/bookings/:id/renew', requireAuth, requireRole('VENDOR', 'ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    const booking = dbEngine.db.bookings.find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: { message: 'Booking not found.' } });
    const user = req.user!;
    if (user.role !== 'ADMIN' && booking.vendorId !== user.id) {
      return res.status(403).json({ success: false, error: { message: 'You can only renew your own bookings.' } });
    }
    const check = canRenewBooking(booking);
    if (check.ok === false) return res.status(400).json({ success: false, error: { message: check.message } });

    const durationMonths = Math.max(1, Math.floor(Number(req.body.durationMonths) || 1));
    const { startDate, endDate, quote } = quoteRenewal({
      booking,
      durationMonths,
      commissionPercentage: dbEngine.db.settings.commissionPercentage,
    });

    const overlap = findRenewalOverlap(booking.shelfId, startDate, endDate, dbEngine.db.bookings, booking.id);
    if (overlap) {
      return res.status(400).json({
        success: false,
        error: { message: `Shelf unavailable ${overlap.startDate} to ${overlap.endDate}.` },
      });
    }

    const now = new Date().toISOString();
    const status = initialRenewalStatus(Boolean(dbEngine.db.settings.autoApproveBookings));
    const renewal = {
      id: newId('bk'),
      vendorId: booking.vendorId,
      vendorName: booking.vendorName,
      vendorBusinessName: booking.vendorBusinessName,
      shelfId: booking.shelfId,
      shelfName: booking.shelfName,
      shopName: booking.shopName,
      shopCity: booking.shopCity,
      hostId: booking.hostId,
      startDate,
      endDate,
      durationMonths: quote.durationMonths,
      monthlyPriceTzs: quote.monthlyPriceTzs,
      totalPriceTzs: quote.totalPriceTzs,
      platformFeeTzs: quote.platformFeeTzs,
      hostEarningsTzs: quote.hostEarningsTzs,
      status,
      paymentStatus: 'PENDING' as const,
      notes: `[RENEWAL] Renewed from ${booking.id}`,
      createdAt: now,
      updatedAt: now,
    };

    dbEngine.db.bookings.push(renewal);
    history(renewal.id, undefined, status, user.id, user.role, `Renewal of ${booking.id}`);
    notify(booking.hostId, 'Booking renewal request', `${booking.vendorName} renewed "${booking.shelfName}" for ${durationMonths} month(s).`, 'INFO');
    void dbEngine.saveAsync();
    res.json({ success: true, data: renewal });
  });

  // Phase B: Saved searches
  app.get('/api/saved-searches', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const rows = dbEngine.db.savedSearches.filter((s) => s.userId === req.user!.id);
    res.json({ success: true, data: rows });
  });

  app.post('/api/saved-searches', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const now = new Date().toISOString();
    const row: SavedSearch = {
      id: newId('ss'),
      userId: req.user!.id,
      name: String(req.body.name || 'My search').trim(),
      query: req.body.query?.trim(),
      city: req.body.city?.trim(),
      category: req.body.category?.trim(),
      maxPriceTzs: req.body.maxPriceTzs ? Number(req.body.maxPriceTzs) : undefined,
      shelfType: req.body.shelfType?.trim(),
      alertsEnabled: req.body.alertsEnabled !== false,
      createdAt: now,
      updatedAt: now,
    };
    dbEngine.db.savedSearches.push(row);
    void dbEngine.saveAsync();
    res.json({ success: true, data: row });
  });

  app.put('/api/saved-searches/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const row = dbEngine.db.savedSearches.find((s) => s.id === req.params.id && s.userId === req.user!.id);
    if (!row) return res.status(404).json({ success: false, error: { message: 'Saved search not found.' } });
    const allowed = ['name', 'query', 'city', 'category', 'maxPriceTzs', 'shelfType', 'alertsEnabled'] as const;
    for (const key of allowed) {
      if (req.body[key] !== undefined) (row as any)[key] = req.body[key];
    }
    row.updatedAt = new Date().toISOString();
    void dbEngine.saveAsync();
    res.json({ success: true, data: row });
  });

  app.delete('/api/saved-searches/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const idx = dbEngine.db.savedSearches.findIndex((s) => s.id === req.params.id && s.userId === req.user!.id);
    if (idx < 0) return res.status(404).json({ success: false, error: { message: 'Saved search not found.' } });
    dbEngine.db.savedSearches.splice(idx, 1);
    void dbEngine.saveAsync();
    res.json({ success: true, data: { deleted: true } });
  });

  app.post('/api/saved-searches/run-alerts', requireAuth, requireRole('ADMIN'), (_req, res: Response) => {
    const publicList = publicShelves(dbEngine.db.shelves, dbEngine.db.shops);
    let sent = 0;
    for (const search of dbEngine.db.savedSearches.filter((s) => s.alertsEnabled)) {
      const prefs = getNotificationPrefs(search.userId);
      if (!prefs.savedSearchAlerts) continue;
      const known = new Set(
        dbEngine.db.notifications.filter((n) => n.userId === search.userId && n.title.includes(search.name)).map(() => '')
      );
      const matches = findNewMatchesForSearch(search, publicList, known);
      for (const shelf of matches.slice(0, 3)) {
        notify(
          search.userId,
          `New shelf match: ${search.name}`,
          `"${shelf.name}" in ${shelf.shopCity || 'Tanzania'} — TZS ${shelf.monthlyPriceTzs.toLocaleString()}/mo`,
          'INFO'
        );
        sent += 1;
      }
      search.lastAlertAt = new Date().toISOString();
    }
    void dbEngine.saveAsync();
    res.json({ success: true, data: { alertsSent: sent } });
  });

  // Phase C: Analytics
  app.get('/api/analytics/vendor', requireAuth, requireRole('VENDOR', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
    const vendorId = req.user!.role === 'ADMIN' && req.query.vendorId ? String(req.query.vendorId) : req.user!.id;
    res.json({ success: true, data: vendorAnalytics(vendorId, dbEngine.db) });
  });

  app.get('/api/analytics/host', requireAuth, requireRole('HOST', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
    const hostId = req.user!.role === 'ADMIN' && req.query.hostId ? String(req.query.hostId) : req.user!.id;
    res.json({ success: true, data: hostAnalytics(hostId, dbEngine.db) });
  });

  // Phase C: Multi-shelf checkout quote + batch create
  app.post('/api/bookings/quote', requireAuth, requireRole('VENDOR', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
    const lines = Array.isArray(req.body.items) ? req.body.items : [];
    if (!lines.length) return res.status(400).json({ success: false, error: { message: 'At least one shelf required.' } });
    const quote = quoteMultiCheckout({
      lines,
      shelves: dbEngine.db.shelves,
      commissionPercentage: dbEngine.db.settings.commissionPercentage,
    });
    res.json({ success: true, data: quote });
  });

  app.post('/api/bookings/batch', requireAuth, requireRole('VENDOR', 'ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ success: false, error: { message: 'At least one shelf required.' } });

    const created: any[] = [];
    const errors: string[] = [];

    for (const item of items) {
      const shelf = dbEngine.db.shelves.find((s) => s.id === item.shelfId);
      if (!shelf) {
        errors.push(`Shelf ${item.shelfId} not found`);
        continue;
      }
      const durationMonths = Math.max(1, Math.floor(Number(item.durationMonths) || 1));
      const startKey = item.startDate ? String(item.startDate).slice(0, 10) : new Date().toISOString().slice(0, 10);
      const endKey = addMonthsIsoDate(startKey, durationMonths);
      const overlap = dbEngine.db.bookings.find((b) => {
        if (b.shelfId !== shelf.id) return false;
        if (!BLOCKING_BOOKING_STATUSES.includes(b.status as any)) return false;
        return datesOverlap(startKey, endKey, b.startDate, b.endDate);
      });
      if (overlap) {
        errors.push(`${shelf.name} unavailable ${overlap.startDate}–${overlap.endDate}`);
        continue;
      }
      const quote = quoteMultiCheckout({
        lines: [{ shelfId: shelf.id, durationMonths }],
        shelves: [shelf],
        commissionPercentage: dbEngine.db.settings.commissionPercentage,
      }).items[0];
      const shop = dbEngine.db.shops.find((s) => s.id === shelf.shopId);
      const status = initialRenewalStatus(Boolean(dbEngine.db.settings.autoApproveBookings));
      const now = new Date().toISOString();
      const booking = {
        id: newId('bk'),
        vendorId: user.id,
        vendorName: user.name,
        vendorBusinessName: user.name,
        shelfId: shelf.id,
        shelfName: shelf.name,
        shopName: shelf.shopName || shop?.name,
        shopCity: shelf.shopCity || shop?.city,
        hostId: shop?.hostId || '',
        startDate: startKey,
        endDate: endKey,
        durationMonths,
        monthlyPriceTzs: quote.monthlyPriceTzs,
        totalPriceTzs: quote.totalPriceTzs,
        platformFeeTzs: quote.platformFeeTzs,
        hostEarningsTzs: quote.hostEarningsTzs,
        status,
        paymentStatus: 'PENDING' as const,
        notes: '[MULTI-CHECKOUT]',
        createdAt: now,
        updatedAt: now,
      };
      dbEngine.db.bookings.push(booking);
      history(booking.id, undefined, status, user.id, user.role, 'Multi-shelf checkout');
      notify(booking.hostId, 'New booking request', `${user.name} booked "${shelf.name}" (cart checkout).`, 'INFO');
      created.push(booking);
    }

    void dbEngine.saveAsync();
    res.json({ success: true, data: { bookings: created, errors } });
  });

  // Phase C: Automated payout processing
  app.post('/api/admin/withdrawals/:id/automate', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    const withdrawal = dbEngine.db.withdrawals.find((w) => w.id === req.params.id);
    if (!withdrawal) return res.status(404).json({ success: false, error: { message: 'Withdrawal not found.' } });
    if (withdrawal.status !== 'APPROVED' && withdrawal.status !== 'PROCESSING') {
      return res.status(400).json({ success: false, error: { message: 'Withdrawal must be approved first.' } });
    }
    const host = dbEngine.db.users.find((u) => u.id === withdrawal.hostId);
    if (!host?.phone) {
      return res.status(400).json({ success: false, error: { message: 'Host phone required for automated payout.' } });
    }
    const result = await executeAutomatedPayout({
      hostPhone: host.phone,
      amountTzs: withdrawal.amountTzs,
      withdrawalId: withdrawal.id,
    });
    withdrawal.status = 'PROCESSING';
    withdrawal.payoutReference = result.payoutReference;
    withdrawal.updatedAt = new Date().toISOString();
    completePayoutInLedger(dbEngine.db, withdrawal.hostId, withdrawal.amountTzs, withdrawal.id);
    withdrawal.status = 'COMPLETED';
    notify(withdrawal.hostId, 'Payout sent', `TZS ${withdrawal.amountTzs.toLocaleString()} sent (${result.mode}). Ref: ${result.payoutReference}`, 'SUCCESS');
    void dbEngine.saveAsync();
    logAuditEvent(req.user!.id, req.user!.name, req.user!.role, 'PAYOUT_AUTOMATED', 'Withdrawal', withdrawal.id, result.message);
    res.json({ success: true, data: { withdrawal, automation: result } });
  });

  // Phase D: Enterprise accounts
  app.get('/api/enterprise/account', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const account = dbEngine.db.enterpriseAccounts.find(
      (a) => a.ownerUserId === req.user!.id || a.memberUserIds.includes(req.user!.id)
    );
    res.json({ success: true, data: account || null });
  });

  app.post('/api/enterprise/account', requireAuth, requireRole('VENDOR', 'HOST', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
    const existing = dbEngine.db.enterpriseAccounts.find((a) => a.ownerUserId === req.user!.id);
    if (existing) return res.status(400).json({ success: false, error: { message: 'Enterprise account already exists.' } });
    const account = createEnterpriseAccount({
      owner: req.user!,
      brandName: req.body.brandName,
      businessRegistration: req.body.businessRegistration,
      billingEmail: req.body.billingEmail || req.user!.email,
    });
    dbEngine.db.enterpriseAccounts.push(account);
    void dbEngine.saveAsync();
    res.json({ success: true, data: account });
  });

  app.post('/api/enterprise/account/members', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const account = dbEngine.db.enterpriseAccounts.find((a) => a.ownerUserId === req.user!.id);
    if (!account) return res.status(404).json({ success: false, error: { message: 'Enterprise account not found.' } });
    const member = dbEngine.db.users.find((u) => u.email.toLowerCase() === String(req.body.email || '').toLowerCase());
    if (!member) return res.status(404).json({ success: false, error: { message: 'User not found.' } });
    const updated = addEnterpriseMember(account, member.id);
    const idx = dbEngine.db.enterpriseAccounts.findIndex((a) => a.id === account.id);
    dbEngine.db.enterpriseAccounts[idx] = updated;
    void dbEngine.saveAsync();
    res.json({ success: true, data: updated });
  });

  // Phase D: Dynamic pricing suggestions
  app.get('/api/shelves/:id/pricing-suggestion', requireAuth, requireRole('HOST', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
    const shelf = dbEngine.db.shelves.find((s) => s.id === req.params.id);
    if (!shelf) return res.status(404).json({ success: false, error: { message: 'Shelf not found.' } });
    const shop = dbEngine.db.shops.find((s) => s.id === shelf.shopId);
    if (req.user!.role !== 'ADMIN' && shop?.hostId !== req.user!.id) {
      return res.status(403).json({ success: false, error: { message: 'Access denied.' } });
    }
    res.json({ success: true, data: suggestDynamicPrice({ shelf, bookings: dbEngine.db.bookings }) });
  });

  app.post('/api/shelves/:id/apply-pricing', requireAuth, requireRole('HOST', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
    const shelf = dbEngine.db.shelves.find((s) => s.id === req.params.id);
    if (!shelf) return res.status(404).json({ success: false, error: { message: 'Shelf not found.' } });
    const shop = dbEngine.db.shops.find((s) => s.id === shelf.shopId);
    if (req.user!.role !== 'ADMIN' && shop?.hostId !== req.user!.id) {
      return res.status(403).json({ success: false, error: { message: 'Access denied.' } });
    }
    const price = Number(req.body.monthlyPriceTzs);
    if (!Number.isFinite(price) || price < 10000) {
      return res.status(400).json({ success: false, error: { message: 'Invalid price.' } });
    }
    shelf.monthlyPriceTzs = Math.round(price);
    shelf.updatedAt = new Date().toISOString();
    void dbEngine.saveAsync();
    res.json({ success: true, data: shelf });
  });

  // Phase A: Host pending approval inbox
  app.get('/api/bookings/inbox/pending', requireAuth, requireRole('HOST', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
    let rows = dbEngine.db.bookings.filter((b) => b.status === 'PENDING_APPROVAL');
    if (req.user!.role === 'HOST') rows = rows.filter((b) => b.hostId === req.user!.id);
    rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, data: rows });
  });
}

export function runSavedSearchAlerts() {
  const publicList = publicShelves(dbEngine.db.shelves, dbEngine.db.shops);
  for (const search of dbEngine.db.savedSearches.filter((s) => s.alertsEnabled)) {
    const prefs = getNotificationPrefs(search.userId);
    if (!prefs.savedSearchAlerts) continue;
    const matches = publicList.filter((shelf) => shelfMatchesSearch(shelf, search));
    if (matches.length && (!search.lastAlertAt || Date.now() - new Date(search.lastAlertAt).getTime() > 24 * 60 * 60 * 1000)) {
      const shelf = matches[0];
      notify(
        search.userId,
        `New shelf match: ${search.name}`,
        `"${shelf.name}" in ${shelf.shopCity || 'Tanzania'} — TZS ${shelf.monthlyPriceTzs.toLocaleString()}/mo`,
        'INFO'
      );
      search.lastAlertAt = new Date().toISOString();
    }
  }
}
