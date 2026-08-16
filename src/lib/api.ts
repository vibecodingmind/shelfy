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
  initiatePesapalSession: (bookingId: string) => apiFetch<any>('/api/payments/initiate-session', { method: 'POST', body: JSON.stringify({ bookingId }) }),
  verifyPesapalCallback: (payload: { bookingId: string; transactionReference: string; orderTrackingId?: string; paymentProvider?: string; phoneOrCardNumber?: string }) => apiFetch<any>('/api/payments/callback-verify', { method: 'POST', body: JSON.stringify(payload) }),
  checkoutPayment: (paymentData: any) => apiFetch<{ payment: Payment; booking: Booking }>('/api/payments/checkout', { method: 'POST', body: JSON.stringify(paymentData) }),

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
  getMessages: () => apiFetch<Message[]>('/api/messages'),
  sendMessage: (msgData: any) => apiFetch<Message>('/api/messages', { method: 'POST', body: JSON.stringify(msgData) }),

  // Admin
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
