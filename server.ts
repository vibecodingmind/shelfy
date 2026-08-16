/**
 * Shelfy 🇹🇿 — Express Server & API Gateway
 */

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import bcrypt from 'bcryptjs';
import { dbEngine } from './src/server/db.js';
import { requireAuth, requireRole, generateToken, logAuditEvent, AuthenticatedRequest } from './src/server/auth.js';
import { analyzeShelfPhoto, recommendShelves, generateVendorInsights } from './src/server/ai.js';
import { BookingStatus, UserRole } from './src/types/index.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'Shelfy 🇹🇿',
    tagline: 'The retail expansion platform for Tanzania',
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 1. AUTHENTICATION & PROFILE ROUTES
// ==========================================

// POST /api/auth/register
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, role, businessName, businessRegistration, description, category, city, address } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ success: false, error: { message: 'Missing required registration fields.' } });
    }

    const allowedSelfRegisterRoles: UserRole[] = ['VENDOR', 'HOST'];
    if (!allowedSelfRegisterRoles.includes(role as UserRole)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Self-registration is only available for Vendors and Hosts. Field agents and admins are invited by the platform.' },
      });
    }

    const existing = dbEngine.db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ success: false, error: { message: 'An account with this email already exists.' } });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const userId = `usr_${Date.now()}`;
    const now = new Date().toISOString();

    const newUser = {
      id: userId,
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      passwordHash,
      role: role as UserRole,
      status: 'ACTIVE' as const,
      createdAt: now,
      updatedAt: now,
    };

    dbEngine.db.users.push(newUser);

    // Create role profile
    if (role === 'VENDOR') {
      dbEngine.db.vendorProfiles.push({
        id: `vp_${Date.now()}`,
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
        id: `hp_${Date.now()}`,
        userId,
        businessName: businessName || `${name}'s Shop`,
        businessRegistration: businessRegistration || '',
        description: description || '',
        phone: phone || '',
        verificationStatus: 'PENDING',
      });
    }

    dbEngine.save();

    const token = generateToken(newUser);
    logAuditEvent(userId, name, role as UserRole, 'USER_REGISTERED', 'User', userId, `Registered as ${role}`);

    return res.json({
      success: true,
      data: {
        token,
        user: { id: newUser.id, name: newUser.name, email: newUser.email, phone: newUser.phone, role: newUser.role, status: newUser.status },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message || 'Registration failed.' } });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: { message: 'Email and password required.' } });
    }

    const user = dbEngine.db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ success: false, error: { message: 'Invalid credentials. User not found.' } });
    }

    const validPassword = bcrypt.compareSync(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ success: false, error: { message: 'Invalid credentials. Password incorrect.' } });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ success: false, error: { message: 'Your account has been suspended by Admin.' } });
    }

    const token = generateToken(user);
    const vendorProfile = dbEngine.db.vendorProfiles.find((v) => v.userId === user.id);
    const hostProfile = dbEngine.db.hostProfiles.find((h) => h.userId === user.id);

    return res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, status: user.status, avatarUrl: user.avatarUrl },
        vendorProfile,
        hostProfile,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message || 'Login failed.' } });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const vendorProfile = dbEngine.db.vendorProfiles.find((v) => v.userId === user.id);
  const hostProfile = dbEngine.db.hostProfiles.find((h) => h.userId === user.id);

  res.json({
    success: true,
    data: {
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, status: user.status, avatarUrl: user.avatarUrl },
      vendorProfile,
      hostProfile,
    },
  });
});

// ==========================================
// 2. SHOPS & SHELVES (MARKETPLACE)
// ==========================================

