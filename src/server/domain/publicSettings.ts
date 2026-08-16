import { PlatformSettings } from '../../types/index.js';
import { pesapalEnvironment } from '../payments/pesapal.js';

/** Public `/api/settings` payload: DB settings with runtime PesaPal env from process env. */
export function publicPlatformSettings(settings: PlatformSettings): PlatformSettings {
  return {
    ...settings,
    pesapalEnvironment: pesapalEnvironment(),
  };
}
