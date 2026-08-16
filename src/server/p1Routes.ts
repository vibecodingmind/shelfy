import fs from 'fs';
import path from 'path';
import { Express, Response } from 'express';
import { dbEngine } from './db.js';
import { AuthenticatedRequest, logAuditEvent, requireAuth, requireRole } from './auth.js';
import { newId } from './domain/ids.js';
import { quoteCancellation } from './domain/cancellation.js';
import { listingStatusOf, shopReadyToSubmit, shelfReadyToSubmit } from './domain/listings.js';
import { canOpenDispute, canReviewBooking, validRating } from './domain/reviews.js';
import { gpsWithinRadius } from './domain/gps.js';
import { quoteWithdrawal } from './domain/withdrawals.js';
import { isDataUrlImage, shelfShouldBeAvailable, tickBookingStatuses } from './domain/operations.js';
import { assertTransition } from './domain/bookingMachine.js';
import {
  completePayoutInLedger,
  failPayoutInLedger,
  financeSummaryForHost,
  holdWithdrawalInLedger,
  refundBookingInLedger,
  releaseHostEarnings,
} from './services/finance.js';

function notify(userId: string, title: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT' = 'INFO') {
  dbEngine.db.notifications.push({
    id: newId('notif'),
    userId,
    title,
    message,
    type,
    createdAt: new Date().toISOString(),
  });
}

function enqueueVerification(subjectType: 'SHOP' | 'SHELF' | 'HOST' | 'VENDOR' | 'USER', subjectId: string, requestedBy: string) {
  const existing = dbEngine.db.verificationRequests.find(
    (v) => v.subjectId === subjectId && v.subjectType === subjectType && (v.status === 'PENDING' || v.status === 'UNDER_REVIEW')
  );
  if (existing) return existing;
  const now = new Date().toISOString();
  const request = {
    id: newId('vr'),
    subjectType,
    subjectId,
    requestedBy,
    status: 'PENDING' as const,
    createdAt: now,
    updatedAt: now,
  };
  dbEngine.db.verificationRequests.push(request);
  return request;
}

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

export function runBookingMaintenance(now = new Date()) {
  const changes = tickBookingStatuses({
    bookings: dbEngine.db.bookings,
    now,
    graceHours: dbEngine.db.settings.bookingGraceHours || 24,
  });
  for (const change of changes) {
    const booking = dbEngine.db.bookings.find((b) => b.id === change.bookingId);
    if (!booking) continue;
    if (change.reminder === 'ONE_DAY') {
      const title = `Rental ends tomorrow: ${booking.shelfName}`;
      if (!dbEngine.db.notifications.some((n) => n.userId === booking.vendorId && n.title === title)) {
        notify(booking.vendorId, title, `${booking.shelfName} ends on ${booking.endDate}. Plan restock pickup.`, 'WARNING');
        notify(booking.hostId, title, `${booking.shelfName} ends tomorrow.`, 'INFO');
      }
      continue;
    }
    booking.status = change.to;
    booking.updatedAt = now.toISOString();
    history(booking.id, change.from, change.to, undefined, 'SYSTEM', 'Scheduled booking maintenance');
    if (change.releaseHost) {
      releaseHostEarnings(dbEngine.db, booking);
      notify(booking.hostId, 'Booking completed', `${booking.shelfName} is complete. TZS ${booking.hostEarningsTzs.toLocaleString()} is now available to withdraw.`, 'SUCCESS');
      notify(booking.vendorId, 'Booking completed', `Your rental of ${booking.shelfName} has ended.`, 'INFO');
    } else {
      notify(booking.vendorId, 'Booking expiring', `${booking.shelfName} expires on ${booking.endDate}.`, 'WARNING');
      notify(booking.hostId, 'Booking expiring', `${booking.shelfName} is in its final week.`, 'INFO');
    }
    const shelf = dbEngine.db.shelves.find((s) => s.id === booking.shelfId);
    if (shelf && shelfShouldBeAvailable(shelf.id, dbEngine.db.bookings)) {
      shelf.availabilityStatus = 'AVAILABLE';
    }
  }
  if (changes.length) void dbEngine.saveAsync();
  return changes;
}

