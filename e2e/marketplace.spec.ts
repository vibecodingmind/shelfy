import { test, expect } from '@playwright/test';

test.describe('Marketplace shell', () => {
  test('loads the landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Shelfy|Tanzania/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('renders legal terms without placeholder markers', async ({ page }) => {
    await page.goto('/legal/terms');
    await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible();
    await expect(page.getByText('LEGAL_REVIEW_REQUIRED')).toHaveCount(0);
    await expect(page.getByText(/Shelfy Tanzania Ltd/i)).toBeVisible();
  });
});

test.describe('Demo auth journey', () => {
  test('vendor can log in when demo login is enabled', async ({ page, request }) => {
    const login = await request.post('/api/auth/login', {
      data: { email: 'vendor@shelfy.co.tz', password: 'Password123!' },
    });
    expect(login.ok()).toBeTruthy();
    const body = await login.json();
    expect(body.data.token).toBeTruthy();
    expect(body.data.user.role).toBe('VENDOR');

    await page.goto('/');
    await expect(page.getByText(/Shelfy|Tanzania/i).first()).toBeVisible();
  });
});
