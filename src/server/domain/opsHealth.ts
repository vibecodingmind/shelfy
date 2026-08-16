import { notificationProviders } from './notifications.js';
import { storageStatus } from '../services/storage.js';

export interface JwtRuntimeStatus {
  configured: boolean;
  ephemeral: boolean;
}

export function jwtRuntimeStatus(env: NodeJS.ProcessEnv = process.env): JwtRuntimeStatus {
  const configured = Boolean(env.JWT_SECRET?.trim());
  return { configured, ephemeral: !configured };
}

export function pesapalRuntimeStatus(env: NodeJS.ProcessEnv = process.env) {
  const configured = Boolean(env.PESAPAL_CONSUMER_KEY?.trim() && env.PESAPAL_CONSUMER_SECRET?.trim());
  const raw = (env.PESAPAL_ENVIRONMENT || 'sandbox').toLowerCase();
  return { configured, environment: raw === 'live' ? 'live' : 'sandbox' };
}

export function opsHealthSnapshot(env: NodeJS.ProcessEnv = process.env) {
  const providers = notificationProviders(env);
  return {
    jwt: jwtRuntimeStatus(env),
    pesapal: pesapalRuntimeStatus(env),
    storage: storageStatus(env),
    email: { configured: Boolean(providers.email), provider: providers.email },
    sms: { configured: Boolean(providers.sms), provider: providers.sms },
  };
}
