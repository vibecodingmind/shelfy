import { User, UserRole, UserStatus } from '../../types/index.js';

export function isActiveForApi(user: User, allowPending = false): boolean {
  if (user.status === 'SUSPENDED') return false;
  if (user.status === 'PENDING') return allowPending;
  return user.status === 'ACTIVE';
}

export function hasRole(user: User, roles: UserRole[]): boolean {
  return user.role === 'ADMIN' || roles.includes(user.role);
}

export function ownsResource(user: User, ownerId: string): boolean {
  return user.role === 'ADMIN' || user.id === ownerId;
}

export function canAccessBooking(user: User, booking: { vendorId: string; hostId: string }): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'VENDOR') return booking.vendorId === user.id;
  if (user.role === 'HOST') return booking.hostId === user.id;
  return false;
}

export function canAccessPayment(user: User, payment: { vendorId: string }, booking?: { hostId: string }): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'VENDOR') return payment.vendorId === user.id;
  if (user.role === 'HOST' && booking) return booking.hostId === user.id;
  return false;
}

export function canAccessPayouts(user: User): boolean {
  return user.role === 'ADMIN' || user.role === 'HOST';
}

export const PENDING_ALLOWED_PATHS = [
  '/api/auth/me',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
  '/api/auth/request-phone-otp',
  '/api/auth/verify-phone',
  '/api/auth/logout',
  '/api/notifications',
];
