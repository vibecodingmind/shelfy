/**
 * Platform configuration: admin DB settings + encrypted secrets, with env fallback for bootstrap.
 */
import { dbEngine } from '../db.js';
import { getIntegrationSecret } from '../admin/integrationStore.js';
import { PlatformIntegrationSettings, PlatformSettings } from '../../types/index.js';

const LIVE = 'live' as const;

export function platformIntegrations(): PlatformIntegrationSettings {
  return dbEngine.db.settings.integrations || {};
}

export function mergePlatformSettings(patch: Partial<PlatformSettings>): PlatformSettings {
  dbEngine.db.settings = { ...dbEngine.db.settings, ...patch };
  if (patch.integrations) {
    dbEngine.db.settings.integrations = {
      ...(dbEngine.db.settings.integrations || {}),
      ...patch.integrations,
    };
  }
  return dbEngine.db.settings;
}

function pickSecret(provider: 'SMTP' | 'GEMINI' | 'S3' | 'OAUTH' | 'SMS' | 'MAPS' | 'RESEND', key: string, envKey: string, env: NodeJS.ProcessEnv): string | undefined {
  const fromDb = getIntegrationSecret(provider, LIVE, key);
  if (fromDb) return fromDb;
  return env[envKey]?.trim() || undefined;
}

/** Effective env for outbound integrations (email, AI, storage, OAuth, maps). */
export function effectivePlatformEnv(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env = { ...base };
  const s = dbEngine.db.settings;
  const int = platformIntegrations();

  if (int.appUrl?.trim()) env.APP_URL = int.appUrl.trim().replace(/\/$/, '');
  if (int.emailFrom?.trim()) env.EMAIL_FROM = int.emailFrom.trim();
  if (int.emailReplyTo?.trim()) env.EMAIL_REPLY_TO = int.emailReplyTo.trim();

  const smtp = int.smtp || {};
  if (smtp.url?.trim()) env.SMTP_URL = smtp.url.trim();
  if (smtp.host?.trim()) env.SMTP_HOST = smtp.host.trim();
  if (smtp.port != null) env.SMTP_PORT = String(smtp.port);
  if (smtp.user?.trim()) env.SMTP_USER = smtp.user.trim();
  env.SMTP_SECURE = smtp.secure ? 'true' : 'false';
  env.SMTP_TLS_INSECURE = smtp.tlsInsecure !== false ? 'true' : 'false';
  const smtpPass = pickSecret('SMTP', 'SMTP_PASS', 'SMTP_PASS', base);
  if (smtpPass) env.SMTP_PASS = smtpPass;

  const resendKey = pickSecret('RESEND', 'RESEND_API_KEY', 'RESEND_API_KEY', base);
  if (resendKey && (int.resendEnabled || !int.smtp?.host?.trim())) env.RESEND_API_KEY = resendKey;

  const geminiKey = pickSecret('GEMINI', 'GEMINI_API_KEY', 'GEMINI_API_KEY', base);
  if (geminiKey) env.GEMINI_API_KEY = geminiKey;

  const storage = int.storage || {};
  if (storage.driver === 'local') {
    delete env.S3_BUCKET;
    delete env.S3_ACCESS_KEY;
    delete env.S3_SECRET_KEY;
  } else if (storage.driver === 's3') {
    if (storage.bucket?.trim()) env.S3_BUCKET = storage.bucket.trim();
    if (storage.region?.trim()) env.S3_REGION = storage.region.trim();
    if (storage.endpoint?.trim()) env.S3_ENDPOINT = storage.endpoint.trim();
    if (storage.publicBaseUrl?.trim()) env.S3_PUBLIC_BASE_URL = storage.publicBaseUrl.trim();
    const s3Key = pickSecret('S3', 'S3_ACCESS_KEY', 'S3_ACCESS_KEY', base);
    const s3Secret = pickSecret('S3', 'S3_SECRET_KEY', 'S3_SECRET_KEY', base);
    if (s3Key) env.S3_ACCESS_KEY = s3Key;
    if (s3Secret) env.S3_SECRET_KEY = s3Secret;
  }

  const sms = int.sms || {};
  if (sms.provider === 'africas_talking') {
    if (sms.username?.trim()) env.AFRICASTALKING_USERNAME = sms.username.trim();
    const atKey =
      pickSecret('SMS', 'AFRICASTALKING_API_KEY', 'AFRICASTALKING_API_KEY', base) ||
      pickSecret('SMS', 'SMS_API_KEY', 'AFRICASTALKING_API_KEY', base);
    if (atKey) env.AFRICASTALKING_API_KEY = atKey;
  } else if (sms.provider === 'twilio') {
    if (sms.username?.trim()) env.TWILIO_ACCOUNT_SID = sms.username.trim();
    if (sms.from?.trim()) env.TWILIO_FROM = sms.from.trim();
    const twToken =
      pickSecret('SMS', 'TWILIO_AUTH_TOKEN', 'TWILIO_AUTH_TOKEN', base) ||
      pickSecret('SMS', 'SMS_API_KEY', 'TWILIO_AUTH_TOKEN', base);
    if (twToken) env.TWILIO_AUTH_TOKEN = twToken;
  }

  const mapsKey = pickSecret('MAPS', 'GOOGLE_MAPS_API_KEY', 'GOOGLE_MAPS_API_KEY', base);
  if (mapsKey) env.GOOGLE_MAPS_API_KEY = mapsKey;
  const mapboxKey = pickSecret('MAPS', 'MAPBOX_ACCESS_TOKEN', 'MAPBOX_ACCESS_TOKEN', base);
  if (mapboxKey) env.MAPBOX_ACCESS_TOKEN = mapboxKey;

  const oauth = int.oauth?.google;
  if (oauth?.clientId?.trim()) env.GOOGLE_OAUTH_CLIENT_ID = oauth.clientId.trim();
  const oauthSecret = pickSecret('OAUTH', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_OAUTH_CLIENT_SECRET', base);
  if (oauthSecret) env.GOOGLE_OAUTH_CLIENT_SECRET = oauthSecret;

  if (s.platformName && !env.APP_NAME) env.APP_NAME = s.platformName;

  return env;
}

/** Merged platform configuration used by email, SMS, AI, storage, payments, OAuth. */
export function runtimeEnv(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return effectivePlatformEnv(base);
}

export function publicIntegrationHints(): Record<string, unknown> {
  const int = platformIntegrations();
  return {
    appUrl: int.appUrl || null,
    maps: {
      provider: int.maps?.provider || 'osm',
      defaultCenterLat: int.maps?.defaultCenterLat ?? -6.7924,
      defaultCenterLng: int.maps?.defaultCenterLng ?? 39.2083,
      defaultZoom: int.maps?.defaultZoom ?? 12,
      googleMapsApiKey: int.maps?.publicBrowserKey?.trim() || null,
    },
    oauth: {
      googleEnabled: Boolean(int.oauth?.google?.enabled && int.oauth.google.clientId),
    },
    social: int.social || {},
    branding: {
      platformName: dbEngine.db.settings.platformName || 'Shelfy',
      logoUrl: int.branding?.logoUrl || null,
      faviconUrl: int.branding?.faviconUrl || null,
    },
    registration: {
      vendorEnabled: dbEngine.db.settings.vendorRegistrationEnabled !== false,
      hostEnabled: dbEngine.db.settings.hostRegistrationEnabled !== false,
    },
  };
}
