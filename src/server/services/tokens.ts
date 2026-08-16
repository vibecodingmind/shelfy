import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { DatabaseSchema } from '../seedData.js';
import { AuthToken } from '../../types/index.js';
import { newId, newToken } from '../domain/ids.js';

export function hashSecret(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function createAuthToken(
  db: DatabaseSchema,
  userId: string,
  type: AuthToken['type'],
  ttlMs: number
): { raw: string; record: AuthToken } {
  const raw = type === 'PHONE_OTP' ? String(Math.floor(100000 + Math.random() * 900000)) : newToken();
  const now = new Date();
  const record: AuthToken = {
    id: newId('tok'),
    userId,
    type,
    tokenHash: hashSecret(raw),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    createdAt: now.toISOString(),
  };
  db.authTokens = db.authTokens.filter((t) => !(t.userId === userId && t.type === type && !t.usedAt));
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
