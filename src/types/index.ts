/**
 * Shelfy 🇹🇿 — Types and Data Models
 */

export type UserRole = 'ADMIN' | 'VENDOR' | 'HOST' | 'FIELD_AGENT';

export type UserStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED';

export type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  failedLoginCount?: number;
  lockedUntil?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorProfile {
  id: string;
  userId: string;
  businessName: string;
  businessRegistration?: string;
  description?: string;
  category: string;
  address: string;
  city: string;
  region: string;
  country: string;
  verificationStatus: VerificationStatus;
}

export interface HostProfile {
  id: string;
  userId: string;
  businessName: string;
  businessRegistration?: string;
  description?: string;
  phone: string;
  verificationStatus: VerificationStatus;
}

export interface Shop {
  id: string;
  hostId: string;
  hostName?: string;
  name: string;
  description: string;
  address: string;
  city: string; // e.g. Dar es Salaam, Mwanza, Arusha, Dodoma, Zanzibar, Mbeya
  region: string;
  latitude: number;
  longitude: number;
  photos: string[];
  status: 'ACTIVE' | 'INACTIVE';
  verificationStatus: VerificationStatus;
  listingStatus?: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'PUBLISHED' | 'REJECTED' | 'SUSPENDED';
  slug?: string;
  deletedAt?: string;
  footTrafficScore?: number; // 1 to 10
  shopType: 'SUPERMARKET' | 'MINI_MARKET' | 'CONVENIENCE' | 'BOUTIQUE' | 'PHARMACY' | 'SPECIALTY';
  createdAt: string;
  updatedAt: string;
}

export type ShelfType = 'EYE_LEVEL' | 'TOP_SHELF' | 'BOTTOM_SHELF' | 'COUNTER_DISPLAY' | 'ENTRANCE_DISPLAY' | 'REFRIGERATED';

export type ShelfAvailability = 'AVAILABLE' | 'BOOKED' | 'MAINTENANCE';

export interface Shelf {
  id: string;
  shopId: string;
  shopName?: string;
  shopCity?: string;
  shopAddress?: string;
  shopLatitude?: number;
  shopLongitude?: number;
  hostVerificationStatus?: VerificationStatus;
  verificationStatus?: VerificationStatus;
  listingStatus?: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'PUBLISHED' | 'REJECTED' | 'SUSPENDED';
  slug?: string;
  deletedAt?: string;
  name: string;
  description: string;
  widthCm: number;
  heightCm: number;
  depthCm: number;
  shelfType: ShelfType;
  locationInsideShop: string; // e.g. "Aisle 2 - Front Section"
  monthlyPriceTzs: number;
  availabilityStatus: ShelfAvailability;
  allowedCategories: string[];
  photos: string[];
  status: 'ACTIVE' | 'INACTIVE';
  avgRating?: number;
  reviewCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  vendorId: string;
  vendorName?: string;
  name: string;
  description: string;
  category: string;
  sku: string;
  priceTzs: number;
  images: string[];
  status: 'ACTIVE' | 'INACTIVE';
  stockQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShelfInventory {
  id: string;
  shelfId: string;
  productId: string;
  productName?: string;
  productSku?: string;
  vendorId: string;
  quantity: number;
  minStockLevel: number;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  lastUpdated: string;
}

export type BookingStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_FAILED'
  | 'PAID'
  | 'ACTIVE'
  | 'EXPIRING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'DISPUTED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface Booking {
  id: string;
  vendorId: string;
  vendorName?: string;
  vendorBusinessName?: string;
  shelfId: string;
  shelfName?: string;
  shopName?: string;
  shopCity?: string;
  hostId: string;
  startDate: string;
  endDate: string;
  durationMonths: number;
  monthlyPriceTzs: number;
  totalPriceTzs: number;
  platformFeeTzs: number; // calculated based on admin commission rate
  hostEarningsTzs: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  vendorId: string;
  amountTzs: number;
  currency: string; // TZS
  provider: 'PESAPAL' | 'M_PESA' | 'AIRTEL_MONEY' | 'TIGO_PESA' | 'CARD';
  transactionReference: string;
  pesapalTrackingId?: string;
  status: PaymentStatus;
  paidAt?: string;
  createdAt: string;
}

export interface Payout {
  id: string;
  hostId: string;
  hostName?: string;
  hostBusinessName?: string;
  grossAmountTzs: number;
  commissionTzs: number;
  netAmountTzs: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  payoutReference?: string;
  paidAt?: string;
  createdAt: string;
}

export type VisitStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface FieldVisit {
  id: string;
  agentId: string;
  agentName?: string;
  shopId: string;
  shopName?: string;
  shopAddress?: string;
  shopCity?: string;
  shelfId: string;
  shelfName?: string;
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  status: VisitStatus;
  latitude?: number;
  longitude?: number;
  shopLatitude?: number;
  shopLongitude?: number;
  checkedInAt?: string;
  notes?: string;
  createdAt: string;
}

export interface ShelfReport {
  id: string;
  visitId: string;
  agentId: string;
  agentName?: string;
  shelfId: string;
  shopId: string;
  stockLevelPercent: number; // 0 - 100
  shelfCondition: 'EXCELLENT' | 'GOOD' | 'NEEDS_CLEANING' | 'DAMAGED' | 'DISORGANIZED';
  notes: string;
  photos: string[];
  aiAnalysis?: {
    visibleProductsCount: number;
    estimatedStockPercent: number;
    emptySpacesDetected: boolean;
    conditionScore: number; // 1 - 10
    detectedIssues: string[];
    summary: string;
  };
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  readAt?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  receiverId: string;
  bookingId?: string;
  content: string;
  readAt?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string; // e.g. "USER_SUSPENDED", "HOST_VERIFIED", "BOOKING_CREATED"
  resource: string;
  resourceId: string;
  details?: string;
  timestamp: string;
}

export interface Review {
  id: string;
  bookingId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: UserRole;
  targetId: string; // shelf or host or vendor
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
}

export interface VerificationRequest {
  id: string;
  subjectType: 'USER' | 'HOST' | 'VENDOR' | 'SHOP' | 'SHELF';
  subjectId: string;
  requestedBy: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  notes?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Dispute {
  id: string;
  bookingId: string;
  raisedById: string;
  raisedByName: string;
  againstId: string;
  againstName: string;
  reason: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  resolutionDetails?: string;
  resolvedById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShelfTypeOption {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export interface PlatformSettings {
  commissionPercentage: number; // e.g., 10 for 10%
  autoApproveBookings: boolean;
  pesapalEnvironment: 'sandbox' | 'live';
  currency: string; // "TZS"
  maintenanceMode: boolean;
  shelfCategories: string[];
  shelfTypes: ShelfTypeOption[];
  minWithdrawalTzs?: number;
  bookingGraceHours?: number;
  cancellationFeePercent?: number;
  freeCancelDays?: number;
  policies?: Record<string, string>;
}

export interface BookingStatusHistory {
  id: string;
  bookingId: string;
  fromStatus?: BookingStatus;
  toStatus: BookingStatus;
  actorId?: string;
  actorRole: string;
  reason?: string;
  createdAt: string;
}

export interface AuthToken {
  id: string;
  userId: string;
  type: 'EMAIL_VERIFY' | 'PASSWORD_RESET' | 'PHONE_OTP' | 'REFRESH';
  tokenHash: string;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
}

export interface PaymentAttempt {
  id: string;
  paymentId: string;
  status: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  vendorProfile?: VendorProfile | null;
  hostProfile?: HostProfile | null;
}