// GET /api/shops
app.get('/api/shops', (req: Request, res: Response) => {
  let shops = [...dbEngine.db.shops];
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
    latitude: latitude || -6.7924,
    longitude: longitude || 39.2083,
    photos: photos && photos.length ? photos : ['https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800'],
    status: 'ACTIVE' as const,
    verificationStatus: 'PENDING' as const,
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
app.get('/api/shelves', (req: Request, res: Response) => {
  let shelves = [...dbEngine.db.shelves];
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
app.get('/api/shelves/:id', (req: Request, res: Response) => {
  const shelf = dbEngine.db.shelves.find((s) => s.id === req.params.id);
  if (!shelf) {
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
app.post('/api/bookings', requireAuth, requireRole('VENDOR', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { shelfId, durationMonths, startDate, notes } = req.body;
  const user = req.user!;

  const shelf = dbEngine.db.shelves.find((s) => s.id === shelfId);
  if (!shelf) {
    return res.status(404).json({ success: false, error: { message: 'Shelf not found.' } });
  }

  const months = Math.max(1, Number(durationMonths) || 1);
  const start = startDate ? new Date(startDate) : new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  const startKey = start.toISOString().split('T')[0];
  const endKey = end.toISOString().split('T')[0];

  const overlapping = dbEngine.db.bookings.find((b) => {
    if (b.shelfId !== shelfId) return false;
    if (['CANCELLED', 'REJECTED', 'COMPLETED', 'DISPUTED'].includes(b.status)) return false;
    return startKey < b.endDate && b.startDate < endKey;
  });
  if (overlapping) {
    return res.status(400).json({
      success: false,
      error: { message: `This shelf is already reserved from ${overlapping.startDate} to ${overlapping.endDate}.` },
    });
  }

  const shop = dbEngine.db.shops.find((s) => s.id === shelf.shopId);
  const hostId = shop ? shop.hostId : 'usr_host_1';

  const monthlyPrice = shelf.monthlyPriceTzs;
  const totalPrice = monthlyPrice * months;
  const commissionRate = dbEngine.db.settings.commissionPercentage / 100;
  const platformFee = Math.round(totalPrice * commissionRate);
  const hostEarnings = totalPrice - platformFee;

  const bookingId = `bk_${Date.now()}`;
  const now = new Date().toISOString();

  const newBooking = {
    id: bookingId,
    vendorId: user.id,
    vendorName: user.name,
    vendorBusinessName: user.name,
    shelfId,
    shelfName: shelf.name,
    shopName: shelf.shopName || shop?.name || 'Retail Shop',
    shopCity: shelf.shopCity || shop?.city || 'Dar es Salaam',
    hostId,
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    durationMonths: months,
    monthlyPriceTzs: monthlyPrice,
    totalPriceTzs: totalPrice,
    platformFeeTzs: platformFee,
    hostEarningsTzs: hostEarnings,
    status: (dbEngine.db.settings.autoApproveBookings ? 'PAYMENT_PENDING' : 'PENDING_APPROVAL') as BookingStatus,
    paymentStatus: 'PENDING' as const,
    notes: notes || '',
    createdAt: now,
    updatedAt: now,
  };

  dbEngine.db.bookings.push(newBooking);

  // Notify Host
  dbEngine.db.notifications.push({
    id: `notif_${Date.now()}`,
    userId: hostId,
    title: 'New Booking Request 📦',
    message: `${user.name} requested to book "${shelf.name}" for ${months} month(s).`,
    type: 'INFO',
    createdAt: now,
  });

  dbEngine.save();
  logAuditEvent(user.id, user.name, user.role, 'BOOKING_CREATED', 'Booking', bookingId, `Booked shelf ${shelf.name} for ${totalPrice} TZS`);

  res.json({ success: true, data: newBooking });
});

// GET /api/bookings
app.get('/api/bookings', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let bookings = [...dbEngine.db.bookings];

  if (user.role === 'VENDOR') {
    bookings = bookings.filter((b) => b.vendorId === user.id);
  } else if (user.role === 'HOST') {
    bookings = bookings.filter((b) => b.hostId === user.id);
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

  const allowedTransitions: Record<string, BookingStatus[]> = {
    PENDING_APPROVAL: ['APPROVED', 'PAYMENT_PENDING', 'REJECTED', 'CANCELLED'],
    APPROVED: ['PAYMENT_PENDING', 'CANCELLED', 'REJECTED'],
    PAYMENT_PENDING: ['CANCELLED', 'REJECTED'],
    ACTIVE: ['CANCELLED', 'COMPLETED', 'DISPUTED'],
  };
  const nextStatus = status === 'APPROVED' ? 'PAYMENT_PENDING' : status;
  const allowed = allowedTransitions[booking.status] || [];
  if (!nextStatus || !allowed.includes(nextStatus)) {
    return res.status(400).json({ success: false, error: { message: `Cannot change booking from ${booking.status} to ${status}.` } });
  }

  booking.status = nextStatus;
  booking.updatedAt = new Date().toISOString();

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

// POST /api/payments/initiate-session (Initiates secure PesaPal transaction session with backend reference)
app.post('/api/payments/initiate-session', requireAuth, requireRole('VENDOR', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { bookingId } = req.body;
  const user = req.user!;

  const booking = dbEngine.db.bookings.find((b) => b.id === bookingId && (user.role === 'ADMIN' || b.vendorId === user.id));
  if (!booking) {
    return res.status(404).json({ success: false, error: { message: 'Booking not found or access denied.' } });
  }

  const transactionReference = `PESA-TZ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const orderTrackingId = `trk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins

  res.json({
    success: true,
    data: {
      bookingId: booking.id,
      transactionReference,
      orderTrackingId,
      amountTzs: booking.totalPriceTzs,
      platformFeeTzs: booking.platformFeeTzs,
      hostEarningsTzs: booking.hostEarningsTzs,
      currency: 'TZS',
      merchantName: 'Shelfy Tanzania Ltd',
      merchantEmail: 'payments@shelfy.co.tz',
      customerName: user.name,
      customerEmail: user.email,
      customerPhone: user.phone || '+255 754 000 000',
      shelfName: booking.shelfName,
      shopName: booking.shopName,
      durationMonths: booking.durationMonths,
      startDate: booking.startDate,
      endDate: booking.endDate,
      expiresAt,
      status: 'SESSION_INITIALIZED',
    },
  });
});

// POST /api/payments/callback-verify (Handles and verifies PesaPal transaction completion callback securely)
app.post('/api/payments/callback-verify', requireAuth, requireRole('VENDOR', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { bookingId, transactionReference, orderTrackingId, paymentProvider, phoneOrCardNumber } = req.body;
  const user = req.user!;

  const booking = dbEngine.db.bookings.find((b) => b.id === bookingId && (user.role === 'ADMIN' || b.vendorId === user.id));
  if (!booking) {
    return res.status(404).json({ success: false, error: { message: 'Booking not found.' } });
  }

  const now = new Date().toISOString();
  const txnRef = transactionReference || `PESA-TZ-${Date.now()}`;
  const trackingId = orderTrackingId || `trk_${Date.now()}`;

  // Check if payment already exists
  let payment = dbEngine.db.payments.find((p) => p.transactionReference === txnRef);
  if (!payment) {
    payment = {
      id: `pay_${Date.now()}`,
      bookingId: booking.id,
      vendorId: user.id,
      amountTzs: booking.totalPriceTzs,
      currency: 'TZS',
      provider: (paymentProvider || 'PESAPAL') as any,
      transactionReference: txnRef,
      pesapalTrackingId: trackingId,
      status: 'PAID',
      paidAt: now,
      createdAt: now,
    };
    dbEngine.db.payments.push(payment);
  } else {
    payment.status = 'PAID';
    payment.paidAt = now;
  }

  // Update booking status
  booking.status = 'ACTIVE';
  booking.paymentStatus = 'PAID';
  booking.updatedAt = now;

  // Mark shelf as booked if entire period occupied
  const shelf = dbEngine.db.shelves.find((s) => s.id === booking.shelfId);
  if (shelf) {
    shelf.availabilityStatus = 'BOOKED';
  }

  // Create Host Payout record
  const existingPayout = dbEngine.db.payouts.find((p) => p.payoutReference === `payout_for_${booking.id}`);
  if (!existingPayout) {
    dbEngine.db.payouts.push({
      id: `payout_${Date.now()}`,
      hostId: booking.hostId,
      grossAmountTzs: booking.totalPriceTzs,
      commissionTzs: booking.platformFeeTzs,
      netAmountTzs: booking.hostEarningsTzs,
      status: 'PENDING',
      payoutReference: `payout_for_${booking.id}`,
      createdAt: now,
    });
  }

  // Notifications
  dbEngine.db.notifications.push({
    id: `notif_${Date.now()}_v`,
    userId: booking.vendorId,
    title: 'PesaPal Payment Confirmed! 💳🇹🇿',
    message: `Receipt #${txnRef.slice(-8)}: TZS ${booking.totalPriceTzs.toLocaleString()} received for ${booking.shelfName}. Your space is now ACTIVE!`,
    type: 'SUCCESS',
    createdAt: now,
  });

  dbEngine.db.notifications.push({
    id: `notif_${Date.now()}_h`,
    userId: booking.hostId,
    title: 'New Paid Shelf Booking! 🎉',
    message: `${booking.vendorName} completed payment for ${booking.shelfName}. TZS ${booking.hostEarningsTzs.toLocaleString()} has been credited to your host balance.`,
    type: 'SUCCESS',
    createdAt: now,
  });

  dbEngine.save();
  logAuditEvent(user.id, user.name, user.role, 'PESAPAL_PAYMENT_VERIFIED', 'Payment', payment.id, `Verified PesaPal reference ${txnRef} for ${booking.totalPriceTzs} TZS`);

  res.json({
    success: true,
    data: {
      verified: true,
      payment,
      booking,
      receipt: {
        receiptNumber: txnRef,
        trackingId,
        bookingId: booking.id,
        shelfName: booking.shelfName,
        shopName: booking.shopName,
        shopCity: booking.shopCity,
        amountTzs: booking.totalPriceTzs,
        platformFeeTzs: booking.platformFeeTzs,
        hostEarningsTzs: booking.hostEarningsTzs,
        paidAt: now,
        customerName: user.name,
        customerEmail: user.email,
        paymentMethod: paymentProvider || 'PesaPal (M-Pesa / Card)',
        accountIdentifier: phoneOrCardNumber ? `***${phoneOrCardNumber.slice(-4)}` : undefined,
      },
    },
  });
});

// POST /api/payments/checkout (PesaPal Checkout Simulation / Initiation)
app.post('/api/payments/checkout', requireAuth, requireRole('VENDOR', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { bookingId, paymentProvider } = req.body;
  const user = req.user!;

  const booking = dbEngine.db.bookings.find((b) => b.id === bookingId && (user.role === 'ADMIN' || b.vendorId === user.id));
  if (!booking) {
    return res.status(404).json({ success: false, error: { message: 'Booking not found or access denied.' } });
  }

  const txnRef = `PESA-TZ-${Date.now()}`;
  const now = new Date().toISOString();

  // Create payment record
  const payment = {
    id: `pay_${Date.now()}`,
    bookingId: booking.id,
    vendorId: user.id,
    amountTzs: booking.totalPriceTzs,
    currency: 'TZS',
    provider: (paymentProvider || 'PESAPAL') as any,
    transactionReference: txnRef,
    pesapalTrackingId: `pesapal-track-${Date.now()}`,
    status: 'PAID' as const,
    paidAt: now,
    createdAt: now,
  };

  dbEngine.db.payments.push(payment);

  // Update booking status
  booking.status = 'ACTIVE';
  booking.paymentStatus = 'PAID';
  booking.updatedAt = now;

  // Mark shelf as booked
  const shelf = dbEngine.db.shelves.find((s) => s.id === booking.shelfId);
  if (shelf) {
    shelf.availabilityStatus = 'BOOKED';
  }

  // Create Host Payout record
  dbEngine.db.payouts.push({
    id: `payout_${Date.now()}`,
    hostId: booking.hostId,
    grossAmountTzs: booking.totalPriceTzs,
    commissionTzs: booking.platformFeeTzs,
    netAmountTzs: booking.hostEarningsTzs,
    status: 'PENDING',
    createdAt: now,
  });

  // Notify Vendor & Host
  dbEngine.db.notifications.push({
    id: `notif_${Date.now()}_v`,
    userId: booking.vendorId,
    title: 'Payment Successful 💳',
    message: `Payment of TZS ${booking.totalPriceTzs.toLocaleString()} confirmed for ${booking.shelfName}.`,
    type: 'SUCCESS',
    createdAt: now,
  });

  dbEngine.db.notifications.push({
    id: `notif_${Date.now()}_h`,
    userId: booking.hostId,
    title: 'New Active Vendor Booking! 💼',
    message: `${booking.vendorName} paid TZS ${booking.totalPriceTzs.toLocaleString()}. Earnings of TZS ${booking.hostEarningsTzs.toLocaleString()} credited to your balance.`,
    type: 'SUCCESS',
    createdAt: now,
  });

  dbEngine.save();
  logAuditEvent(user.id, user.name, user.role, 'PAYMENT_COMPLETED', 'Payment', payment.id, `Confirmed payment of ${booking.totalPriceTzs} TZS for booking ${booking.id}`);

  res.json({
    success: true,
    data: {
      payment,
      booking,
      pesapalRedirectUrl: `/vendor/bookings?paid=true&ref=${txnRef}`,
    },
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
  res.json({ success: true, data: dbEngine.db.users });
});

// PUT /api/admin/users/:id/status
app.put('/api/admin/users/:id/status', requireAuth, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;
  const targetUser = dbEngine.db.users.find((u) => u.id === req.params.id);

  if (!targetUser) {
    return res.status(404).json({ success: false, error: { message: 'User not found.' } });
  }

  targetUser.status = status;
  targetUser.updatedAt = new Date().toISOString();
  dbEngine.save();

  logAuditEvent(req.user!.id, req.user!.name, req.user!.role, 'USER_STATUS_UPDATED', 'User', targetUser.id, `Set status to ${status}`);
  res.json({ success: true, data: targetUser });
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
app.post('/api/ai/analyze-shelf', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
app.post('/api/ai/vendor-insights', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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

startServer();
