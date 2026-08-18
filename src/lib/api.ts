/**
 * Shelfy 🇹🇿 — Client API Service & Axios/Fetch Wrapper
 */

import {
  User,
  VendorProfile,
  HostProfile,
  Shop,
  Shelf,
  Product,
  ShelfInventory,
  Booking,
  Payment,
  Payout,
  FieldVisit,
  ShelfReport,
  Notification,
  Message,
  AuditLog,
  PlatformSettings,
  BookingStatusHistory,
  BookingReceipt,
  SavedSearch,
  NotificationPreference,
  VendorAnalytics,
  HostAnalytics,
  InspectionSummary,
  DynamicPricingSuggestion,
  EnterpriseAccount,
} from '../types/index.js';

const TOKEN_KEY = 'shelfy_auth_token';
const REFRESH_KEY = 'shelfy_refresh_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setStoredToken(token: string, refreshToken?: string) {
  localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

const AUTH_NO_REFRESH_RETRY = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
]);

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const json = await res.json();
    if (!res.ok || !json?.success || !json.data?.token) {
      clearStoredToken();
      return false;
    }
    setStoredToken(json.data.token, json.data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}, retried = false): Promise<{ success: boolean; data?: T; error?: { message: string } }> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(endpoint, { ...options, headers });
    const json = await res.json().catch(() => ({ success: false, error: { message: 'Invalid response from server.' } }));
    if (
      res.status === 401 &&
      !retried &&
      !AUTH_NO_REFRESH_RETRY.has(endpoint) &&
      getStoredRefreshToken()
    ) {
      if (!refreshInFlight) refreshInFlight = refreshAccessToken().finally(() => { refreshInFlight = null; });
      const ok = await refreshInFlight;
      if (ok) return apiFetch<T>(endpoint, options, true);
    }
    return json;
  } catch (err: any) {
    return { success: false, error: { message: err.message || 'Network request failed.' } };
  }
}

