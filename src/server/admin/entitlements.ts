import { dbEngine } from '../db.js';

/** Minimal v1: active subscription plan entitlements for a user. */
export function activeEntitlementsForUser(userId: string): string[] {
  const now = Date.now();
  const sub = (dbEngine.db.subscriptions || []).find((s) => {
    if (s.userId !== userId) return false;
    if (s.status !== 'ACTIVE' && s.status !== 'TRIAL') return false;
    return new Date(s.currentPeriodEnd).getTime() >= now;
  });
  if (!sub) return [];
  const plan = (dbEngine.db.subscriptionPlans || []).find((p) => p.id === sub.planId && p.active);
  return plan?.entitlements || [];
}

export function maxShelfListingsForUser(userId: string, defaultMax = 50): number {
  const ents = activeEntitlementsForUser(userId);
  if (ents.includes('UNLIMITED_SHELVES')) return 9999;
  if (ents.includes('PREMIUM_HOST')) return 100;
  return defaultMax;
}

export function commissionDiscountBpsForUser(userId: string): number {
  const ents = activeEntitlementsForUser(userId);
  if (ents.includes('REDUCED_COMMISSION')) return 200;
  return 0;
}
