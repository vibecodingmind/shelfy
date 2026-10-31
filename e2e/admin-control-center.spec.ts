import { test, expect } from '@playwright/test';

test.describe('Super Admin control center', () => {
  test('admin can load analytics API', async ({ request }) => {
    const login = await request.post('/api/auth/login', {
      data: { email: 'admin@shelfy.co.tz', password: 'Password123!' },
    });
    if (!login.ok()) {
      test.skip(true, 'Admin seed login unavailable in this environment');
    }
    const body = await login.json();
    const token = body.data?.token;
    expect(token).toBeTruthy();
    const analytics = await request.get('/api/admin/analytics?from=2026-01-01&to=2026-12-31', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(analytics.ok()).toBeTruthy();
    const data = await analytics.json();
    expect(data.data?.kpis?.totalUsers).toBeGreaterThan(0);
  });

  test('vendor cannot access admin clients', async ({ request }) => {
    const login = await request.post('/api/auth/login', {
      data: { email: 'vendor@shelfy.co.tz', password: 'Password123!' },
    });
    expect(login.ok()).toBeTruthy();
    const token = (await login.json()).data.token;
    const denied = await request.get('/api/admin/clients', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(denied.status()).toBe(403);
  });
});
