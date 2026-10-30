import { PlatformSettings } from '../../types/index.js';
import { azamPayEnvironment } from '../payments/azampay.js';

/** Public `/api/settings` payload: DB settings with runtime Azam Pay env from process env. */
export function publicPlatformSettings(settings: PlatformSettings): PlatformSettings {
  const env = azamPayEnvironment();
  return {
    ...settings,
    azamPayEnvironment: env,
    /** @deprecated use azamPayEnvironment */
    pesapalEnvironment: env,
  };
}
