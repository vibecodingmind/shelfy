import { PlatformIntegrationSettings, PlatformSettings } from '../../types/index.js';
import { dbEngine } from '../db.js';
import { adminIntegrationsPayload } from '../domain/opsHealth.js';
import { getIntegrationSecret, listIntegrationSecretsMeta, setIntegrationSecret } from './integrationStore.js';
import { integrationEncryptionConfigured } from './encryption.js';
import { mergePlatformSettings, platformIntegrations, runtimeEnv } from '../services/platformConfig.js';
import { resolvedAppUrl } from '../services/jwtSecret.js';

const LIVE = 'live' as const;

export type PlatformConfigSecretsInput = Record<string, string | undefined>;

const SECRET_MAP: Record<string, { provider: 'SMTP' | 'GEMINI' | 'S3' | 'OAUTH' | 'SMS' | 'MAPS' | 'RESEND'; key: string }> = {
  SMTP_PASS: { provider: 'SMTP', key: 'SMTP_PASS' },
  RESEND_API_KEY: { provider: 'RESEND', key: 'RESEND_API_KEY' },
  GEMINI_API_KEY: { provider: 'GEMINI', key: 'GEMINI_API_KEY' },
  S3_ACCESS_KEY: { provider: 'S3', key: 'S3_ACCESS_KEY' },
  S3_SECRET_KEY: { provider: 'S3', key: 'S3_SECRET_KEY' },
  GOOGLE_OAUTH_CLIENT_SECRET: { provider: 'OAUTH', key: 'GOOGLE_OAUTH_CLIENT_SECRET' },
  GOOGLE_MAPS_API_KEY: { provider: 'MAPS', key: 'GOOGLE_MAPS_API_KEY' },
  GOOGLE_PLACES_API_KEY: { provider: 'MAPS', key: 'GOOGLE_PLACES_API_KEY' },
  MAPBOX_ACCESS_TOKEN: { provider: 'MAPS', key: 'MAPBOX_ACCESS_TOKEN' },
  AFRICASTALKING_API_KEY: { provider: 'SMS', key: 'AFRICASTALKING_API_KEY' },
  TWILIO_AUTH_TOKEN: { provider: 'SMS', key: 'TWILIO_AUTH_TOKEN' },
};

function envSecretConfigured(envKey: string): boolean {
  const map = SECRET_MAP[envKey];
  if (!map) return false;
  return Boolean(getIntegrationSecret(map.provider, LIVE, map.key) || process.env[envKey]?.trim());
}

export function buildAdminPlatformConfigResponse() {
  const s = dbEngine.db.settings;
  const int = platformIntegrations();
  const env = runtimeEnv();
  const status = adminIntegrationsPayload(env);
  const appUrl = resolvedAppUrl(env);

  return {
    settings: {
      platformName: s.platformName || 'Shelfy',
      supportEmail: s.supportEmail || '',
      supportPhone: s.supportPhone || '',
      defaultCountry: s.defaultCountry || 'TZ',
      timeZone: s.timeZone || 'Africa/Dar_es_Salaam',
      vendorRegistrationEnabled: s.vendorRegistrationEnabled !== false,
      hostRegistrationEnabled: s.hostRegistrationEnabled !== false,
      currency: s.currency || 'TZS',
    },
    integrations: int,
    secretsMeta: {
      SMTP_PASS: envSecretConfigured('SMTP_PASS'),
      RESEND_API_KEY: envSecretConfigured('RESEND_API_KEY'),
      GEMINI_API_KEY: envSecretConfigured('GEMINI_API_KEY'),
      S3_ACCESS_KEY: envSecretConfigured('S3_ACCESS_KEY'),
      S3_SECRET_KEY: envSecretConfigured('S3_SECRET_KEY'),
      GOOGLE_OAUTH_CLIENT_SECRET: envSecretConfigured('GOOGLE_OAUTH_CLIENT_SECRET'),
      GOOGLE_MAPS_API_KEY: envSecretConfigured('GOOGLE_MAPS_API_KEY'),
      GOOGLE_PLACES_API_KEY: envSecretConfigured('GOOGLE_PLACES_API_KEY'),
      MAPBOX_ACCESS_TOKEN: envSecretConfigured('MAPBOX_ACCESS_TOKEN'),
      AFRICASTALKING_API_KEY: envSecretConfigured('AFRICASTALKING_API_KEY'),
      TWILIO_AUTH_TOKEN: envSecretConfigured('TWILIO_AUTH_TOKEN'),
    },
    encryptionConfigured: integrationEncryptionConfigured(),
    status,
    appUrl,
    googleOAuthRedirectUri: `${appUrl.replace(/\/$/, '')}/api/auth/google/callback`,
    configurationNote:
      'Configure platform integrations here. Secrets are encrypted in the database. Server env vars are used only as fallback when admin values are empty.',
    azamPaySecrets: {
      sandbox: listIntegrationSecretsMeta('AZAMPAY', 'sandbox'),
      live: listIntegrationSecretsMeta('AZAMPAY', 'live'),
    },
  };
}

export function applyAdminPlatformConfigUpdate(input: {
  settings?: Partial<PlatformSettings>;
  integrations?: PlatformIntegrationSettings;
  secrets?: PlatformConfigSecretsInput;
  updatedBy?: string;
}): PlatformSettings {
  const { settings, integrations, secrets, updatedBy } = input;

  if (settings) {
    const s = dbEngine.db.settings;
    if (typeof settings.platformName === 'string') s.platformName = settings.platformName.trim();
    if (typeof settings.supportEmail === 'string') s.supportEmail = settings.supportEmail.trim();
    if (typeof settings.supportPhone === 'string') s.supportPhone = settings.supportPhone.trim();
    if (typeof settings.defaultCountry === 'string') s.defaultCountry = settings.defaultCountry.trim();
    if (typeof settings.timeZone === 'string') s.timeZone = settings.timeZone.trim();
    if (typeof settings.vendorRegistrationEnabled === 'boolean') s.vendorRegistrationEnabled = settings.vendorRegistrationEnabled;
    if (typeof settings.hostRegistrationEnabled === 'boolean') s.hostRegistrationEnabled = settings.hostRegistrationEnabled;
    if (typeof settings.currency === 'string' && settings.currency.trim()) s.currency = settings.currency.trim();
  }

  if (integrations) {
    mergePlatformSettings({ integrations });
  }

  if (secrets && typeof secrets === 'object') {
    for (const [envKey, val] of Object.entries(secrets)) {
      if (typeof val !== 'string' || !val.trim()) continue;
      const map = SECRET_MAP[envKey];
      if (map) setIntegrationSecret(map.provider, LIVE, map.key, val.trim(), updatedBy);
    }
  }

  void dbEngine.saveAsync();
  return dbEngine.db.settings;
}
