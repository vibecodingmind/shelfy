import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/server/**/*.test.ts'],
    env: {
      JWT_SECRET: 'vitest_jwt_secret_shelfy',
      ALLOW_DEMO_LOGIN: 'true',
    },
  },
});