export const api = {
  // Auth
  login: (credentials: any) => apiFetch<{ token: string; refreshToken?: string; expiresIn?: number; user: User; vendorProfile?: VendorProfile; hostProfile?: HostProfile }>('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (data: any) => apiFetch<{ token: string; refreshToken?: string; expiresIn?: number; user: User }>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => apiFetch<{ user: User; vendorProfile?: VendorProfile; hostProfile?: HostProfile }>('/api/auth/me'),
  logout: () => apiFetch<{ loggedOut: boolean }>('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: getStoredRefreshToken() }) }),

  // Shops & Shelves
  getShops: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch<Shop[]>(`/api/shops${query ? `?${query}` : ''}`);
  },
  createShop: (shopData: any) => apiFetch<Shop>('/api/shops', { method: 'POST', body: JSON.stringify(shopData) }),

  getShelves: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch<Shelf[]>(`/api/shelves${query ? `?${query}` : ''}`);
  },
  getShelfById: (id: string) => apiFetch<Shelf & { shop: Shop; reviews?: any[] }>(`/api/shelves/${id}`),
  getShelfAvailability: (id: string) => apiFetch<{ shelfId: string; availabilityStatus: string; monthlyPriceTzs: number; bookedRanges: Array<{ bookingId: string; startDate: string; endDate: string; status: string }> }>(`/api/shelves/${id}/availability`),
  getInspectionSummary: (id: string) => apiFetch<InspectionSummary>(`/api/shelves/${id}/inspection-summary`),
  getShelfReports: (id: string) => apiFetch<ShelfReport[]>(`/api/shelves/${id}/reports`),
  getPricingSuggestion: (id: string) => apiFetch<DynamicPricingSuggestion>(`/api/shelves/${id}/pricing-suggestion`),
  applyShelfPricing: (id: string, monthlyPriceTzs: number) =>
    apiFetch<Shelf>(`/api/shelves/${id}/apply-pricing`, { method: 'POST', body: JSON.stringify({ monthlyPriceTzs }) }),
  createShelf: (shelfData: any) => apiFetch<Shelf>('/api/shelves', { method: 'POST', body: JSON.stringify(shelfData) }),

  // Bookings & Payments
  createBooking: (bookingData: any) => apiFetch<Booking>('/api/bookings', { method: 'POST', body: JSON.stringify(bookingData) }),
  getBookings: () => apiFetch<Booking[]>('/api/bookings'),
  getPendingBookings: () => apiFetch<Booking[]>('/api/bookings/inbox/pending'),
  getBookingHistory: (bookingId: string) => apiFetch<BookingStatusHistory[]>(`/api/bookings/${bookingId}/history`),
  getBookingReceipt: (bookingId: string) => apiFetch<BookingReceipt>(`/api/bookings/${bookingId}/receipt`),
  renewBooking: (bookingId: string, durationMonths?: number) =>
    apiFetch<Booking>(`/api/bookings/${bookingId}/renew`, { method: 'POST', body: JSON.stringify({ durationMonths }) }),
  exportBookingsCsv: () => fetch('/api/exports/bookings.csv', { headers: { Authorization: `Bearer ${getStoredToken()}` } }),
  updateBookingStatus: (bookingId: string, status: string) => apiFetch<Booking>(`/api/bookings/${bookingId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  quoteBatchCheckout: (items: Array<{ shelfId: string; durationMonths: number; startDate?: string }>) =>
    apiFetch<any>('/api/bookings/quote', { method: 'POST', body: JSON.stringify({ items }) }),
  createBatchBookings: (items: Array<{ shelfId: string; durationMonths: number; startDate?: string }>) =>
    apiFetch<{ bookings: Booking[]; errors: string[] }>('/api/bookings/batch', { method: 'POST', body: JSON.stringify({ items }) }),
  getPayouts: () => apiFetch<Payout[]>('/api/payouts'),
  initiatePesapalSession: (bookingId: string, phoneNumber: string) =>
    apiFetch<any>('/api/payments/initiate-session', { method: 'POST', body: JSON.stringify({ bookingId, phoneNumber }) }),
  syncPayment: (paymentId: string) => apiFetch<any>(`/api/payments/${paymentId}/sync`, { method: 'POST' }),
  getPaymentsByBooking: (bookingId: string) => apiFetch<{ booking: Booking; payments: Payment[] }>(`/api/payments/by-booking/${bookingId}`),
  getFinanceSummary: () => apiFetch<any>('/api/finance/summary'),
  getWithdrawals: () => apiFetch<any[]>('/api/withdrawals'),
  requestWithdrawal: (amountTzs: number, method?: string) => apiFetch<any>('/api/withdrawals', { method: 'POST', body: JSON.stringify({ amountTzs, method }) }),
  approveWithdrawal: (id: string) => apiFetch<any>(`/api/admin/withdrawals/${id}/approve`, { method: 'POST' }),
  processWithdrawal: (id: string, payoutReference: string) => apiFetch<any>(`/api/admin/withdrawals/${id}/process`, { method: 'POST', body: JSON.stringify({ payoutReference }) }),
  failWithdrawal: (id: string, reason: string) => apiFetch<any>(`/api/admin/withdrawals/${id}/fail`, { method: 'POST', body: JSON.stringify({ reason }) }),
  cancelBooking: (bookingId: string, reason?: string) => apiFetch<any>(`/api/bookings/${bookingId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  updateShop: (id: string, data: any) => apiFetch<Shop>(`/api/shops/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateShelf: (id: string, data: any) => apiFetch<Shelf>(`/api/shelves/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  submitListing: (type: 'shop' | 'shelf', id: string) => apiFetch<any>(`/api/listings/${type}/${id}/submit`, { method: 'POST' }),
  getVerifications: () => apiFetch<any[]>('/api/admin/verifications'),
  decideVerification: (id: string, status: string, notes?: string) => apiFetch<any>(`/api/admin/verifications/${id}/decide`, { method: 'POST', body: JSON.stringify({ status, notes }) }),
  checkInVisit: (id: string, latitude: number, longitude: number) => apiFetch<any>(`/api/field-visits/${id}/check-in`, { method: 'POST', body: JSON.stringify({ latitude, longitude }) }),
  uploadImage: (dataUrl: string, kind?: string) => apiFetch<{ url: string }>('/api/uploads', { method: 'POST', body: JSON.stringify({ dataUrl, kind }) }),
  archiveShop: (id: string) => apiFetch<Shop>(`/api/shops/${id}`, { method: 'DELETE' }),
  archiveShelf: (id: string) => apiFetch<Shelf>(`/api/shelves/${id}`, { method: 'DELETE' }),
  createReview: (bookingId: string, rating: number, comment?: string) => apiFetch<any>('/api/reviews', { method: 'POST', body: JSON.stringify({ bookingId, rating, comment }) }),
  openDispute: (bookingId: string, reason: string) => apiFetch<any>(`/api/bookings/${bookingId}/dispute`, { method: 'POST', body: JSON.stringify({ reason }) }),
  getDisputes: () => apiFetch<any[]>('/api/disputes'),
  resolveDispute: (id: string, bookingStatus: string, resolutionDetails?: string) => apiFetch<any>(`/api/admin/disputes/${id}/resolve`, { method: 'POST', body: JSON.stringify({ bookingStatus, resolutionDetails }) }),
  verifyEmail: (token: string) => apiFetch<any>('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }),
  forgotPassword: (email: string) => apiFetch<any>('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) => apiFetch<any>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),

  // Products & Inventory
  getProducts: () => apiFetch<Product[]>('/api/products'),
  createProduct: (productData: any) => apiFetch<Product>('/api/products', { method: 'POST', body: JSON.stringify(productData) }),
  getInventory: () => apiFetch<ShelfInventory[]>('/api/inventory'),

  // Field Agent Visits & Reports
  getFieldVisits: () => apiFetch<FieldVisit[]>('/api/field-visits'),
  createFieldVisit: (visitData: any) => apiFetch<FieldVisit>('/api/field-visits', { method: 'POST', body: JSON.stringify(visitData) }),
  submitReport: (reportData: any) => apiFetch<ShelfReport>('/api/reports', { method: 'POST', body: JSON.stringify(reportData) }),
  getReports: () => apiFetch<ShelfReport[]>('/api/reports'),

  // Notifications & Messages
  getNotifications: () => apiFetch<Notification[]>('/api/notifications'),
  markNotificationsRead: (ids?: string[]) => apiFetch<Notification[]>('/api/notifications/read', { method: 'POST', body: JSON.stringify({ ids }) }),
  getNotificationPreferences: () => apiFetch<NotificationPreference>('/api/notification-preferences'),
  updateNotificationPreferences: (prefs: Partial<NotificationPreference>) =>
    apiFetch<NotificationPreference>('/api/notification-preferences', { method: 'PUT', body: JSON.stringify(prefs) }),
  getMessages: () => apiFetch<Message[]>('/api/messages'),
  sendMessage: (msgData: any) => apiFetch<Message>('/api/messages', { method: 'POST', body: JSON.stringify(msgData) }),
  getSavedSearches: () => apiFetch<SavedSearch[]>('/api/saved-searches'),
  createSavedSearch: (data: Partial<SavedSearch>) => apiFetch<SavedSearch>('/api/saved-searches', { method: 'POST', body: JSON.stringify(data) }),
  deleteSavedSearch: (id: string) => apiFetch<{ deleted: boolean }>(`/api/saved-searches/${id}`, { method: 'DELETE' }),
  getVendorAnalytics: () => apiFetch<VendorAnalytics>('/api/analytics/vendor'),
  getHostAnalytics: () => apiFetch<HostAnalytics>('/api/analytics/host'),
  getEnterpriseAccount: () => apiFetch<EnterpriseAccount | null>('/api/enterprise/account'),
  createEnterpriseAccount: (data: { brandName: string; businessRegistration?: string; billingEmail?: string }) =>
    apiFetch<EnterpriseAccount>('/api/enterprise/account', { method: 'POST', body: JSON.stringify(data) }),
  addEnterpriseMember: (email: string) =>
    apiFetch<EnterpriseAccount>('/api/enterprise/account/members', { method: 'POST', body: JSON.stringify({ email }) }),
  automateWithdrawal: (id: string) => apiFetch<any>(`/api/admin/withdrawals/${id}/automate`, { method: 'POST' }),

  // Admin & Platform Settings
  getSettings: () => apiFetch<PlatformSettings>('/api/settings'),
  getAdminDashboard: () => apiFetch<any>('/api/admin/dashboard'),
  getAdminUsers: () => apiFetch<User[]>('/api/admin/users'),
  updateUserStatus: (userId: string, status: string) => apiFetch<User>(`/api/admin/users/${userId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getAuditLogs: () => apiFetch<AuditLog[]>('/api/admin/audit-logs'),
  updateSettings: (settings: Partial<PlatformSettings>) => apiFetch<PlatformSettings>('/api/admin/settings', { method: 'PUT', body: JSON.stringify(settings) }),

  // AI
  analyzeShelfPhoto: (photoUrl: string) => apiFetch<any>('/api/ai/analyze-shelf', { method: 'POST', body: JSON.stringify({ photoUrl }) }),
  shelfMatch: (criteria: any) => apiFetch<any[]>('/api/ai/shelf-match', { method: 'POST', body: JSON.stringify(criteria) }),
  getVendorInsights: () => apiFetch<any>('/api/ai/vendor-insights', { method: 'POST', body: JSON.stringify({}) }),
};
