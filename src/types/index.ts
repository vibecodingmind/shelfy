/**
 * Shelfy 🇹🇿 — Types and Data Models
 */

export type UserRole = 'ADMIN' | 'VENDOR' | 'HOST' | 'FIELD_AGENT';

export type AdminPermission =
  | 'SUPER_ADMIN'
  | 'MANAGE_USERS'
  | 'MANAGE_PAYMENTS'
  | 'MANAGE_FINANCE'
  | 'MANAGE_INTEGRATIONS'
  | 'MANAGE_SETTINGS'
  | 'MANAGE_MARKETPLACE'
  | 'MANAGE_FIELD'
  | 'MANAGE_SUPPORT';

export type IntegrationProvider =
  | 'AZAMPAY'
  | 'SMTP'
  | 'GEMINI'
  | 'S3'
  | 'SMS'
  | 'MAPS'
  | 'OAUTH'
  | 'RESEND'
  | 'PESAPAL'
  | 'STRIPE'
  | 'FLUTTERWAVE';

export type PaymentGatewayProvider = 'AZAMPAY' | 'PESAPAL' | 'STRIPE' | 'FLUTTERWAVE';

export interface UserRoleAssignment {
  id: string;
  userId: string;
  role: UserRole;
  status: UserStatus;
  grantedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserAdminPermission {
  id: string;
  userId: string;
  permission: AdminPermission;
  grantedBy?: string;
  createdAt: string;
}

export interface AdminNote {
  id: string;
  userId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface IntegrationCredential {
  id: string;
  provider: IntegrationProvider;
  environment: 'sandbox' | 'live';
  key: string;
  ciphertext: string;
  iv: string;
  tag: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface IntegrationLog {
  id: string;
  provider: string;
  operation: string;
  success: boolean;
  durationMs?: number;
  errorMessage?: string;
  resourceType?: string;
  resourceId?: string;
  createdAt: string;
}

export interface PaymentGatewayConfig {
  id: string;
  provider: PaymentGatewayProvider;
  enabled: boolean;
  isDefault: boolean;
  environment: 'sandbox' | 'live';
  configJson: Record<string, unknown>;
  lastTestAt?: string;
  lastTestOk?: boolean;
  lastTestMessage?: string;
  updatedAt: string;
}

export interface WebhookEvent {
  id: string;
  provider: string;
  paymentId?: string;
  verified: boolean;
  status: string;
  payloadSummary: string;
  createdAt: string;
}

export interface CommissionRule {
  id: string;
  effectiveFrom: string;
  platformBps: number;
  vendorBps?: number;
  hostBps?: number;
  category?: string;
  planId?: string;
  createdAt: string;
}

export type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'CANCELLED' | 'EXPIRED' | 'SUSPENDED';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  priceTzs: number;
  currency: string;
  billingPeriod: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'CUSTOM';
  trialDays: number;
  active: boolean;
  entitlements: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiClient {
  id: string;
  name: string;
  description?: string;
  scopes: string[];
  rateLimitPerHour: number;
  enabled: boolean;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiClientKey {
  id: string;
  clientId: string;
  keyPrefix: string;
  keyHash: string;
  createdAt: string;
  revokedAt?: string;
}

export interface NotificationTemplate {
  id: string;
  key: string;
  channel: 'EMAIL' | 'SMS';
  subject?: string;
  body: string;
  updatedAt: string;
}

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
  /** Active portal role (JWT); defaults to primary role. */
  activeRole?: UserRole;
  adminPermissions?: AdminPermission[];
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
  logoUrl?: string;
  verificationStatus: VerificationStatus;
}

export interface HostProfile {
  id: string;
  userId: string;
  businessName: string;
  businessRegistration?: string;
  description?: string;
  phone: string;
  /** Mobile money MSISDN for withdrawal payouts (TZ). */
  payoutPhone?: string;
  logoUrl?: string;
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

export type ShelfType =
  | 'FRONT_SHELF'
  | 'BACK_SHELF'
  | 'COUNTER_DISPLAY'
  | 'EYE_LEVEL'
  | 'ENTRANCE_DISPLAY'
  | 'WINDOW_DISPLAY'
  | 'END_CAP'
  | 'TOP_SHELF'
  | 'BOTTOM_SHELF'
  | 'REFRIGERATED'
  | 'WALL_SHELF'
  | 'ISLAND_DISPLAY';

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
  /** Host-defined in-store shelf label (aisle/slot inside the shop — not shop name or platform ID). */
  locationInsideShop: string;
  monthlyPriceTzs: number;
  availabilityStatus: ShelfAvailability;
  allowedCategories: string[];
  /** Host-defined rules for vendors using this shelf (display, restocking, etc.). */
  shelfRules?: string[];
  photos: string[];
  status: 'ACTIVE' | 'INACTIVE';
  avgRating?: number;
  reviewCount?: number;
  featured?: boolean;
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
  provider: 'AZAM_PAY' | 'PESAPAL' | 'M_PESA' | 'AIRTEL_MONEY' | 'TIGO_PESA' | 'CARD';
  transactionReference: string;
  pesapalTrackingId?: string;
  azamPayTransactionId?: string;
  mnoProvider?: string;
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
  shopId?: string;
  shelfId?: string;
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

export interface PlatformIntegrationSettings {
  appUrl?: string;
  emailFrom?: string;
  emailReplyTo?: string;
  smtp?: {
    url?: string;
    host?: string;
    port?: number;
    user?: string;
    secure?: boolean;
    tlsInsecure?: boolean;
  };
  resendEnabled?: boolean;
  gemini?: { enabled?: boolean; model?: string };
  maps?: {
    provider?: 'google' | 'mapbox' | 'osm';
    defaultCenterLat?: number;
    defaultCenterLng?: number;
    defaultZoom?: number;
    /** Browser/embed key (restrict by HTTP referrer in Google Cloud). */
    publicBrowserKey?: string;
  };
  oauth?: {
    google?: { enabled?: boolean; clientId?: string };
    facebook?: { enabled?: boolean; appId?: string };
  };
  storage?: {
    driver?: 'local' | 's3';
    bucket?: string;
    region?: string;
    endpoint?: string;
    publicBaseUrl?: string;
  };
  sms?: {
    provider?: 'none' | 'africas_talking' | 'twilio';
    username?: string;
    from?: string;
  };
  social?: {
    facebookUrl?: string;
    instagramUrl?: string;
    twitterUrl?: string;
    linkedInUrl?: string;
  };
  branding?: {
    logoUrl?: string;
    faviconUrl?: string;
    maintenanceMessage?: string;
  };
}

export interface PlatformSettings {
  commissionPercentage: number; // e.g., 10 for 10%
  platformName?: string;
  supportEmail?: string;
  supportPhone?: string;
  defaultCountry?: string;
  timeZone?: string;
  vendorRegistrationEnabled?: boolean;
  hostRegistrationEnabled?: boolean;
  autoApproveBookings: boolean;
  azamPayEnvironment: 'sandbox' | 'live';
  /** @deprecated use azamPayEnvironment */
  pesapalEnvironment?: 'sandbox' | 'live';
  currency: string; // "TZS"
  maintenanceMode: boolean;
  shelfCategories: string[];
  shelfTypes: ShelfTypeOption[];
  minWithdrawalTzs?: number;
  bookingGraceHours?: number;
  cancellationFeePercent?: number;
  freeCancelDays?: number;
  policies?: Record<string, string>;
  /** Admin-managed integrations (secrets stored encrypted separately). */
  integrations?: PlatformIntegrationSettings;
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

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  query?: string;
  city?: string;
  category?: string;
  maxPriceTzs?: number;
  shelfType?: string;
  alertsEnabled: boolean;
  lastAlertAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreference {
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  bookingAlerts: boolean;
  expiryReminders: boolean;
  savedSearchAlerts: boolean;
  marketingEmails: boolean;
  updatedAt: string;
}

export interface EnterpriseAccount {
  id: string;
  ownerUserId: string;
  brandName: string;
  businessRegistration?: string;
  memberUserIds: string[];
  billingEmail: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
}

export interface InspectionSummary {
  shelfId: string;
  verifiedListing: boolean;
  hostVerified: boolean;
  lastInspectionAt?: string;
  lastInspectionScore?: number;
  lastStockLevelPercent?: number;
  lastCondition?: string;
  totalInspections: number;
  trustScore: number;
}

export interface BookingReceipt {
  receiptNumber: string;
  bookingId: string;
  vendorName: string;
  vendorBusinessName?: string;
  shelfName: string;
  shopName: string;
  shopCity: string;
  startDate: string;
  endDate: string;
  durationMonths: number;
  monthlyPriceTzs: number;
  totalPriceTzs: number;
  platformFeeTzs: number;
  hostEarningsTzs: number;
  paymentStatus: PaymentStatus;
  paidAt?: string;
  transactionReference?: string;
  issuedAt: string;
}

export interface VendorAnalytics {
  totalBookings: number;
  activeBookings: number;
  totalSpendTzs: number;
  avgMonthlySpendTzs: number;
  topCities: Array<{ city: string; count: number }>;
  bookingsByStatus: Record<string, number>;
  expiringSoon: number;
  renewalRatePercent: number;
}

export interface HostAnalytics {
  totalBookings: number;
  pendingApprovals: number;
  activeRentals: number;
  totalEarningsTzs: number;
  availableBalanceTzs: number;
  occupancyRatePercent: number;
  topShelves: Array<{ shelfId: string; shelfName: string; bookings: number; earningsTzs: number }>;
  bookingsByStatus: Record<string, number>;
}

export interface DynamicPricingSuggestion {
  shelfId: string;
  currentPriceTzs: number;
  suggestedPriceTzs: number;
  demandScore: number;
  occupancyPercent: number;
  reason: string;
}

export type SupportedLocale = 'en' | 'sw';

// ——— Business directory (Google Places discovery) ———

export type DirectoryClaimStatus = 'UNCLAIMED' | 'CLAIM_PENDING' | 'CLAIMED' | 'CLAIM_REJECTED';
export type DirectoryVerificationStatus =
  | 'NOT_VERIFIED'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED';
export type DirectoryMarketplaceStatus = 'DIRECTORY_ONLY' | 'ONBOARDING' | 'ACTIVE' | 'INACTIVE' | 'CLOSED';
export type DirectoryDataSource = 'GOOGLE_PLACES' | 'OWNER' | 'FIELD_AGENT' | 'ADMIN';
export type DirectoryPhotoSource = 'GOOGLE_PLACES' | 'OWNER_UPLOAD' | 'FIELD_AGENT_UPLOAD' | 'OTHER_LICENSED_SOURCE';

export type DirectoryRegion = 'Mwanza' | 'Dar es Salaam' | 'Arusha' | 'Mbeya' | 'Dodoma';

export type DirectoryCategory =
  | 'SUPERMARKET'
  | 'PHARMACY'
  | 'MARKET'
  | 'SHOPPING_CENTRE'
  | 'GROCERY_STORE'
  | 'CONVENIENCE_STORE'
  | 'RETAIL_SHOP'
  | 'ELECTRONICS_STORE'
  | 'CLOTHING_STORE'
  | 'HARDWARE_STORE'
  | 'RESTAURANT'
  | 'OTHER';

export interface DirectoryBusiness {
  id: string;
  googlePlaceId: string;
  dataSource: DirectoryDataSource;
  directoryCategory: DirectoryCategory;
  region: DirectoryRegion;
  city: string;
  neighborhood?: string;
  latitude: number;
  longitude: number;
  claimStatus: DirectoryClaimStatus;
  verificationStatus: DirectoryVerificationStatus;
  marketplaceStatus: DirectoryMarketplaceStatus;
  linkedShopId?: string;
  linkedHostUserId?: string;
  importJobId?: string;
  createdAt: string;
  updatedAt: string;
  lastReviewedAt?: string;
}

export interface DirectoryLicensedPhoto {
  id: string;
  directoryBusinessId: string;
  url: string;
  source: DirectoryPhotoSource;
  uploadedBy: string;
  createdAt: string;
}

export interface DirectoryClaimRequest {
  id: string;
  directoryBusinessId: string;
  requesterUserId: string;
  requesterName: string;
  requesterEmail: string;
  message?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type DirectoryImportRecordStatus = 'PENDING' | 'CREATED' | 'DUPLICATE' | 'FAILED' | 'NEEDS_REVIEW';

export interface DirectoryImportJob {
  id: string;
  initiatedBy: string;
  initiatedByName: string;
  region: DirectoryRegion;
  city: string;
  directoryCategory: DirectoryCategory;
  placeIds: string[];
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  summary?: {
    total: number;
    created: number;
    duplicates: number;
    failed: number;
    needsReview: number;
  };
  records?: Array<{ placeId: string; status: DirectoryImportRecordStatus; directoryBusinessId?: string; error?: string }>;
  createdAt: string;
  completedAt?: string;
}

export interface PlacesDisplayCacheEntry {
  placeId: string;
  payload: Record<string, unknown>;
  expiresAt: string;
  fetchedAt: string;
}

export interface PlacesApiUsageDay {
  date: string; // YYYY-MM-DD
  textSearch: number;
  nearbySearch: number;
  placeDetails: number;
  placePhotos: number;
  errors: number;
}

export interface DirectorySettings {
  enabled: boolean;
  dailyQuotaLimit: number;
  monthlyQuotaLimit: number;
  cacheTtlHours: number;
  placesApiEnabled: boolean;
  mapsJsEnabled: boolean;
  lastSuccessfulRequestAt?: string;
  lastError?: string;
  usageByDay: PlacesApiUsageDay[];
}
