import { dbEngine } from '../db.js';
import { IntegrationCredential, IntegrationLog, IntegrationProvider } from '../../types/index.js';
import { decryptSecret, encryptSecret, maskSecret } from './encryption.js';
import { newId } from '../domain/ids.js';

export function logIntegrationEvent(input: Omit<IntegrationLog, 'id' | 'createdAt'>): void {
  if (!dbEngine.db.integrationLogs) dbEngine.db.integrationLogs = [];
  dbEngine.db.integrationLogs.unshift({
    id: newId('ilog'),
    createdAt: new Date().toISOString(),
    ...input,
  });
  dbEngine.db.integrationLogs = dbEngine.db.integrationLogs.slice(0, 5000);
  void dbEngine.saveAsync();
}

export function setIntegrationSecret(
  provider: IntegrationProvider,
  environment: 'sandbox' | 'live',
  key: string,
  value: string,
  updatedBy?: string
): void {
  if (!dbEngine.db.integrationCredentials) dbEngine.db.integrationCredentials = [];
  const { ciphertext, iv, tag } = encryptSecret(value);
  const existing = dbEngine.db.integrationCredentials.find(
    (c) => c.provider === provider && c.environment === environment && c.key === key
  );
  const now = new Date().toISOString();
  if (existing) {
    existing.ciphertext = ciphertext;
    existing.iv = iv;
    existing.tag = tag;
    existing.updatedAt = now;
    existing.updatedBy = updatedBy;
  } else {
    dbEngine.db.integrationCredentials.push({
      id: newId('icred'),
      provider,
      environment,
      key,
      ciphertext,
      iv,
      tag,
      updatedBy,
      updatedAt: now,
    });
  }
  void dbEngine.saveAsync();
}

export function getIntegrationSecret(
  provider: IntegrationProvider,
  environment: 'sandbox' | 'live',
  key: string
): string | null {
  const row = (dbEngine.db.integrationCredentials || []).find(
    (c) => c.provider === provider && c.environment === environment && c.key === key
  );
  if (!row) return null;
  try {
    return decryptSecret(row.ciphertext, row.iv, row.tag);
  } catch {
    return null;
  }
}

export function listIntegrationSecretsMeta(provider: IntegrationProvider, environment: 'sandbox' | 'live'): Array<{ key: string; masked: string; configured: boolean }> {
  return (dbEngine.db.integrationCredentials || [])
    .filter((c) => c.provider === provider && c.environment === environment)
    .map((c) => {
      let masked = '****';
      try {
        masked = maskSecret(decryptSecret(c.ciphertext, c.iv, c.tag));
      } catch {
        masked = '****';
      }
      return { key: c.key, masked, configured: true };
    });
}

export function buildAzamPayEnvFromStore(environment: 'sandbox' | 'live'): NodeJS.ProcessEnv {
  const base = { ...process.env };
  const keys = ['AZAMPAY_APP_NAME', 'AZAMPAY_CLIENT_ID', 'AZAMPAY_CLIENT_SECRET', 'AZAMPAY_API_KEY', 'AZAMPAY_BASE_URL', 'AZAMPAY_AUTH_URL'];
  for (const k of keys) {
    const v = getIntegrationSecret('AZAMPAY', environment, k);
    if (v) (base as any)[k] = v;
  }
  base.AZAMPAY_ENVIRONMENT = environment === 'live' ? 'live' : 'sandbox';
  return base;
}
