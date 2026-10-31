import { notificationProviders } from './notifications.js';
import { storageStatus } from '../services/storage.js';
import { resolvedAppUrl } from '../services/jwtSecret.js';
import { azamPayConfigured, azamPayEnvironment } from '../payments/azampay.js';
import { runtimeEnv } from '../services/platformConfig.js';

export interface JwtRuntimeStatus {
  configured: boolean;
  ephemeral: boolean;
}

export function jwtRuntimeStatus(env: NodeJS.ProcessEnv = process.env): JwtRuntimeStatus {
  const configured = Boolean(env.JWT_SECRET?.trim());
  return { configured, ephemeral: !configured };
}

export function azamPayRuntimeStatus(env: NodeJS.ProcessEnv = process.env) {
  return { configured: azamPayConfigured(env), environment: azamPayEnvironment(env) };
}

/** Admin-only integration status (no secret values). */
export function adminIntegrationsPayload(env: NodeJS.ProcessEnv = runtimeEnv()) {
  const snap = opsHealthSnapshot(env);
  const appUrl = resolvedAppUrl(env);
  return {
    ...snap,
    gemini: { configured: Boolean(env.GEMINI_API_KEY?.trim()) },
    maps: {
      configured: Boolean(env.GOOGLE_MAPS_API_KEY?.trim() || env.MAPBOX_ACCESS_TOKEN?.trim()),
    },
    googleOAuth: {
      configured: Boolean(env.GOOGLE_OAUTH_CLIENT_ID?.trim() && env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()),
    },
    azamPayCallbackUrl: appUrl ? `${appUrl.replace(/\/$/, '')}/api/payments/azampay/callback` : null,
    azamPayReturnUrl: appUrl ? `${appUrl.replace(/\/$/, '')}/api/payments/azampay/return` : null,
    configurationNote:
      'Manage integrations in Admin → Settings → Platform. Values saved here override deployment env fallbacks.',
  };
}

export function opsHealthSnapshot(env: NodeJS.ProcessEnv = process.env) {
  const providers = notificationProviders(env);
  const emailConfigured = Boolean(providers.email);
  return {
    jwt: jwtRuntimeStatus(env),
    azampay: azamPayRuntimeStatus(env),
    /** @deprecated Legacy health field — mirrors azampay */
    pesapal: azamPayRuntimeStatus(env),
    storage: storageStatus(env),
    appUrl: resolvedAppUrl(env),
    email: { configured: emailConfigured, provider: providers.email },
    sms: { configured: Boolean(providers.sms), provider: providers.sms },
    onboarding: {
      emailVerificationRequired: emailConfigured,
      autoVerifyWhenEmailDisabled: !emailConfigured,
    },
  };
}
