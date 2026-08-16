import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:3460',
    trace: 'on-first-retry',
  },
  webServer: {
    command:
      'ALLOW_DEMO_LOGIN=true NODE_ENV=development PORT=3460 DATA_DIR=/tmp/shelfy-e2e-data DATABASE_URL= tsx server.ts',
    url: 'http://127.0.0.1:3460/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