export function registerP1Routes(app: Express) {
  app.put('/api/shops/:id', requireAuth, requireRole('HOST', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
    const shop = dbEngine.db.shops.find((s) => s.id === req.params.id);
    if (!shop) return res.status(404).json({ success: false, error: { message: 'Shop not found.' } });
    if (req.user!.role !== 'ADMIN' && shop.hostId !== req.user!.id) {
      return res.status(403).json({ success: false, error: { message: 'You do not own this shop.' } });
    }
    const allowed = ['name', 'description', 'address', 'city', 'region', 'latitude', 'longitude', 'photos', 'shopType'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) (shop as any)[key] = req.body[key];
    }
    shop.updatedAt = new Date().toISOString();
    if (listingStatusOf(shop) === 'PUBLISHED') {
      shop.listingStatus = 'SUBMITTED';
      shop.verificationStatus = 'PENDING';
      enqueueVerification('SHOP', shop.id, req.user!.id);
    }
    void dbEngine.saveAsync();
    res.json({ success: true, data: shop });
  });

  app.put('/api/shelves/:id', requireAuth, requireRole('HOST', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
    const shelf = dbEngine.db.shelves.find((s) => s.id === req.params.id);
    if (!shelf) return res.status(404).json({ success: false, error: { message: 'Shelf not found.' } });
    const shop = dbEngine.db.shops.find((s) => s.id === shelf.shopId);
    if (req.user!.role !== 'ADMIN' && shop?.hostId !== req.user!.id) {
      return res.status(403).json({ success: false, error: { message: 'You do not own this shelf.' } });
    }
    const allowed = ['name', 'description', 'widthCm', 'heightCm', 'depthCm', 'shelfType', 'locationInsideShop', 'monthlyPriceTzs', 'allowedCategories', 'photos'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) (shelf as any)[key] = req.body[key];
    }
    shelf.updatedAt = new Date().toISOString();
    if (listingStatusOf(shelf) === 'PUBLISHED') {
      shelf.listingStatus = 'SUBMITTED';
      shelf.verificationStatus = 'PENDING';
      enqueueVerification('SHELF', shelf.id, req.user!.id);
    }
    void dbEngine.saveAsync();
    res.json({ success: true, data: shelf });
  });

  app.post('/api/listings/:type/:id/submit', requireAuth, requireRole('HOST', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
    const type = req.params.type;
    const now = new Date().toISOString();
    if (type === 'shop') {
      const shop = dbEngine.db.shops.find((s) => s.id === req.params.id);
      if (!shop) return res.status(404).json({ success: false, error: { message: 'Shop not found.' } });
      if (req.user!.role !== 'ADMIN' && shop.hostId !== req.user!.id) {
        return res.status(403).json({ success: false, error: { message: 'You do not own this shop.' } });
      }
      const ready = shopReadyToSubmit(shop);
      if (ready.ok === false) {
        return res.status(400).json({ success: false, error: { message: `Complete the listing first: ${ready.missing.join(', ')}.` } });
      }
      shop.listingStatus = 'SUBMITTED';
      shop.verificationStatus = 'PENDING';
      shop.updatedAt = now;
      enqueueVerification('SHOP', shop.id, req.user!.id);
      void dbEngine.saveAsync();
      return res.json({ success: true, data: shop });
    }
    const shelf = dbEngine.db.shelves.find((s) => s.id === req.params.id);
    if (!shelf) return res.status(404).json({ success: false, error: { message: 'Shelf not found.' } });
    const shop = dbEngine.db.shops.find((s) => s.id === shelf.shopId);
    if (req.user!.role !== 'ADMIN' && shop?.hostId !== req.user!.id) {
      return res.status(403).json({ success: false, error: { message: 'You do not own this shelf.' } });
    }
    const ready = shelfReadyToSubmit(shelf);
    if (ready.ok === false) {
      return res.status(400).json({ success: false, error: { message: `Complete the listing first: ${ready.missing.join(', ')}.` } });
    }
    shelf.listingStatus = 'SUBMITTED';
    shelf.verificationStatus = 'PENDING';
    shelf.updatedAt = now;
    enqueueVerification('SHELF', shelf.id, req.user!.id);
    void dbEngine.saveAsync();
    res.json({ success: true, data: shelf });
  });

  app.get('/api/admin/verifications', requireAuth, requireRole('ADMIN'), (_req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, data: dbEngine.db.verificationRequests });
  });

  app.post('/api/admin/verifications/:id/decide', requireAuth, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
    const request = dbEngine.db.verificationRequests.find((v) => v.id === req.params.id);
    if (!request) return res.status(404).json({ success: false, error: { message: 'Verification request not found.' } });
    const status = String(req.body.status || '');
    if (!['VERIFIED', 'REJECTED', 'SUSPENDED', 'UNDER_REVIEW'].includes(status)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid verification decision.' } });
    }
    const now = new Date().toISOString();
    request.status = status as any;
    request.notes = req.body.notes;
    request.reviewedBy = req.user!.id;
    request.updatedAt = now;

    if (request.subjectType === 'SHOP') {
      const shop = dbEngine.db.shops.find((s) => s.id === request.subjectId);
      if (shop) {
        shop.verificationStatus = status === 'UNDER_REVIEW' ? 'PENDING' : (status as any);
        shop.listingStatus = status === 'VERIFIED' ? 'PUBLISHED' : status === 'REJECTED' ? 'REJECTED' : status === 'SUSPENDED' ? 'SUSPENDED' : 'UNDER_REVIEW';
        shop.updatedAt = now;
        notify(shop.hostId, 'Shop verification update', `${shop.name} is now ${shop.listingStatus}.`, status === 'VERIFIED' ? 'SUCCESS' : 'WARNING');
      }
    }
    if (request.subjectType === 'SHELF') {
      const shelf = dbEngine.db.shelves.find((s) => s.id === request.subjectId);
      if (shelf) {
        shelf.verificationStatus = status === 'UNDER_REVIEW' ? 'PENDING' : (status as any);
        shelf.listingStatus = status === 'VERIFIED' ? 'PUBLISHED' : status === 'REJECTED' ? 'REJECTED' : status === 'SUSPENDED' ? 'SUSPENDED' : 'UNDER_REVIEW';
        shelf.updatedAt = now;
        const shop = dbEngine.db.shops.find((s) => s.id === shelf.shopId);
        if (shop) notify(shop.hostId, 'Shelf verification update', `${shelf.name} is now ${shelf.listingStatus}.`, status === 'VERIFIED' ? 'SUCCESS' : 'WARNING');
      }
    }
    if (request.subjectType === 'HOST' || request.subjectType === 'VENDOR' || request.subjectType === 'USER') {
      const profile = request.subjectType === 'VENDOR'
        ? dbEngine.db.vendorProfiles.find((p) => p.userId === request.subjectId || p.id === request.subjectId)
        : dbEngine.db.hostProfiles.find((p) => p.userId === request.subjectId || p.id === request.subjectId);
      if (profile) profile.verificationStatus = status === 'UNDER_REVIEW' ? 'PENDING' : (status as any);
    }

    void dbEngine.saveAsync();
    logAuditEvent(req.user!.id, req.user!.name, req.user!.role, 'VERIFICATION_DECISION', request.subjectType, request.subjectId, status);
    res.json({ success: true, data: request });
  });

  app.post('/api/bookings/:id/cancel', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const booking = dbEngine.db.bookings.find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: { message: 'Booking not found.' } });
    if (user.role !== 'ADMIN' && user.id !== booking.vendorId && user.id !== booking.hostId) {
      return res.status(403).json({ success: false, error: { message: 'You cannot cancel this booking.' } });
    }
    try {
      assertTransition(booking.status, 'CANCELLED', user.role);
    } catch (err: any) {
      return res.status(400).json({ success: false, error: { message: err.message } });
    }
    const quote = quoteCancellation({
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      startDate: booking.startDate,
      totalPriceTzs: booking.totalPriceTzs,
      platformFeeTzs: booking.platformFeeTzs,
      hostEarningsTzs: booking.hostEarningsTzs,
      actor: user.role,
      freeCancelDays: dbEngine.db.settings.freeCancelDays,
      cancellationFeePercent: dbEngine.db.settings.cancellationFeePercent,
    });
    if (!quote.allowed) {
      return res.status(400).json({ success: false, error: { message: quote.reason } });
    }
    const from = booking.status;
    booking.status = 'CANCELLED';
    booking.updatedAt = new Date().toISOString();
    history(booking.id, from, 'CANCELLED', user.id, user.role, req.body.reason);
    if (quote.moneyMoved) {
      refundBookingInLedger(dbEngine.db, {
        id: booking.id,
        vendorId: booking.vendorId,
        hostId: booking.hostId,
        refundVendorTzs: quote.refundVendorTzs,
        reverseHostTzs: quote.reverseHostTzs,
        reverseCommissionTzs: quote.reverseCommissionTzs,
        cancellationFeeTzs: quote.cancellationFeeTzs,
      });
      if (quote.refundVendorTzs > 0) booking.paymentStatus = 'REFUNDED';
    }
    const shelf = dbEngine.db.shelves.find((s) => s.id === booking.shelfId);
    if (shelf && shelfShouldBeAvailable(shelf.id, dbEngine.db.bookings)) shelf.availabilityStatus = 'AVAILABLE';
    notify(booking.vendorId, 'Booking cancelled', `Booking for ${booking.shelfName} was cancelled. Refund TZS ${quote.refundVendorTzs.toLocaleString()}.`, 'WARNING');
    notify(booking.hostId, 'Booking cancelled', `${booking.shelfName} was cancelled.`, 'WARNING');
    await dbEngine.saveAsync();
    res.json({ success: true, data: { booking, quote } });
  });

  app.get('/api/withdrawals', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    let rows = [...(dbEngine.db.withdrawals || [])];
    if (user.role === 'HOST') rows = rows.filter((w) => w.hostId === user.id);
    else if (user.role !== 'ADMIN') return res.status(403).json({ success: false, error: { message: 'Withdrawals are for hosts and admins.' } });
    res.json({ success: true, data: rows });
  });

  app.post('/api/withdrawals', requireAuth, requireRole('HOST'), async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const amountTzs = Math.round(Number(req.body.amountTzs));
    const summary = financeSummaryForHost(dbEngine.db, user.id);
    const check = quoteWithdrawal({
      amountTzs,
      availableTzs: summary.availableTzs,
      minWithdrawalTzs: summary.minWithdrawalTzs,
      existing: (dbEngine.db.withdrawals || []).filter((w) => w.hostId === user.id),
    });
    if (check.ok === false) return res.status(400).json({ success: false, error: { message: check.message } });
    const now = new Date().toISOString();
    const withdrawal = {
      id: newId('wd'),
      hostId: user.id,
      amountTzs,
      method: String(req.body.method || 'MOBILE_MONEY'),
      status: 'PENDING' as const,
      createdAt: now,
      updatedAt: now,
    };
    dbEngine.db.withdrawals.push(withdrawal);
    holdWithdrawalInLedger(dbEngine.db, user.id, amountTzs, withdrawal.id);
    notify(user.id, 'Withdrawal requested', `TZS ${amountTzs.toLocaleString()} is pending admin review.`, 'INFO');
    await dbEngine.saveAsync();
    logAuditEvent(user.id, user.name, user.role, 'WITHDRAWAL_REQUESTED', 'Withdrawal', withdrawal.id);
    res.json({ success: true, data: withdrawal });
  });

  app.post('/api/admin/withdrawals/:id/approve', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    const withdrawal = dbEngine.db.withdrawals.find((w) => w.id === req.params.id);
    if (!withdrawal || withdrawal.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: { message: 'Withdrawal is not pending approval.' } });
    }
    withdrawal.status = 'APPROVED';
    withdrawal.updatedAt = new Date().toISOString();
    notify(withdrawal.hostId, 'Withdrawal approved', `TZS ${withdrawal.amountTzs.toLocaleString()} was approved.`, 'SUCCESS');
    await dbEngine.saveAsync();
    res.json({ success: true, data: withdrawal });
  });

  app.post('/api/admin/withdrawals/:id/process', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    const withdrawal = dbEngine.db.withdrawals.find((w) => w.id === req.params.id);
    if (!withdrawal || !['APPROVED', 'PROCESSING'].includes(withdrawal.status)) {
      return res.status(400).json({ success: false, error: { message: 'Withdrawal is not ready to process.' } });
    }
    const reference = String(req.body.payoutReference || '').trim();
    if (!reference) return res.status(400).json({ success: false, error: { message: 'Payout reference is required.' } });
    withdrawal.status = 'COMPLETED';
    withdrawal.payoutReference = reference;
    withdrawal.updatedAt = new Date().toISOString();
    completePayoutInLedger(dbEngine.db, withdrawal.hostId, withdrawal.amountTzs, withdrawal.id);
    dbEngine.db.payouts.push({
      id: newId('po'),
      hostId: withdrawal.hostId,
      grossAmountTzs: withdrawal.amountTzs,
      commissionTzs: 0,
      netAmountTzs: withdrawal.amountTzs,
      status: 'COMPLETED',
      payoutReference: reference,
      paidAt: withdrawal.updatedAt,
      createdAt: withdrawal.updatedAt,
    });
    notify(withdrawal.hostId, 'Payout completed', `TZS ${withdrawal.amountTzs.toLocaleString()} sent. Ref ${reference}.`, 'SUCCESS');
    await dbEngine.saveAsync();
    logAuditEvent(req.user!.id, req.user!.name, req.user!.role, 'PAYOUT_COMPLETED', 'Withdrawal', withdrawal.id, reference);
    res.json({ success: true, data: withdrawal });
  });

  app.post('/api/admin/withdrawals/:id/fail', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    const withdrawal = dbEngine.db.withdrawals.find((w) => w.id === req.params.id);
    if (!withdrawal || !['PENDING', 'APPROVED', 'PROCESSING'].includes(withdrawal.status)) {
      return res.status(400).json({ success: false, error: { message: 'Withdrawal cannot be failed.' } });
    }
    withdrawal.status = 'FAILED';
    withdrawal.failureReason = String(req.body.reason || 'Payout failed');
    withdrawal.updatedAt = new Date().toISOString();
    failPayoutInLedger(dbEngine.db, withdrawal.hostId, withdrawal.amountTzs, withdrawal.id);
    notify(withdrawal.hostId, 'Payout failed', 'The withdrawal failed and the available balance was restored.', 'ALERT');
    await dbEngine.saveAsync();
    res.json({ success: true, data: withdrawal });
  });

  app.post('/api/field-visits/:id/check-in', requireAuth, requireRole('FIELD_AGENT', 'ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    const visit = dbEngine.db.fieldVisits.find((v) => v.id === req.params.id);
    if (!visit) return res.status(404).json({ success: false, error: { message: 'Visit not found.' } });
    if (req.user!.role !== 'ADMIN' && visit.agentId !== req.user!.id) {
      return res.status(403).json({ success: false, error: { message: 'This visit is not assigned to you.' } });
    }
    const shop = dbEngine.db.shops.find((s) => s.id === visit.shopId);
    const shopLat = visit.shopLatitude ?? shop?.latitude;
    const shopLng = visit.shopLongitude ?? shop?.longitude;
    const userLat = Number(req.body.latitude);
    const userLng = Number(req.body.longitude);
    if (!Number.isFinite(shopLat) || !Number.isFinite(shopLng)) {
      return res.status(400).json({ success: false, error: { message: 'This shop has no coordinates. Admin must set the shop location.' } });
    }
    if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
      return res.status(400).json({ success: false, error: { message: 'Live GPS coordinates are required.' } });
    }
    const check = gpsWithinRadius({ shopLat: shopLat!, shopLng: shopLng!, userLat, userLng });
    if (!check.ok) {
      return res.status(400).json({
        success: false,
        error: { message: `You are ${check.meters}m from the shop. Check in within ${check.maxMeters}m of the listed coordinates.` },
        data: check,
      });
    }
    visit.latitude = userLat;
    visit.longitude = userLng;
    visit.checkedInAt = new Date().toISOString();
    visit.startedAt = visit.startedAt || visit.checkedInAt;
    visit.status = 'IN_PROGRESS';
    await dbEngine.saveAsync();
    res.json({ success: true, data: { visit, gps: check } });
  });

  app.post('/api/uploads', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const dataUrl = String(req.body.dataUrl || '');
    const check = isDataUrlImage(dataUrl);
    if (check.ok === false) return res.status(400).json({ success: false, error: { message: check.message } });
    const ext = check.mime.includes('png') ? 'png' : check.mime.includes('webp') ? 'webp' : 'jpg';
    const id = newId('up');
    const dir = path.resolve(process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(process.cwd(), 'data'), 'uploads');
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${id}.${ext}`;
    fs.writeFileSync(path.join(dir, filename), Buffer.from(dataUrl.split(',')[1], 'base64'));
    res.json({ success: true, data: { id, url: `/uploads/${filename}`, kind: req.body.kind || 'generic' } });
  });

  app.post('/api/jobs/booking-maintenance', requireAuth, requireRole('ADMIN'), (_req: AuthenticatedRequest, res: Response) => {
    const changes = runBookingMaintenance();
    res.json({ success: true, data: { changes } });
  });

  app.get('/api/reviews', (req: AuthenticatedRequest, res: Response) => {
    const targetId = req.query.targetId ? String(req.query.targetId) : '';
    const bookingId = req.query.bookingId ? String(req.query.bookingId) : '';
    let rows = [...dbEngine.db.reviews];
    if (targetId) rows = rows.filter((r) => r.targetId === targetId);
    if (bookingId) rows = rows.filter((r) => r.bookingId === bookingId);
    res.json({ success: true, data: rows });
  });

  app.post('/api/reviews', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const booking = dbEngine.db.bookings.find((b) => b.id === req.body.bookingId);
    if (!booking) return res.status(404).json({ success: false, error: { message: 'Booking not found.' } });
    const rating = Number(req.body.rating);
    if (!validRating(rating)) return res.status(400).json({ success: false, error: { message: 'Rating must be an integer from 1 to 5.' } });
    const check = canReviewBooking({
      status: booking.status,
      reviewerId: user.id,
      vendorId: booking.vendorId,
      hostId: booking.hostId,
      existing: dbEngine.db.reviews,
      bookingId: booking.id,
    });
    if (check.ok === false) return res.status(400).json({ success: false, error: { message: check.message } });
    const targetId = check.targetRole === 'HOST' ? booking.shelfId : booking.vendorId;
    const now = new Date().toISOString();
    const review = {
      id: newId('rev'),
      bookingId: booking.id,
      reviewerId: user.id,
      reviewerName: user.name,
      reviewerRole: user.role,
      targetId,
      rating,
      comment: String(req.body.comment || '').slice(0, 1000),
      createdAt: now,
    };
    dbEngine.db.reviews.push(review);
    if (check.targetRole === 'HOST') {
      const shelf = dbEngine.db.shelves.find((s) => s.id === booking.shelfId);
      if (shelf) {
        const shelfReviews = dbEngine.db.reviews.filter((r) => r.targetId === shelf.id);
        shelf.reviewCount = shelfReviews.length;
        shelf.avgRating = Math.round((shelfReviews.reduce((sum, r) => sum + r.rating, 0) / shelfReviews.length) * 10) / 10;
      }
    }
    notify(check.targetRole === 'HOST' ? booking.hostId : booking.vendorId, 'New review', `${user.name} left a ${rating}-star review.`, 'INFO');
    void dbEngine.saveAsync();
    res.json({ success: true, data: review });
  });

  app.get('/api/disputes', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    let rows = [...dbEngine.db.disputes];
    if (user.role !== 'ADMIN') {
      rows = rows.filter((d) => d.raisedById === user.id || d.againstId === user.id);
    }
    res.json({ success: true, data: rows });
  });

  app.post('/api/bookings/:id/dispute', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const booking = dbEngine.db.bookings.find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: { message: 'Booking not found.' } });
    const reason = String(req.body.reason || '').trim();
    if (reason.length < 10) return res.status(400).json({ success: false, error: { message: 'Describe the dispute in at least 10 characters.' } });
    const existingOpen = dbEngine.db.disputes.some((d) => d.bookingId === booking.id && (d.status === 'OPEN' || d.status === 'UNDER_REVIEW'));
    const check = canOpenDispute({
      status: booking.status,
      actorId: user.id,
      actorRole: user.role,
      vendorId: booking.vendorId,
      hostId: booking.hostId,
      existingOpen,
    });
    if (check.ok === false) return res.status(400).json({ success: false, error: { message: check.message } });
    try {
      assertTransition(booking.status, 'DISPUTED', user.role);
    } catch (err: any) {
      return res.status(400).json({ success: false, error: { message: err.message } });
    }
    const from = booking.status;
    booking.status = 'DISPUTED';
    booking.updatedAt = new Date().toISOString();
    history(booking.id, from, 'DISPUTED', user.id, user.role, reason);
    const againstId = user.id === booking.vendorId ? booking.hostId : booking.vendorId;
    const against = dbEngine.db.users.find((u) => u.id === againstId);
    const dispute = {
      id: newId('dsp'),
      bookingId: booking.id,
      raisedById: user.id,
      raisedByName: user.name,
      againstId,
      againstName: against?.name || 'Counterparty',
      reason,
      status: 'OPEN' as const,
      createdAt: booking.updatedAt,
      updatedAt: booking.updatedAt,
    };
    dbEngine.db.disputes.push(dispute);
    notify(againstId, 'Dispute opened', `${user.name} opened a dispute on ${booking.shelfName}.`, 'ALERT');
    await dbEngine.saveAsync();
    logAuditEvent(user.id, user.name, user.role, 'DISPUTE_OPENED', 'Booking', booking.id, reason);
    res.json({ success: true, data: { booking, dispute } });
  });

  app.post('/api/admin/disputes/:id/resolve', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    const dispute = dbEngine.db.disputes.find((d) => d.id === req.params.id);
    if (!dispute || !['OPEN', 'UNDER_REVIEW'].includes(dispute.status)) {
      return res.status(400).json({ success: false, error: { message: 'Dispute is not open.' } });
    }
    const nextBookingStatus = String(req.body.bookingStatus || 'COMPLETED');
    if (!['ACTIVE', 'COMPLETED', 'CANCELLED'].includes(nextBookingStatus)) {
      return res.status(400).json({ success: false, error: { message: 'Resolve to ACTIVE, COMPLETED, or CANCELLED.' } });
    }
    const booking = dbEngine.db.bookings.find((b) => b.id === dispute.bookingId);
    if (booking) {
      try {
        assertTransition(booking.status, nextBookingStatus as any, 'ADMIN');
      } catch (err: any) {
        return res.status(400).json({ success: false, error: { message: err.message } });
      }
      const from = booking.status;
      booking.status = nextBookingStatus as any;
      booking.updatedAt = new Date().toISOString();
      history(booking.id, from, booking.status, req.user!.id, 'ADMIN', req.body.resolutionDetails);
      if (nextBookingStatus === 'COMPLETED') {
        releaseHostEarnings(dbEngine.db, booking);
      }
    }
    dispute.status = String(req.body.status || 'RESOLVED') === 'DISMISSED' ? 'DISMISSED' : 'RESOLVED';
    dispute.resolutionDetails = String(req.body.resolutionDetails || '');
    dispute.resolvedById = req.user!.id;
    dispute.updatedAt = new Date().toISOString();
    notify(dispute.raisedById, 'Dispute update', `Dispute ${dispute.status.toLowerCase()}.`, 'INFO');
    notify(dispute.againstId, 'Dispute update', `Dispute ${dispute.status.toLowerCase()}.`, 'INFO');
    await dbEngine.saveAsync();
    logAuditEvent(req.user!.id, req.user!.name, req.user!.role, 'DISPUTE_RESOLVED', 'Dispute', dispute.id, dispute.status);
    res.json({ success: true, data: dispute });
  });
}
