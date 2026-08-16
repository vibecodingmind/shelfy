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
} from '../types/index.js';

const TOKEN_KEY = 'shelfy_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<{ success: boolean; data?: T; error?: { message: string } }> {
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
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, error: { message: err.message || 'Network request failed.' } };
  }
}

export const api = {
  // Auth
  login: (credentials: any) => apiFetch<{ token: string; user: User; vendorProfile?: VendorProfile; hostProfile?: HostProfile }>('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (data: any) => apiFetch<{ token: string; user: User }>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => apiFetch<{ user: User; vendorProfile?: VendorProfile; hostProfile?: HostProfile }>('/api/auth/me'),

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
  getShelfAvailability: (id: string) => apiFetch<{ shelfId: string; availabilityStatus: string; monthlyPriceTzs: number; bookedRanges: Array<{ bookingId: string; startDate: string; endDate: string; status: string; vendorName: string }> }>(`/api/shelves/${id}/availability`),
  createShelf: (shelfData: any) => apiFetch<Shelf>('/api/shelves', { method: 'POST', body: JSON.stringify(shelfData) }),

  // Bookings & Payments
  createBooking: (bookingData: any) => apiFetch<Booking>('/api/bookings', { method: 'POST', body: JSON.stringify(bookingData) }),
  getBookings: () => apiFetch<Booking[]>('/api/bookings'),
  updateBookingStatus: (bookingId: string, status: string) => apiFetch<Booking>(`/api/bookings/${bookingId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getPayouts: () => apiFetch<Payout[]>('/api/payouts'),
  initiatePesapalSession: (bookingId: string) => apiFetch<any>('/api/payments/initiate-session', { method: 'POST', body: JSON.stringify({ bookingId }) }),
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
  getMessages: () => apiFetch<Message[]>('/api/messages'),
  sendMessage: (msgData: any) => apiFetch<Message>('/api/messages', { method: 'POST', body: JSON.stringify(msgData) }),

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
