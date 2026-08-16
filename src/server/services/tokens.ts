import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { DatabaseSchema } from '../seedData.js';
import { AuthToken } from '../../types/index.js';
import { newId, newToken } from '../domain/ids.js';

export function hashSecret(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createAuthToken(
  db: DatabaseSchema,
  userId: string,
  type: AuthToken['type'],
  ttlMs: number
): { raw: string; record: AuthToken } {
  const raw = type === 'PHONE_OTP' ? String(Math.floor(100000 + Math.random() * 900000)) : newToken();
  const now = new Date();
  const nowIso = now.toISOString();
  for (const token of db.authTokens) {
    if (token.userId === userId && token.type === type && !token.usedAt) {
      token.usedAt = nowIso;
    }
  }
  const record: AuthToken = {
    id: newId('tok'),
    userId,
    type,
    tokenHash: hashSecret(raw),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    createdAt: nowIso,
  };
  db.authTokens.push(record);
  return { raw, record };
}

export function consumeAuthToken(db: DatabaseSchema, type: AuthToken['type'], raw: string): AuthToken | null {
  const tokenHash = hashSecret(raw);
  const now = Date.now();
  const found = db.authTokens.find(
    (t) => t.type === type && t.tokenHash === tokenHash && !t.usedAt && new Date(t.expiresAt).getTime() > now
  );
  if (!found) return null;
  found.usedAt = new Date().toISOString();
  return found;
}

export function revokeAuthTokens(db: DatabaseSchema, userId: string, type: AuthToken['type']): number {
  const now = new Date().toISOString();
  let count = 0;
  for (const token of db.authTokens) {
    if (token.userId === userId && token.type === type && !token.usedAt) {
      token.usedAt = now;
      count += 1;
    }
  }
  return count;
}

export function rotateRefreshToken(db: DatabaseSchema, raw: string): { userId: string; raw: string } | null {
  const consumed = consumeAuthToken(db, 'REFRESH', raw);
  if (!consumed) return null;
  const next = createAuthToken(db, consumed.userId, 'REFRESH', REFRESH_TOKEN_TTL_MS);
  return { userId: consumed.userId, raw: next.raw };
}

export function sandboxSignature(paymentId: string): string {
  const secret = process.env.PESAPAL_SANDBOX_KEY || process.env.JWT_SECRET || 'shelfy_dev_only_jwt_secret';
  return crypto.createHmac('sha256', secret).update(paymentId).digest('hex');
}

export function verifySandboxSignature(paymentId: string, provided?: string): boolean {
  if (!provided) return false;
  const expected = sandboxSignature(paymentId);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
