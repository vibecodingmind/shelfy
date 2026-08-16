/**
 * Shelfy 🇹🇿 — Express Server & API Gateway
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { dbEngine } from './src/server/db.js';
import { requireAuth, requireRole, generateToken, logAuditEvent, AuthenticatedRequest, optionalAuth, ACCESS_TOKEN_TTL_SECONDS } from './src/server/auth.js';
import { analyzeShelfPhoto, recommendShelves, generateVendorInsights } from './src/server/ai.js';
import { BookingStatus, User, UserRole } from './src/types/index.js';
import { validatePassword, demoLoginAllowed, isDemoEmail } from './src/server/domain/passwords.js';
import { publicUser, publicUsers } from './src/server/domain/publicUser.js';
import { addMonthsIsoDate, BLOCKING_BOOKING_STATUSES, calculateBookingQuote, datesOverlap } from './src/server/domain/pricing.js';
import { assertTransition, initialBookingStatus, normalizeHostApproval } from './src/server/domain/bookingMachine.js';
import { canMessageBookingCounterparties } from './src/server/domain/messages.js';
import { canAccessBooking, canSelfRegister, isUserStatus } from './src/server/domain/rbac.js';
import { newId } from './src/server/domain/ids.js';
import { capturePaymentInLedger, financeSummaryForHost } from './src/server/services/finance.js';
import { publicShops, publicShelves } from './src/server/domain/listings.js';
import { uniqueSlug, findByIdOrSlug } from './src/server/domain/slugs.js';
import { occupancySummary, occupancyWindow } from './src/server/domain/occupancy.js';
import { registerP1Routes, runBookingMaintenance } from './src/server/p1Routes.js';
import { paymentsDueForReconcile } from './src/server/domain/reconcile.js';
import { createAuthToken, consumeAuthToken, verifySandboxSignature, rotateRefreshToken, revokeAuthTokens, REFRESH_TOKEN_TTL_MS } from './src/server/services/tokens.js';
import { notify, dispatchExternalChannels } from './src/server/services/notify.js';
import { uploadsDir } from './src/server/services/storage.js';
import { opsHealthSnapshot } from './src/server/domain/opsHealth.js';
import { ensureJwtSecret, resolvedAppUrl } from './src/server/services/jwtSecret.js';
import { requestLogMiddleware } from './src/server/middleware/requestLog.js';
import { corsOrigin, securityHeadersMiddleware } from './src/server/middleware/securityHeaders.js';
import {
  amountsMatch,
  getTransactionStatus,
  mapPesapalStatus,
  pesapalConfigured,
  pesapalEnvironment,
  registerIpn,
  submitOrderRequest,
} from './src/server/payments/pesapal.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.set('trust proxy', 1);
app.use(cors({ origin: corsOrigin() }));
app.use(securityHeadersMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(requestLogMiddleware);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many authentication attempts. Try again later.' } },
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many payment requests. Try again later.' } },
});

function recordBookingHistory(
  bookingId: string,
  fromStatus: BookingStatus | undefined,
  toStatus: BookingStatus,
  actorId: string | undefined,
  actorRole: string,
  reason?: string
) {
  dbEngine.db.bookingStatusHistory.push({
    id: newId('bsh'),
    bookingId,
    fromStatus,
    toStatus,
    actorId,
    actorRole,
    reason,
    createdAt: new Date().toISOString(),
  });
}

function issueSession(user: User) {
  const token = generateToken(user);
  const refresh = createAuthToken(dbEngine.db, user.id, 'REFRESH', REFRESH_TOKEN_TTL_MS);
  return { token, refreshToken: refresh.raw, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
}

function appUrl(): string {
  return resolvedAppUrl(process.env, PORT);
}

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'Shelfy 🇹🇿',
    tagline: 'The retail expansion platform for Tanzania',
    timestamp: new Date().toISOString(),
    db: dbEngine.stats(),
    ...opsHealthSnapshot(),
  });
});

// ==========================================
// 1. AUTHENTICATION & PROFILE ROUTES
// ==========================================

// POST /api/auth/register
app.post('/api/auth/register', authLimiter, (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, role, businessName, businessRegistration, description, category, city, address } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ success: false, error: { message: 'Missing required registration fields.' } });
    }

    if (!canSelfRegister(role)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Self-registration is only available for Vendors and Hosts. Field agents and admins are invited by the platform.' },
      });
    }

    const passwordCheck = validatePassword(password);
    if (passwordCheck.ok === false) {
      return res.status(400).json({ success: false, error: { message: passwordCheck.message } });
    }

    const existing = dbEngine.db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ success: false, error: { message: 'An account with this email already exists.' } });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const userId = newId('usr');
    const now = new Date().toISOString();

    const newUser = {
      id: userId,
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      passwordHash,
      role: role as UserRole,
      status: 'PENDING' as const,
      failedLoginCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    dbEngine.db.users.push(newUser);

    if (role === 'VENDOR') {
      dbEngine.db.vendorProfiles.push({
        id: newId('vp'),
        userId,
        businessName: businessName || `${name}'s Business`,
        businessRegistration: businessRegistration || '',
        description: description || '',
        category: category || 'General Merchandise',
        address: address || 'Dar es Salaam',
        city: city || 'Dar es Salaam',
        region: city || 'Dar es Salaam',
        country: 'Tanzania',
        verificationStatus: 'PENDING',
      });
    } else if (role === 'HOST') {
      dbEngine.db.hostProfiles.push({
        id: newId('hp'),
        userId,
        businessName: businessName || `${name}'s Shop`,
        businessRegistration: businessRegistration || '',
        description: description || '',
        phone: phone || '',
        verificationStatus: 'PENDING',
      });
    }

    const verify = createAuthToken(dbEngine.db, userId, 'EMAIL_VERIFY', 24 * 60 * 60 * 1000);
    void dbEngine.saveAsync();
    logAuditEvent(userId, name, role as UserRole, 'USER_REGISTERED', 'User', userId, `Registered as ${role}`);
    void dispatchExternalChannels({
      email: newUser.email,
      title: 'Verify your Shelfy email',
      message: `Confirm ${newUser.email} to activate your Shelfy account. Verification code: ${verify.raw}`,
      channels: ['EMAIL'],
    });

    const session = issueSession(newUser);
    return res.json({
      success: true,
      data: {
        ...session,
        user: publicUser(newUser),
        emailVerificationRequired: true,
        verifyEmailToken: process.env.NODE_ENV === 'production' ? undefined : verify.raw,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message || 'Registration failed.' } });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', authLimiter, (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: { message: 'Email and password required.' } });
    }

    if (isDemoEmail(email) && !demoLoginAllowed()) {
      return res.status(403).json({ success: false, error: { message: 'Demo login is disabled in this environment.' } });
    }

    const user = dbEngine.db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
    if (!user) {
      return res.status(401).json({ success: false, error: { message: 'Invalid credentials.' } });
    }

    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
      return res.status(423).json({ success: false, error: { message: 'Account temporarily locked after failed sign-in attempts.' } });
    }

    const validPassword = bcrypt.compareSync(password, user.passwordHash);
    if (!validPassword) {
      user.failedLoginCount = (user.failedLoginCount || 0) + 1;
      if (user.failedLoginCount >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        user.failedLoginCount = 0;
      }
      user.updatedAt = new Date().toISOString();
      void dbEngine.saveAsync();
      return res.status(401).json({ success: false, error: { message: 'Invalid credentials.' } });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ success: false, error: { message: 'Your account has been suspended by Admin.' } });
    }

    user.failedLoginCount = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date().toISOString();
    void dbEngine.saveAsync();

    const session = issueSession(user);
    const vendorProfile = dbEngine.db.vendorProfiles.find((v) => v.userId === user.id);
    const hostProfile = dbEngine.db.hostProfiles.find((h) => h.userId === user.id);

    return res.json({
      success: true,
      data: {
        ...session,
        user: publicUser(user),
        vendorProfile,
        hostProfile,
        emailVerified: Boolean(user.emailVerifiedAt),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message || 'Login failed.' } });
  }
});

app.post('/api/auth/verify-email', authLimiter, (req: Request, res: Response) => {
  const consumed = consumeAuthToken(dbEngine.db, 'EMAIL_VERIFY', String(req.body.token || ''));
  if (!consumed) {
    return res.status(400).json({ success: false, error: { message: 'Invalid or expired verification token.' } });
  }
  const user = dbEngine.db.users.find((u) => u.id === consumed.userId);
  if (!user) return res.status(404).json({ success: false, error: { message: 'User not found.' } });
  user.emailVerifiedAt = new Date().toISOString();
  if (user.status === 'PENDING') user.status = 'ACTIVE';
  user.updatedAt = user.emailVerifiedAt;
  void dbEngine.saveAsync();
  res.json({ success: true, data: { user: publicUser(user) } });
});

app.post('/api/auth/resend-verification', requireAuth, authLimiter, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const verify = createAuthToken(dbEngine.db, user.id, 'EMAIL_VERIFY', 24 * 60 * 60 * 1000);
  void dbEngine.saveAsync();
  void dispatchExternalChannels({
    email: user.email,
    title: 'Verify your Shelfy email',
    message: `Confirm ${user.email} to activate your Shelfy account. Verification code: ${verify.raw}`,
    channels: ['EMAIL'],
  });
  res.json({
    success: true,
    data: { sent: true, verifyEmailToken: process.env.NODE_ENV === 'production' ? undefined : verify.raw },
  });
});

app.post('/api/auth/forgot-password', authLimiter, (req: Request, res: Response) => {
  const email = String(req.body.email || '').toLowerCase();
  const user = dbEngine.db.users.find((u) => u.email === email);
  let resetToken: string | undefined;
  if (user) {
    resetToken = createAuthToken(dbEngine.db, user.id, 'PASSWORD_RESET', 60 * 60 * 1000).raw;
    void dbEngine.saveAsync();
    void dispatchExternalChannels({
      email: user.email,
      title: 'Reset your Shelfy password',
      message: `Use this code within one hour to reset your password: ${resetToken}`,
      channels: ['EMAIL'],
    });
  }
  res.json({
    success: true,
    data: {
      sent: true,
      resetToken: process.env.NODE_ENV === 'production' ? undefined : resetToken,
    },
  });
});

app.post('/api/auth/reset-password', authLimiter, (req: Request, res: Response) => {
  const passwordCheck = validatePassword(String(req.body.password || ''));
  if (passwordCheck.ok === false) {
    return res.status(400).json({ success: false, error: { message: passwordCheck.message } });
  }
  const consumed = consumeAuthToken(dbEngine.db, 'PASSWORD_RESET', String(req.body.token || ''));
  if (!consumed) {
    return res.status(400).json({ success: false, error: { message: 'Invalid or expired reset token.' } });
  }
  const user = dbEngine.db.users.find((u) => u.id === consumed.userId);
  if (!user) return res.status(404).json({ success: false, error: { message: 'User not found.' } });
  user.passwordHash = bcrypt.hashSync(req.body.password, 10);
  user.failedLoginCount = 0;
  user.lockedUntil = undefined;
  user.updatedAt = new Date().toISOString();
  revokeAuthTokens(dbEngine.db, user.id, 'REFRESH');
  void dbEngine.saveAsync();
  logAuditEvent(user.id, user.name, user.role, 'PASSWORD_RESET', 'User', user.id);
  res.json({ success: true, data: { reset: true } });
});

app.post('/api/auth/request-phone-otp', requireAuth, authLimiter, (req: AuthenticatedRequest, res: Response) => {
  const otp = createAuthToken(dbEngine.db, req.user!.id, 'PHONE_OTP', 10 * 60 * 1000);
  void dbEngine.saveAsync();
  void dispatchExternalChannels({
    phone: req.user!.phone,
    title: 'Shelfy phone verification',
    message: `Your Shelfy code is ${otp.raw}. It expires in 10 minutes.`,
    channels: ['SMS'],
  });
  res.json({
    success: true,
    data: { sent: true, otp: process.env.NODE_ENV === 'production' ? undefined : otp.raw },
  });
});

app.post('/api/auth/verify-phone', requireAuth, authLimiter, (req: AuthenticatedRequest, res: Response) => {
  const consumed = consumeAuthToken(dbEngine.db, 'PHONE_OTP', String(req.body.otp || ''));
  if (!consumed || consumed.userId !== req.user!.id) {
    return res.status(400).json({ success: false, error: { message: 'Invalid or expired OTP.' } });
  }
  req.user!.phoneVerifiedAt = new Date().toISOString();
  void dbEngine.saveAsync();
  res.json({ success: true, data: { user: publicUser(req.user!) } });
});

app.post('/api/auth/refresh', authLimiter, (req: Request, res: Response) => {
  const rotated = rotateRefreshToken(dbEngine.db, String(req.body.refreshToken || ''));
  if (!rotated) {
    return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Refresh token is invalid or expired.' } });
  }
  const user = dbEngine.db.users.find((u) => u.id === rotated.userId);
  if (!user || user.status === 'SUSPENDED') {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User account not found or suspended.' } });
  }
  const token = generateToken(user);
  void dbEngine.saveAsync();
  return res.json({
    success: true,
    data: {
      token,
      refreshToken: rotated.raw,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      user: publicUser(user),
    },
  });
});

app.post('/api/auth/logout', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const raw = String(req.body?.refreshToken || '');
  let userId = req.user?.id;
  if (raw) {
    const consumed = consumeAuthToken(dbEngine.db, 'REFRESH', raw);
    if (consumed) userId = consumed.userId;
  }
  if (userId) revokeAuthTokens(dbEngine.db, userId, 'REFRESH');
  void dbEngine.saveAsync();
  res.json({ success: true, data: { loggedOut: true } });
});

// GET /api/auth/me
app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const vendorProfile = dbEngine.db.vendorProfiles.find((v) => v.userId === user.id);
  const hostProfile = dbEngine.db.hostProfiles.find((h) => h.userId === user.id);

  res.json({
    success: true,
    data: {
      user: publicUser(user),
      vendorProfile,
      hostProfile,
    },
  });
});

// ==========================================
// 2. SHOPS & SHELVES (MARKETPLACE)
// ==========================================

// GET /api/shops
app.get('/api/shops', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  let shops = publicShops(dbEngine.db.shops, req.user);
  const { city, hostId, search } = req.query;

  if (city) shops = shops.filter((s) => s.city.toLowerCase() === String(city).toLowerCase());
  if (hostId) shops = shops.filter((s) => s.hostId === String(hostId));
  if (search) {
    const q = String(search).toLowerCase();
    shops = shops.filter((s) => s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  }

  res.json({ success: true, data: shops });
});

// POST /api/shops
app.post('/api/shops', requireAuth, requireRole('HOST', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { name, description, address, city, region, latitude, longitude, photos, shopType } = req.body;
  const user = req.user!;

  if (!name || !address || !city) {
    return res.status(400).json({ success: false, error: { message: 'Shop name, address, and city are required.' } });
  }

  const shopId = `shop_${Date.now()}`;
  const now = new Date().toISOString();

  const newShop = {
    id: shopId,
    hostId: user.id,
    hostName: user.name,
    name,
    description: description || '',
    address,
    city,
    region: region || city,
    latitude: Number.isFinite(Number(latitude)) ? Number(latitude) : -6.7924,
    longitude: Number.isFinite(Number(longitude)) ? Number(longitude) : 39.2083,
    photos: photos && photos.length ? photos : ['https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800'],
    status: 'ACTIVE' as const,
    verificationStatus: 'PENDING' as const,
    listingStatus: 'DRAFT' as const,
    slug: uniqueSlug(`${city} ${name}`, dbEngine.db.shops.map((s) => s.slug || '')),
    footTrafficScore: 8,
    shopType: shopType || 'SUPERMARKET',
    createdAt: now,
    updatedAt: now,
  };

  dbEngine.db.shops.push(newShop);
  dbEngine.save();
  logAuditEvent(user.id, user.name, user.role, 'SHOP_CREATED', 'Shop', shopId, `Created shop "${name}" in ${city}`);

  res.json({ success: true, data: newShop });
});

// GET /api/shelves (Public Search & Filter)
app.get('/api/shelves', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  let shelves = publicShelves(dbEngine.db.shelves, dbEngine.db.shops, req.user);
  const { city, category, minPrice, maxPrice, shelfType, availability, search, shopId } = req.query;

  if (shopId) shelves = shelves.filter((s) => s.shopId === String(shopId));
  if (city) shelves = shelves.filter((s) => s.shopCity?.toLowerCase() === String(city).toLowerCase());
  if (availability) shelves = shelves.filter((s) => s.availabilityStatus === String(availability));
  if (shelfType) shelves = shelves.filter((s) => s.shelfType === String(shelfType));
  if (category) {
    const cat = String(category).toLowerCase();
    shelves = shelves.filter((s) => s.allowedCategories.some((c) => c.toLowerCase().includes(cat)));
  }
  if (minPrice) shelves = shelves.filter((s) => s.monthlyPriceTzs >= Number(minPrice));
  if (maxPrice) shelves = shelves.filter((s) => s.monthlyPriceTzs <= Number(maxPrice));
  if (search) {
    const q = String(search).toLowerCase();
    shelves = shelves.filter((s) => s.name.toLowerCase().includes(q) || s.shopName?.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  }

  res.json({ success: true, data: shelves });
});

// GET /api/shelves/:id
app.get('/api/shelves/:id', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const shelf = findByIdOrSlug(dbEngine.db.shelves, req.params.id);
  if (!shelf) {
    return res.status(404).json({ success: false, error: { message: 'Shelf not found.' } });
  }
  const shopForShelf = dbEngine.db.shops.find((s) => s.id === shelf.shopId);
  const visible = publicShelves([shelf], dbEngine.db.shops, req.user);
  if (!visible.length && shopForShelf && req.user?.role !== 'ADMIN' && shopForShelf.hostId !== req.user?.id) {
    return res.status(404).json({ success: false, error: { message: 'Shelf listing not found.' } });
  }

  const shop = dbEngine.db.shops.find((sp) => sp.id === shelf.shopId);
  const reviews = dbEngine.db.reviews.filter((r) => r.targetId === shelf.id);

  res.json({ success: true, data: { ...shelf, shop, reviews } });
});

// GET /api/shelves/:id/availability (Interactive Calendar Availability & Conflict Check)
app.get('/api/shelves/:id/availability', (req: Request, res: Response) => {
  const shelf = dbEngine.db.shelves.find((s) => s.id === req.params.id);
  if (!shelf) {
    return res.status(404).json({ success: false, error: { message: 'Shelf not found.' } });
  }

  // Get active or paid bookings for this shelf
  const activeBookings = dbEngine.db.bookings.filter(
    (b) => b.shelfId === shelf.id && ['ACTIVE', 'PAID', 'PENDING_APPROVAL', 'PAYMENT_PENDING'].includes(b.status)
  );

  // Generate booked date ranges
  const bookedRanges = activeBookings.map((b) => ({
    bookingId: b.id,
    startDate: b.startDate,
    endDate: b.endDate,
    status: b.status,
    vendorName: b.vendorBusinessName || b.vendorName || 'Booked Vendor',
  }));

  res.json({
    success: true,
    data: {
      shelfId: shelf.id,
      availabilityStatus: shelf.availabilityStatus,
      monthlyPriceTzs: shelf.monthlyPriceTzs,
      bookedRanges,
    },
  });
});

// POST /api/shelves
app.post('/api/shelves', requireAuth, requireRole('HOST', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { shopId, name, description, widthCm, heightCm, depthCm, shelfType, locationInsideShop, monthlyPriceTzs, allowedCategories, photos } = req.body;
  const user = req.user!;

  const shop = dbEngine.db.shops.find((s) => s.id === shopId);
  if (!shop) {
    return res.status(400).json({ success: false, error: { message: 'Invalid shopId provided.' } });
  }

  // Verify ownership
  if (user.role !== 'ADMIN' && shop.hostId !== user.id) {
    return res.status(403).json({ success: false, error: { message: 'You do not own this shop.' } });
  }

  const shelfId = `shelf_${Date.now()}`;
  const now = new Date().toISOString();

  const newShelf = {
    id: shelfId,
    shopId,
    shopName: shop.name,
    shopCity: shop.city,
    shopAddress: shop.address,
    shopLatitude: shop.latitude,
    shopLongitude: shop.longitude,
    hostVerificationStatus: shop.verificationStatus,
    name,
    description: description || '',
    widthCm: Number(widthCm) || 100,
    heightCm: Number(heightCm) || 40,
    depthCm: Number(depthCm) || 40,
    shelfType: shelfType || 'EYE_LEVEL',
    locationInsideShop: locationInsideShop || 'Main Aisle',
    monthlyPriceTzs: Number(monthlyPriceTzs) || 50000,
    availabilityStatus: 'AVAILABLE' as const,
    allowedCategories: allowedCategories || ['Food & Beverages', 'General Merchandise'],
    photos: photos && photos.length ? photos : shop.photos,
    status: 'ACTIVE' as const,
    verificationStatus: 'PENDING' as const,
    listingStatus: 'DRAFT' as const,
    slug: uniqueSlug(`${shop.city} ${shop.name} ${name}`, dbEngine.db.shelves.map((s) => s.slug || '')),
    avgRating: 5.0,
    reviewCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  dbEngine.db.shelves.push(newShelf);
  dbEngine.save();
  logAuditEvent(user.id, user.name, user.role, 'SHELF_CREATED', 'Shelf', shelfId, `Added shelf "${name}" to shop ${shop.name}`);

  res.json({ success: true, data: newShelf });
});

// ==========================================
// 3. BOOKING ENGINE & PAYMENT ARCHITECTURE
// ==========================================

// POST /api/bookings (Vendor books a shelf)
app.post('/api/bookings', requireAuth, requireRole('VENDOR', 'ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const { shelfId, durationMonths, startDate, notes } = req.body;
  const user = req.user!;

  if (user.status !== 'ACTIVE' || !user.emailVerifiedAt) {
    return res.status(403).json({ success: false, error: { message: 'Verify your email before booking a shelf.' } });
  }

  const shelf = dbEngine.db.shelves.find((s) => s.id === shelfId);
  if (!shelf) {
    return res.status(404).json({ success: false, error: { message: 'Shelf not found.' } });
  }
  if (user.role !== 'ADMIN' && !publicShelves([shelf], dbEngine.db.shops, user).length) {
    return res.status(400).json({ success: false, error: { message: 'This shelf is not published yet.' } });
  }

  const quote = calculateBookingQuote({
    monthlyPriceTzs: shelf.monthlyPriceTzs,
    durationMonths,
    commissionPercentage: dbEngine.db.settings.commissionPercentage,
  });
  const startKey = startDate ? String(startDate).slice(0, 10) : new Date().toISOString().slice(0, 10);
  const endKey = addMonthsIsoDate(startKey, quote.durationMonths);

  try {
    const newBooking = await dbEngine.withLock(() => {
      const overlapping = dbEngine.db.bookings.find((b) => {
        if (b.shelfId !== shelfId) return false;
        if (!BLOCKING_BOOKING_STATUSES.includes(b.status as any)) return false;
        return datesOverlap(startKey, endKey, b.startDate, b.endDate);
      });
      if (overlapping) {
        throw Object.assign(new Error(`This shelf is already reserved from ${overlapping.startDate} to ${overlapping.endDate}.`), { status: 400 });
      }

      const shop = dbEngine.db.shops.find((s) => s.id === shelf.shopId);
      const hostId = shop ? shop.hostId : shelf.shopId;
      const bookingId = newId('bk');
      const now = new Date().toISOString();
      const status = initialBookingStatus(Boolean(dbEngine.db.settings.autoApproveBookings));

      const booking = {
        id: bookingId,
        vendorId: user.id,
        vendorName: user.name,
        vendorBusinessName: user.name,
        shelfId,
        shelfName: shelf.name,
        shopName: shelf.shopName || shop?.name || 'Retail Shop',
        shopCity: shelf.shopCity || shop?.city || 'Dar es Salaam',
        hostId,
        startDate: startKey,
        endDate: endKey,
        durationMonths: quote.durationMonths,
        monthlyPriceTzs: quote.monthlyPriceTzs,
        totalPriceTzs: quote.totalPriceTzs,
        platformFeeTzs: quote.platformFeeTzs,
        hostEarningsTzs: quote.hostEarningsTzs,
        status,
        paymentStatus: 'PENDING' as const,
        notes: notes || '',
        createdAt: now,
        updatedAt: now,
      };

      dbEngine.db.bookings.push(booking);
      recordBookingHistory(bookingId, undefined, status, user.id, user.role, 'Booking created');
      notify(hostId, 'New Booking Request 📦', `${user.name} requested to book "${shelf.name}" for ${quote.durationMonths} month(s).`);
      return booking;
    });

    logAuditEvent(user.id, user.name, user.role, 'BOOKING_CREATED', 'Booking', newBooking.id, `Booked shelf ${shelf.name} for ${quote.totalPriceTzs} TZS`);
    res.json({ success: true, data: newBooking });
  } catch (err: any) {
    return res.status(err.status || 500).json({ success: false, error: { message: err.message } });
  }
});

// GET /api/bookings
app.get('/api/bookings', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let bookings = [...dbEngine.db.bookings];

  if (user.role === 'VENDOR') {
    bookings = bookings.filter((b) => b.vendorId === user.id);
  } else if (user.role === 'HOST') {
    bookings = bookings.filter((b) => b.hostId === user.id);
  } else if (user.role !== 'ADMIN') {
    bookings = [];
  }

  res.json({ success: true, data: bookings });
});

// PUT /api/bookings/:id/status (Host approve/reject or admin override)
app.put('/api/bookings/:id/status', requireAuth, requireRole('HOST', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body as { status?: BookingStatus };
  const user = req.user!;
  const booking = dbEngine.db.bookings.find((b) => b.id === req.params.id);

  if (!booking) {
    return res.status(404).json({ success: false, error: { message: 'Booking not found.' } });
  }
  if (user.role === 'HOST' && booking.hostId !== user.id) {
    return res.status(403).json({ success: false, error: { message: 'You can only update bookings for your own shops.' } });
  }

  const nextStatus = status ? normalizeHostApproval(status) : undefined;
  try {
    if (!nextStatus) throw new Error('Status is required.');
    assertTransition(booking.status, nextStatus, user.role);
  } catch (err: any) {
    return res.status(400).json({ success: false, error: { message: err.message } });
  }
  if (['PAID', 'ACTIVE', 'EXPIRING', 'COMPLETED'].includes(booking.status) && nextStatus === 'REJECTED') {
    return res.status(400).json({ success: false, error: { message: 'A paid booking cannot be rejected. Use cancellation or a dispute.' } });
  }

  const fromStatus = booking.status;
  booking.status = nextStatus;
  booking.updatedAt = new Date().toISOString();
  recordBookingHistory(booking.id, fromStatus, nextStatus, user.id, user.role);

  dbEngine.db.notifications.push({
    id: `notif_${Date.now()}_bk`,
    userId: booking.vendorId,
    title: nextStatus === 'REJECTED' ? 'Booking declined' : 'Booking update',
    message:
      nextStatus === 'PAYMENT_PENDING'
        ? `${user.name} approved your request for ${booking.shelfName}. Complete payment to activate the shelf.`
        : `Your booking for ${booking.shelfName} is now ${nextStatus}.`,
    type: nextStatus === 'REJECTED' ? 'WARNING' : 'SUCCESS',
    createdAt: booking.updatedAt,
  });

  dbEngine.save();
  logAuditEvent(user.id, user.name, user.role, 'BOOKING_STATUS_UPDATED', 'Booking', booking.id, `Set status to ${booking.status}`);
  res.json({ success: true, data: booking });
});

// GET /api/payouts
app.get('/api/payouts', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let payouts = [...dbEngine.db.payouts];

  if (user.role === 'HOST') {
    payouts = payouts.filter((p) => p.hostId === user.id);
  } else if (user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, error: { message: 'Payouts are only available to hosts and admins.' } });
  }

  res.json({ success: true, data: payouts });
});

async function applyVerifiedPayment(paymentId: string, trackingId: string, source: string) {
  const payment = dbEngine.db.payments.find((p) => p.id === paymentId);
  if (!payment) throw new Error('Payment not found.');
  const booking = dbEngine.db.bookings.find((b) => b.id === payment.bookingId);
  if (!booking) throw new Error('Booking not found.');

  if (payment.status === 'PAID' && (booking.status === 'PAID' || booking.status === 'ACTIVE')) {
    return { payment, booking, alreadySettled: true };
  }

  const now = new Date().toISOString();
  payment.status = 'PAID';
  payment.paidAt = now;
  payment.pesapalTrackingId = trackingId || payment.pesapalTrackingId;
  dbEngine.db.paymentAttempts.push({
    id: newId('pa'),
    paymentId: payment.id,
    status: 'COMPLETED',
    payload: { source, trackingId },
    createdAt: now,
  });

  const from = booking.status;
  booking.paymentStatus = 'PAID';
  if (booking.status === 'PAYMENT_PENDING' || booking.status === 'PAYMENT_FAILED' || booking.status === 'APPROVED') {
    booking.status = 'PAID';
    recordBookingHistory(booking.id, from, 'PAID', undefined, 'SYSTEM', source);
  }
  if (booking.status === 'PAID') {
    booking.status = 'ACTIVE';
    recordBookingHistory(booking.id, 'PAID', 'ACTIVE', undefined, 'SYSTEM', source);
  }
  booking.updatedAt = now;

  const shelf = dbEngine.db.shelves.find((s) => s.id === booking.shelfId);
  if (shelf) shelf.availabilityStatus = 'BOOKED';

  capturePaymentInLedger(dbEngine.db, booking, payment.id);
  notify(booking.vendorId, 'Payment confirmed', `TZS ${booking.totalPriceTzs.toLocaleString()} received for ${booking.shelfName}.`, 'SUCCESS');
  notify(booking.hostId, 'New paid booking', `${booking.vendorName} paid for ${booking.shelfName}. TZS ${booking.hostEarningsTzs.toLocaleString()} is pending until the booking completes.`, 'SUCCESS');
  await dbEngine.saveAsync();
  return { payment, booking, alreadySettled: false };
}

async function verifyPesapalAndSettle(orderTrackingId: string) {
  const status = await getTransactionStatus(orderTrackingId);
  const payment = dbEngine.db.payments.find(
    (p) => p.pesapalTrackingId === orderTrackingId || p.transactionReference === status.merchant_reference
  );
  if (!payment) {
    throw Object.assign(new Error('No payment matches this PesaPal reference.'), { status: 404 });
  }
  if (!amountsMatch(payment.amountTzs, status.amount) || (status.currency && status.currency !== payment.currency)) {
    dbEngine.db.paymentAttempts.push({
      id: newId('pa'),
      paymentId: payment.id,
      status: 'AMOUNT_MISMATCH',
      payload: status as any,
      createdAt: new Date().toISOString(),
    });
    await dbEngine.saveAsync();
    throw Object.assign(new Error('PesaPal amount/currency does not match the booking.'), { status: 409 });
  }
  const mapped = mapPesapalStatus(status.status_code);
  if (mapped === 'PAID') {
    return applyVerifiedPayment(payment.id, orderTrackingId, 'pesapal_get_transaction_status');
  }
  if (mapped === 'FAILED') {
    payment.status = 'FAILED';
    const booking = dbEngine.db.bookings.find((b) => b.id === payment.bookingId);
    if (booking && booking.status === 'PAYMENT_PENDING') {
      const from = booking.status;
      booking.status = 'PAYMENT_FAILED';
      recordBookingHistory(booking.id, from, 'PAYMENT_FAILED', undefined, 'SYSTEM', 'pesapal_failed');
    }
    await dbEngine.saveAsync();
  }
  return { payment, booking: dbEngine.db.bookings.find((b) => b.id === payment.bookingId), alreadySettled: false, status };
}

export async function runPaymentReconciliation() {
  if (!pesapalConfigured()) return { checked: 0, settled: 0, skipped: 'pesapal_not_configured' as const };
  const ids = paymentsDueForReconcile({ payments: dbEngine.db.payments });
  let settled = 0;
  for (const id of ids) {
    const payment = dbEngine.db.payments.find((p) => p.id === id);
    if (!payment?.pesapalTrackingId) continue;
    try {
      const result = await verifyPesapalAndSettle(payment.pesapalTrackingId);
      if (result.payment.status === 'PAID') settled += 1;
    } catch (err) {
      console.error('Payment reconcile failed', id, err);
    }
  }
  return { checked: ids.length, settled };
}

// POST /api/payments/initiate-session
app.post('/api/payments/initiate-session', paymentLimiter, requireAuth, requireRole('VENDOR', 'ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const { bookingId } = req.body;
  const user = req.user!;

  const booking = dbEngine.db.bookings.find((b) => b.id === bookingId && (user.role === 'ADMIN' || b.vendorId === user.id));
  if (!booking) {
    return res.status(404).json({ success: false, error: { message: 'Booking not found or access denied.' } });
  }
  if (!['APPROVED', 'PAYMENT_PENDING', 'PAYMENT_FAILED'].includes(booking.status)) {
    return res.status(400).json({ success: false, error: { message: `Booking is ${booking.status} and cannot be paid yet.` } });
  }

  const existing = dbEngine.db.payments.find((p) => p.bookingId === booking.id && p.status === 'PENDING');
  const transactionReference = existing?.transactionReference || `SHELFY-${booking.id}-${Date.now()}`;
  const now = new Date().toISOString();
  const payment = existing || {
    id: newId('pay'),
    bookingId: booking.id,
    vendorId: booking.vendorId,
    amountTzs: booking.totalPriceTzs,
    currency: 'TZS',
    provider: 'PESAPAL' as const,
    transactionReference,
    status: 'PENDING' as const,
    createdAt: now,
  };
  if (!existing) dbEngine.db.payments.push(payment);

  let redirectUrl: string | undefined;
  let orderTrackingId = payment.pesapalTrackingId;
  let mode: 'PESAPAL' | 'PENDING_GATEWAY' = 'PENDING_GATEWAY';

  if (pesapalConfigured()) {
    try {
      const ipnId = await registerIpn(`${appUrl()}/api/payments/pesapal/ipn`);
      const submitted = await submitOrderRequest({
        id: transactionReference,
        currency: 'TZS',
        amount: booking.totalPriceTzs,
        description: `Shelfy shelf rental ${booking.shelfName}`,
        callbackUrl: `${appUrl()}/api/payments/pesapal/callback`,
        notificationId: ipnId,
        billingAddress: {
          email_address: user.email,
          phone_number: user.phone,
          first_name: user.name.split(' ')[0] || user.name,
          last_name: user.name.split(' ').slice(1).join(' ') || 'Vendor',
        },
      });
      orderTrackingId = submitted.orderTrackingId;
      redirectUrl = submitted.redirectUrl;
      payment.pesapalTrackingId = submitted.orderTrackingId;
      mode = 'PESAPAL';
    } catch (err: any) {
      dbEngine.db.paymentAttempts.push({
        id: newId('pa'),
        paymentId: payment.id,
        status: 'SUBMIT_FAILED',
        payload: { message: err.message },
        createdAt: now,
      });
    }
  }

  dbEngine.db.paymentAttempts.push({
    id: newId('pa'),
    paymentId: payment.id,
    status: 'INITIATED',
    payload: { mode, transactionReference },
    createdAt: now,
  });
  if (booking.status === 'APPROVED') {
    const from = booking.status;
    booking.status = 'PAYMENT_PENDING';
    recordBookingHistory(booking.id, from, 'PAYMENT_PENDING', user.id, user.role, 'Checkout started');
  }
  await dbEngine.saveAsync();

  res.json({
    success: true,
    data: {
      paymentId: payment.id,
      bookingId: booking.id,
      transactionReference,
      orderTrackingId,
      redirectUrl,
      mode,
      pesapalEnvironment: pesapalEnvironment(),
      amountTzs: booking.totalPriceTzs,
      platformFeeTzs: booking.platformFeeTzs,
      hostEarningsTzs: booking.hostEarningsTzs,
      currency: 'TZS',
      merchantName: 'Shelfy Tanzania Ltd',
      customerName: user.name,
      customerEmail: user.email,
      shelfName: booking.shelfName,
      shopName: booking.shopName,
      durationMonths: booking.durationMonths,
      startDate: booking.startDate,
      endDate: booking.endDate,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      status: payment.status,
      message:
        mode === 'PESAPAL'
          ? 'Continue on PesaPal to complete payment. Shelfy will activate the booking only after GetTransactionStatus confirms COMPLETED.'
          : 'Payment is pending gateway confirmation. This environment has no PesaPal keys; completion requires IPN verification or a signed sandbox complete.',
    },
  });
});

app.post('/api/payments/callback-verify', paymentLimiter, requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  return res.status(410).json({
    success: false,
    error: { message: 'Client-side payment confirmation is disabled. Shelfy verifies PesaPal via GetTransactionStatus / IPN only.' },
  });
});

app.get('/api/payments/pesapal/ipn', paymentLimiter, handlePesapalIpn);
app.post('/api/payments/pesapal/ipn', paymentLimiter, handlePesapalIpn);

async function handlePesapalIpn(req: Request, res: Response) {
  const orderTrackingId = String(req.query.OrderTrackingId || req.body?.OrderTrackingId || req.body?.orderTrackingId || '');
  if (!orderTrackingId) {
    return res.status(400).json({ orderNotificationType: 'IPNCHANGE', status: 500 });
  }
  try {
    if (!pesapalConfigured()) {
      return res.json({ orderNotificationType: 'IPNCHANGE', orderTrackingId, status: 500 });
    }
    const result = await verifyPesapalAndSettle(orderTrackingId);
    return res.json({
      orderNotificationType: 'IPNCHANGE',
      orderTrackingId,
      orderMerchantReference: result.payment.transactionReference,
      status: 200,
    });
  } catch {
    return res.json({ orderNotificationType: 'IPNCHANGE', orderTrackingId, status: 500 });
  }
}

app.get('/api/payments/pesapal/callback', paymentLimiter, async (req: Request, res: Response) => {
  const orderTrackingId = String(req.query.OrderTrackingId || '');
  try {
    if (orderTrackingId && pesapalConfigured()) {
      await verifyPesapalAndSettle(orderTrackingId);
    }
  } catch (err) {
    console.error('PesaPal callback verify failed:', err);
  }
  res.redirect(`/?payment=returned&tracking=${encodeURIComponent(orderTrackingId)}`);
});

app.post('/api/payments/:id/sync', paymentLimiter, requireAuth, requireRole('VENDOR', 'ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const payment = dbEngine.db.payments.find((p) => p.id === req.params.id);
  if (!payment || (req.user!.role !== 'ADMIN' && payment.vendorId !== req.user!.id)) {
    return res.status(404).json({ success: false, error: { message: 'Payment not found.' } });
  }
  if (!payment.pesapalTrackingId || !pesapalConfigured()) {
    return res.json({ success: true, data: { payment, booking: dbEngine.db.bookings.find((b) => b.id === payment.bookingId), pending: true } });
  }
  try {
    const result = await verifyPesapalAndSettle(payment.pesapalTrackingId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.status || 400).json({ success: false, error: { message: err.message } });
  }
});

app.get('/api/payments/by-booking/:bookingId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const booking = dbEngine.db.bookings.find((b) => b.id === req.params.bookingId);
  if (!booking || !canAccessBooking(req.user!, booking)) {
    return res.status(404).json({ success: false, error: { message: 'Booking not found.' } });
  }
  const payments = dbEngine.db.payments.filter((p) => p.bookingId === booking.id);
  res.json({ success: true, data: { booking, payments } });
});

app.post('/api/payments/sandbox-complete', paymentLimiter, async (req: Request, res: Response) => {
  const paymentId = String(req.body.paymentId || '');
  const signature = String(req.headers['x-sandbox-signature'] || req.body.signature || '');
  if (!verifySandboxSignature(paymentId, signature)) {
    return res.status(403).json({ success: false, error: { message: 'Invalid sandbox signature.' } });
  }
  try {
    const result = await applyVerifiedPayment(paymentId, `sandbox_${paymentId}`, 'signed_sandbox');
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

app.post('/api/admin/payments/:id/reconcile', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const payment = dbEngine.db.payments.find((p) => p.id === req.params.id);
  if (!payment) return res.status(404).json({ success: false, error: { message: 'Payment not found.' } });
  if (payment.pesapalTrackingId && pesapalConfigured()) {
    try {
      const result = await verifyPesapalAndSettle(payment.pesapalTrackingId);
      return res.json({ success: true, data: result });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: { message: err.message } });
    }
  }
  return res.status(400).json({ success: false, error: { message: 'No PesaPal tracking id to reconcile. Use signed sandbox complete in non-live setups.' } });
});

app.post('/api/jobs/payment-reconcile', requireAuth, requireRole('ADMIN'), async (_req: AuthenticatedRequest, res: Response) => {
  const result = await runPaymentReconciliation();
  res.json({ success: true, data: result });
});

app.get('/api/finance/summary', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (user.role === 'HOST') {
    return res.json({ success: true, data: financeSummaryForHost(dbEngine.db, user.id) });
  }
  if (user.role === 'ADMIN') {
    const hosts = dbEngine.db.users.filter((u) => u.role === 'HOST').map((h) => ({
      hostId: h.id,
      name: h.name,
      ...financeSummaryForHost(dbEngine.db, h.id),
    }));
    return res.json({ success: true, data: { hosts } });
  }
  return res.status(403).json({ success: false, error: { message: 'Finance summary is available to hosts and admins.' } });
});

app.post('/api/admin/agents', requireAuth, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email) {
    return res.status(400).json({ success: false, error: { message: 'Name and email are required.' } });
  }
  if (dbEngine.db.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
    return res.status(400).json({ success: false, error: { message: 'Email already in use.' } });
  }
  const rawPassword = password || `Agent${Math.floor(100000 + Math.random() * 900000)}!`;
  const passwordCheck = validatePassword(rawPassword);
  if (passwordCheck.ok === false) {
    return res.status(400).json({ success: false, error: { message: passwordCheck.message } });
  }
  const now = new Date().toISOString();
  const user = {
    id: newId('usr'),
    name,
    email: String(email).toLowerCase(),
    phone: phone || '',
    passwordHash: bcrypt.hashSync(rawPassword, 10),
    role: 'FIELD_AGENT' as const,
    status: 'ACTIVE' as const,
    emailVerifiedAt: now,
    failedLoginCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  dbEngine.db.users.push(user);
  void dbEngine.saveAsync();
  logAuditEvent(req.user!.id, req.user!.name, req.user!.role, 'AGENT_INVITED', 'User', user.id);
  res.json({
    success: true,
    data: { user: publicUser(user), temporaryPassword: password ? undefined : rawPassword },
  });
});

// POST /api/payments/checkout — no longer marks paid from the client
app.post('/api/payments/checkout', paymentLimiter, requireAuth, requireRole('VENDOR', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  return res.status(410).json({
    success: false,
    error: { message: 'Use POST /api/payments/initiate-session. The server will not mark a booking paid because the client said so.' },
  });
});

// ==========================================
// 4. VENDOR PRODUCTS & INVENTORY
// ==========================================

// GET /api/products
app.get('/api/products', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let products = [...dbEngine.db.products];

  if (user.role === 'VENDOR') {
    products = products.filter((p) => p.vendorId === user.id);
  } else if (user.role !== 'ADMIN') {
    products = [];
  }

  res.json({ success: true, data: products });
});

// POST /api/products
app.post('/api/products', requireAuth, requireRole('VENDOR', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { name, description, category, sku, priceTzs, images, stockQuantity } = req.body;
  const user = req.user!;

  if (!name || !priceTzs) {
    return res.status(400).json({ success: false, error: { message: 'Product name and price are required.' } });
  }

  const prodId = `prod_${Date.now()}`;
  const now = new Date().toISOString();

  const newProduct = {
    id: prodId,
    vendorId: user.id,
    vendorName: user.name,
    name,
    description: description || '',
    category: category || 'General',
    sku: sku || `SKU-${Date.now().toString().slice(-6)}`,
    priceTzs: Number(priceTzs),
    images: images && images.length ? images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
    status: 'ACTIVE' as const,
    stockQuantity: Number(stockQuantity) || 100,
    createdAt: now,
    updatedAt: now,
  };

  dbEngine.db.products.push(newProduct);
  dbEngine.save();

  res.json({ success: true, data: newProduct });
});

// GET /api/inventory
app.get('/api/inventory', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let inv = [...dbEngine.db.shelfInventory];

  if (user.role === 'VENDOR') {
    inv = inv.filter((i) => i.vendorId === user.id);
  } else if (user.role !== 'ADMIN') {
    inv = [];
  }

  res.json({ success: true, data: inv });
});

// ==========================================
// 5. FIELD AGENT VISITS & SHELF REPORTS
// ==========================================

// GET /api/field-visits
app.get('/api/field-visits', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let visits = [...dbEngine.db.fieldVisits];

  if (user.role === 'FIELD_AGENT') {
    visits = visits.filter((v) => v.agentId === user.id);
  }

  res.json({ success: true, data: visits });
});

// POST /api/field-visits (Admin assigns visit)
app.post('/api/field-visits', requireAuth, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { agentId, shopId, shelfId, scheduledAt, notes } = req.body;
  const user = req.user!;

  const agent = dbEngine.db.users.find((u) => u.id === agentId);
  const shop = dbEngine.db.shops.find((s) => s.id === shopId);
  const shelf = dbEngine.db.shelves.find((s) => s.id === shelfId);

  if (!agent || !shop || !shelf) {
    return res.status(400).json({ success: false, error: { message: 'Invalid agent, shop, or shelf specified.' } });
  }

  const visitId = `visit_${Date.now()}`;
  const now = new Date().toISOString();

  const newVisit = {
    id: visitId,
    agentId,
    agentName: agent.name,
    shopId,
    shopName: shop.name,
    shopAddress: shop.address,
    shopCity: shop.city,
    shelfId,
    shelfName: shelf.name,
    shopLatitude: shop.latitude,
    shopLongitude: shop.longitude,
    scheduledAt: scheduledAt || now,
    status: 'SCHEDULED' as const,
    notes: notes || '',
    createdAt: now,
  };

  dbEngine.db.fieldVisits.push(newVisit);

  dbEngine.db.notifications.push({
    id: `notif_${Date.now()}`,
    userId: agentId,
    title: 'New Visit Assignment 📍',
    message: `You have been assigned to verify "${shelf.name}" at ${shop.name}.`,
    type: 'INFO',
    createdAt: now,
  });

  dbEngine.save();
  res.json({ success: true, data: newVisit });
});

// POST /api/reports (Agent submits shelf report with optional Gemini AI analysis)
app.post('/api/reports', requireAuth, requireRole('FIELD_AGENT', 'ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { visitId, shelfId, shopId, stockLevelPercent, shelfCondition, notes, photos } = req.body;
    const user = req.user!;

    const visit = visitId ? dbEngine.db.fieldVisits.find((v) => v.id === visitId) : undefined;
    if (user.role === 'FIELD_AGENT') {
      if (!visit || visit.agentId !== user.id) {
        return res.status(403).json({ success: false, error: { message: 'Submit reports only for visits assigned to you.' } });
      }
      if (!visit.checkedInAt) {
        return res.status(400).json({ success: false, error: { message: 'Check in at the shop GPS coordinates before submitting a report.' } });
      }
    }

    const reportPhotos = photos && photos.length ? photos : ['https://images.unsplash.com/photo-1583258292688-d02132382025?w=800'];

    // Run AI analysis on photo
    const aiResult = await analyzeShelfPhoto(reportPhotos[0]);

    const reportId = `rep_${Date.now()}`;
    const now = new Date().toISOString();

    const report = {
      id: reportId,
      visitId: visitId || `visit_direct_${Date.now()}`,
      agentId: user.id,
      agentName: user.name,
      shelfId,
      shopId,
      stockLevelPercent: Number(stockLevelPercent) || aiResult.estimatedStockPercent,
      shelfCondition: shelfCondition || 'EXCELLENT',
      notes: notes || 'Field inspection complete.',
      photos: reportPhotos,
      aiAnalysis: aiResult,
      createdAt: now,
    };

    dbEngine.db.shelfReports.push(report);

    // Update visit status if associated
    if (visitId) {
      const visit = dbEngine.db.fieldVisits.find((v) => v.id === visitId);
      if (visit) {
        visit.status = 'COMPLETED';
        visit.completedAt = now;
      }
    }

    dbEngine.save();
    logAuditEvent(user.id, user.name, user.role, 'REPORT_SUBMITTED', 'ShelfReport', reportId, `Submitted inspection report for shelf ${shelfId}`);

    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message || 'Failed to submit report.' } });
  }
});

// GET /api/reports
app.get('/api/reports', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let reports = [...dbEngine.db.shelfReports];

  if (user.role === 'FIELD_AGENT') {
    reports = reports.filter((r) => r.agentId === user.id);
  } else if (user.role === 'VENDOR') {
    const myShelfIds = new Set(dbEngine.db.bookings.filter((b) => b.vendorId === user.id).map((b) => b.shelfId));
    reports = reports.filter((r) => myShelfIds.has(r.shelfId));
  } else if (user.role === 'HOST') {
    const myShopIds = new Set(dbEngine.db.shops.filter((s) => s.hostId === user.id).map((s) => s.id));
    reports = reports.filter((r) => myShopIds.has(r.shopId));
  }

  res.json({ success: true, data: reports });
});

// ==========================================
// 6. MESSAGES & NOTIFICATIONS
// ==========================================

// GET /api/notifications
app.get('/api/notifications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const notifs = dbEngine.db.notifications.filter((n) => n.userId === req.user!.id);
  res.json({ success: true, data: notifs });
});

// POST /api/notifications/read
app.post('/api/notifications/read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { ids } = req.body as { ids?: string[] };
  const now = new Date().toISOString();
  const mine = dbEngine.db.notifications.filter((n) => n.userId === req.user!.id);
  mine.forEach((n) => {
    if (!ids || ids.length === 0 || ids.includes(n.id)) {
      n.readAt = now;
    }
  });
  dbEngine.save();
  res.json({ success: true, data: mine });
});

// GET /api/messages
app.get('/api/messages', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const msgs = dbEngine.db.messages.filter((m) => m.senderId === userId || m.receiverId === userId);
  res.json({ success: true, data: msgs });
});

// POST /api/messages
app.post('/api/messages', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { receiverId, bookingId, content } = req.body;
  const user = req.user!;

  if (!receiverId || !content) {
    return res.status(400).json({ success: false, error: { message: 'Receiver and message content required.' } });
  }
  const booking = bookingId ? dbEngine.db.bookings.find((b) => b.id === bookingId) : undefined;
  const allowed = canMessageBookingCounterparties({
    senderId: user.id,
    senderRole: user.role,
    receiverId,
    booking,
  });
  if (allowed.ok === false) {
    return res.status(403).json({ success: false, error: { message: allowed.message } });
  }

  const msgId = `msg_${Date.now()}`;
  const now = new Date().toISOString();

  const msg = {
    id: msgId,
    senderId: user.id,
    senderName: user.name,
    senderRole: user.role,
    receiverId,
    bookingId,
    content,
    createdAt: now,
  };

  dbEngine.db.messages.push(msg);

  dbEngine.db.notifications.push({
    id: `notif_${Date.now()}`,
    userId: receiverId,
    title: `New Message from ${user.name} 💬`,
    message: content.length > 60 ? `${content.slice(0, 60)}...` : content,
    type: 'INFO',
    createdAt: now,
  });

  dbEngine.save();
  res.json({ success: true, data: msg });
});

// ==========================================
// 7. ADMIN DASHBOARD & CONTROLS
// ==========================================

// GET /api/admin/dashboard
app.get('/api/admin/dashboard', requireAuth, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const usersCount = dbEngine.db.users.length;
  const vendorsCount = dbEngine.db.users.filter((u) => u.role === 'VENDOR').length;
  const hostsCount = dbEngine.db.users.filter((u) => u.role === 'HOST').length;
  const agentsCount = dbEngine.db.users.filter((u) => u.role === 'FIELD_AGENT').length;

  const shopsCount = dbEngine.db.shops.length;
  const shelvesCount = dbEngine.db.shelves.length;
  const activeBookings = dbEngine.db.bookings.filter((b) => b.status === 'ACTIVE').length;

  const totalRevenueTzs = dbEngine.db.payments
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amountTzs, 0);

  const totalCommissionsTzs = dbEngine.db.bookings
    .filter((b) => b.paymentStatus === 'PAID')
    .reduce((sum, b) => sum + b.platformFeeTzs, 0);

  const cityBreakdown = Object.values(
    dbEngine.db.shops.reduce((acc, shop) => {
      acc[shop.city] = acc[shop.city] || { city: shop.city, shops: 0, gmv: 0 };
      acc[shop.city].shops += 1;
      return acc;
    }, {} as Record<string, { city: string; shops: number; gmv: number }>)
  );
  for (const booking of dbEngine.db.bookings.filter((b) => b.paymentStatus === 'PAID')) {
    const row = cityBreakdown.find((c) => c.city === booking.shopCity);
    if (row) row.gmv += booking.totalPriceTzs;
  }

  const window = occupancyWindow();
  const liveShelves = publicShelves(dbEngine.db.shelves, dbEngine.db.shops);
  const occupancy = occupancySummary({
    shelves: liveShelves,
    bookings: dbEngine.db.bookings,
    windowStart: window.windowStart,
    windowEnd: window.windowEnd,
  });

  const stats = {
    usersCount,
    vendorsCount,
    hostsCount,
    agentsCount,
    shopsCount,
    shelvesCount,
    activeBookings,
    totalRevenueTzs,
    totalCommissionsTzs,
    pendingVerifications: dbEngine.db.verificationRequests.filter((v) => v.status === 'PENDING' || v.status === 'UNDER_REVIEW').length,
    pendingWithdrawals: dbEngine.db.withdrawals.filter((w) => w.status === 'PENDING' || w.status === 'APPROVED').length,
    cityBreakdown,
    occupancy,
  };

  res.json({
    success: true,
    data: {
      ...stats,
      stats,
      settings: dbEngine.db.settings,
    },
  });
});

// GET /api/admin/users
app.get('/api/admin/users', requireAuth, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: publicUsers(dbEngine.db.users) });
});

// PUT /api/admin/users/:id/status
app.put('/api/admin/users/:id/status', requireAuth, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;
  const targetUser = dbEngine.db.users.find((u) => u.id === req.params.id);

  if (!targetUser) {
    return res.status(404).json({ success: false, error: { message: 'User not found.' } });
  }
  if (!isUserStatus(String(status || ''))) {
    return res.status(400).json({ success: false, error: { message: 'Invalid user status.' } });
  }

  targetUser.status = status;
  targetUser.updatedAt = new Date().toISOString();
  if (status === 'SUSPENDED') {
    revokeAuthTokens(dbEngine.db, targetUser.id, 'REFRESH');
  }
  void dbEngine.saveAsync();

  logAuditEvent(req.user!.id, req.user!.name, req.user!.role, 'USER_STATUS_UPDATED', 'User', targetUser.id, `Set status to ${status}`);
  res.json({ success: true, data: publicUser(targetUser) });
});

// GET /api/admin/audit-logs
app.get('/api/admin/audit-logs', requireAuth, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: dbEngine.db.auditLogs });
});

// GET /api/settings (Publicly accessible for active shelf categories and types)
app.get('/api/settings', (req: Request, res: Response) => {
  if (!dbEngine.db.settings.shelfCategories || !Array.isArray(dbEngine.db.settings.shelfCategories)) {
    dbEngine.db.settings.shelfCategories = [
      'Food & Beverages',
      'Organic Goods',
      'Cosmetics',
      'Health & Beauty',
      'Spices',
      'Snacks & Confectionery',
      'Dairy & Fresh',
      'Gifts & Crafts',
      'Electronics & Tech',
      'Beverages & Juices',
      'Baked Goods',
      'Supplements & Herbal',
    ];
  }
  if (!dbEngine.db.settings.shelfTypes || !Array.isArray(dbEngine.db.settings.shelfTypes)) {
    dbEngine.db.settings.shelfTypes = [
      { id: 'EYE_LEVEL', name: 'Eye-Level Display', description: 'Optimal line of sight (120–160cm) with maximum shopper gaze capture.', icon: '👁️' },
      { id: 'COUNTER_DISPLAY', name: 'Counter Checkout Box', description: 'High-impulse point-of-sale positioning directly at cashier desk.', icon: '🛒' },
      { id: 'ENTRANCE_DISPLAY', name: 'Entrance Lobby Showcase', description: 'Front-facing glass vitrine seen by 100% of store foot traffic.', icon: '✨' },
      { id: 'REFRIGERATED', name: 'Chilled / Cooler Showcase', description: 'Temperature controlled 2°C–6°C glass case for drinks & dairy.', icon: '❄️' },
      { id: 'TOP_SHELF', name: 'Top Display Rack', description: 'Elevated brand marquee shelf for premium visibility across aisles.', icon: '🔝' },
      { id: 'BOTTOM_SHELF', name: 'Bottom Bulk Shelf', description: 'Deep, heavy-load floor shelf ideal for bulk and family packs.', icon: '📦' },
      { id: 'END_CAP', name: 'Aisle End-Cap Feature', description: 'Prime corner position commanding cross-traffic attention.', icon: '🎯' },
      { id: 'WINDOW_DISPLAY', name: 'Street Window Showcase', description: 'Exterior street-facing glass showcase attracting passersby.', icon: '🪟' },
    ];
  }
  res.json({ success: true, data: dbEngine.db.settings });
});

// PUT /api/admin/settings
app.put('/api/admin/settings', requireAuth, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { commissionPercentage, autoApproveBookings, shelfCategories, shelfTypes } = req.body;
  if (typeof commissionPercentage === 'number') {
    dbEngine.db.settings.commissionPercentage = commissionPercentage;
  }
  if (typeof autoApproveBookings === 'boolean') {
    dbEngine.db.settings.autoApproveBookings = autoApproveBookings;
  }
  if (Array.isArray(shelfCategories)) {
    dbEngine.db.settings.shelfCategories = shelfCategories.filter((c: any) => typeof c === 'string' && c.trim().length > 0);
  }
  if (Array.isArray(shelfTypes)) {
    dbEngine.db.settings.shelfTypes = shelfTypes;
  }
  dbEngine.save();

  logAuditEvent(
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'SETTINGS_UPDATED',
    'PlatformSettings',
    'global',
    `Updated platform settings (commission: ${commissionPercentage}%, categories: ${dbEngine.db.settings.shelfCategories?.length || 0})`
  );
  res.json({ success: true, data: dbEngine.db.settings });
});

// ==========================================
// 8. AI AI ENDPOINTS (GEMINI 3.6 FLASH)
// ==========================================

// POST /api/ai/analyze-shelf
app.post('/api/ai/analyze-shelf', requireAuth, requireRole('FIELD_AGENT', 'ADMIN', 'HOST'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { photoUrl } = req.body;
    const result = await analyzeShelfPhoto(photoUrl || 'https://images.unsplash.com/photo-1583258292688-d02132382025?w=800');
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message || 'AI shelf analysis failed.' } });
  }
});

// POST /api/ai/shelf-match
app.post('/api/ai/shelf-match', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category, budgetMonthlyTzs, city, prompt } = req.body;
    const user = req.user!;
    const vendorProfile = dbEngine.db.vendorProfiles.find((v) => v.userId === user.id) || {
      category: category || 'Food & Beverages',
      businessName: user.name,
      city: city || 'Dar es Salaam',
    };

    const availableShelves = dbEngine.db.shelves.filter((s) => s.availabilityStatus === 'AVAILABLE');
    const recommendations = await recommendShelves(vendorProfile, { targetCategory: category, budgetMonthlyTzs, city, prompt }, availableShelves);

    res.json({ success: true, data: recommendations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message || 'AI ShelfMatch failed.' } });
  }
});

// POST /api/ai/vendor-insights
app.post('/api/ai/vendor-insights', requireAuth, requireRole('VENDOR', 'ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const products = dbEngine.db.products.filter((p) => p.vendorId === user.id);
    const bookings = dbEngine.db.bookings.filter((b) => b.vendorId === user.id);
    const inventory = dbEngine.db.shelfInventory.filter((i) => i.vendorId === user.id);

    const insights = await generateVendorInsights({
      businessName: user.name,
      products,
      bookings,
      inventory,
    });

    res.json({ success: true, data: insights });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message || 'AI Insights failed.' } });
  }
});

// ==========================================
// VITE DEV SERVER OR STATIC SERVING
// ==========================================

async function startServer() {
  await dbEngine.ready;
  await ensureJwtSecret();
  registerP1Routes(app);
  const uploadDir = uploadsDir();
  fs.mkdirSync(uploadDir, { recursive: true });
  app.use('/uploads', express.static(uploadDir));
  setInterval(() => {
    try {
      runBookingMaintenance();
    } catch (err) {
      console.error('Booking maintenance failed:', err);
    }
    void runPaymentReconciliation().catch((err) => console.error('Payment reconcile failed:', err));
  }, 15 * 60 * 1000);
  runBookingMaintenance();
  void runPaymentReconciliation().catch((err) => console.error('Payment reconcile failed:', err));
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Shelfy 🇹🇿 Platform running on http://0.0.0.0:${PORT}`);
  });
}

let httpPrepared = false;

export async function prepareHttpApp() {
  await dbEngine.ready;
  await ensureJwtSecret();
  if (!httpPrepared) {
    registerP1Routes(app);
    httpPrepared = true;
  }
  return app;
}

export { app };

if (!process.env.VITEST) {
  void startServer();
}
