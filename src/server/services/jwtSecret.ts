import crypto from 'crypto';
import { getPrisma } from '../prisma.js';

const OPS_JWT_SETTING_ID = 'ops_jwt_secret';

export type JwtSecretSource = 'env' | 'persisted' | 'generated' | 'ephemeral';

export interface JwtSecretState {
  source: JwtSecretSource;
  configured: boolean;
  ephemeral: boolean;
}

function railwayEphemeralSecret(): string {
  return process.env.RAILWAY_ENVIRONMENT_ID ? `shelfy_${process.env.RAILWAY_ENVIRONMENT_ID}_jwt` : 'shelfy_dev_only_jwt_secret';
}

export function resolvedAppUrl(env: NodeJS.ProcessEnv = process.env, port = 3000): string {
  const explicit = env.APP_URL?.trim().replace(/\/$/, '');
  if (explicit) return explicit;
  const railway = env.RAILWAY_PUBLIC_DOMAIN?.trim() || env.RAILWAY_STATIC_URL?.trim();
  if (railway) {
    const host = railway.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `https://${host}`;
  }
  return `http://localhost:${port}`;
}

export async function ensureJwtSecret(): Promise<JwtSecretState> {
  const fromEnv = process.env.JWT_SECRET?.trim();
  if (fromEnv) {
    return { source: 'env', configured: true, ephemeral: false };
  }

  const prisma = getPrisma();
  if (prisma) {
    try {
      const row = await prisma.platformSetting.findUnique({ where: { id: OPS_JWT_SETTING_ID } });
      const existing = row && typeof row.value === 'object' && row.value && 'secret' in (row.value as object)
        ? String((row.value as { secret?: string }).secret || '')
        : '';
      if (existing.length >= 32) {
        process.env.JWT_SECRET = existing;
        return { source: 'persisted', configured: true, ephemeral: false };
      }
      const secret = crypto.randomBytes(48).toString('hex');
      await prisma.platformSetting.upsert({
        where: { id: OPS_JWT_SETTING_ID },
        create: { id: OPS_JWT_SETTING_ID, value: { secret } },
        update: { value: { secret } },
      });
      process.env.JWT_SECRET = secret;
      console.warn('JWT_SECRET was missing. Generated a stable secret and stored it in Postgres (ops_jwt_secret). Set JWT_SECRET in Railway Variables to own it explicitly.');
      return { source: 'generated', configured: true, ephemeral: false };
    } catch (err) {
      console.warn('Could not persist JWT_SECRET in Postgres:', err instanceof Error ? err.message : err);
    }
  }

  process.env.JWT_SECRET = railwayEphemeralSecret();
  if (process.env.NODE_ENV === 'production') {
    console.warn('JWT_SECRET is not set and could not be persisted. Sessions will not survive deploys.');
  }
  return { source: 'ephemeral', configured: false, ephemeral: true };
}
