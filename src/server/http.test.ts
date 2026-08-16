/**
 * HTTP tests hit the real Express app without booting Vite or Postgres.
 * Env is set before the dynamic import so JWT_SECRET / DATA_DIR / DATABASE_URL
 * are correct when auth.ts and db.ts load.
 */

import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'vitest_jwt_secret_shelfy';
process.env.ALLOW_DEMO_LOGIN = 'true';
process.env.NODE_ENV = 'test';
delete process.env.DATABASE_URL;
delete process.env.PESAPAL_CONSUMER_KEY;
delete process.env.PESAPAL_CONSUMER_SECRET;
delete process.env.PESAPAL_ENVIRONMENT;
delete process.env.RESEND_API_KEY;
delete process.env.SMTP_URL;
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'shelfy-http-'));

const { app, prepareHttpApp } = await import('../../server.js');

const jsonHeaders = { 'Content-Type': 'application/json' };

function listen(): Promise<{ server: http.Server; origin: string }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Failed to bind test server'));
        return;
      }
      resolve({ server, origin: `http://127.0.0.1:${addr.port}` });
    });
  });
}

async function api(
  origin: string,
  method: string,
  pathname: string,
  opts: { token?: string; body?: unknown } = {}
) {
  const headers: Record<string, string> = { ...jsonHeaders };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${origin}${pathname}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function login(origin: string, email: string) {
  const res = await api(origin, 'POST', '/api/auth/login', {
    body: { email, password: 'Password123!' },
  });
  expect(res.status).toBe(200);
  expect(res.json.success).toBe(true);
  return res.json.data as { token: string; refreshToken: string; user: { id: string; role: string; passwordHash?: string } };
}

describe('HTTP API', () => {
  let server: http.Server;
  let origin: string;

  beforeAll(async () => {
    await prepareHttpApp();
    const listening = await listen();
    server = listening.server;
    origin = listening.origin;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('reports health 200 with jwt configured and never 503', async () => {
    const res = await api(origin, 'GET', '/api/health');
    expect(res.status).toBe(200);
    expect(res.json.status).toBe('ok');
    expect(res.json.jwt.configured).toBe(true);
    expect(res.json.jwt.ephemeral).toBe(false);
    expect(res.json.pesapal.configured).toBe(false);
  });

  it('logs in a demo vendor with access + refresh and strips the password hash', async () => {
    const session = await login(origin, 'vendor@shelfy.co.tz');
    expect(session.token).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();
    expect(session.user.role).toBe('VENDOR');
    expect(session.user.passwordHash).toBeUndefined();
    const me = await api(origin, 'GET', '/api/auth/me', { token: session.token });
    expect(me.status).toBe(200);
    expect(me.json.data.user.email).toBe('vendor@shelfy.co.tz');
    expect(me.json.data.user.passwordHash).toBeUndefined();
    expect(me.json.data.user.failedLoginCount).toBeUndefined();
  });

  it('rejects admin self-registration', async () => {
    const res = await api(origin, 'POST', '/api/auth/register', {
      body: {
        name: 'Nope Admin',
        email: `admin-self-${Date.now()}@shelfy.test`,
        password: 'Password123!',
        role: 'ADMIN',
      },
    });
    expect(res.status).toBe(400);
    expect(res.json.success).toBe(false);
  });

  it('returns 410 for client-confirm payment routes', async () => {
    const session = await login(origin, 'vendor@shelfy.co.tz');
    const verify = await api(origin, 'POST', '/api/payments/callback-verify', { token: session.token, body: {} });
    expect(verify.status).toBe(410);
    const checkout = await api(origin, 'POST', '/api/payments/checkout', { token: session.token, body: {} });
    expect(checkout.status).toBe(410);
  });

  it('lists only published shelves publicly and scopes bookings to the vendor', async () => {
    const publicList = await api(origin, 'GET', '/api/shelves');
    expect(publicList.status).toBe(200);
    const shelves = publicList.json.data as Array<{ id: string; listingStatus?: string; deletedAt?: string }>;
    expect(shelves.length).toBeGreaterThan(0);
    expect(shelves.every((s) => !s.deletedAt)).toBe(true);

    const vendor = await login(origin, 'vendor@shelfy.co.tz');
    const bookings = await api(origin, 'GET', '/api/bookings', { token: vendor.token });
    expect(bookings.status).toBe(200);
    const rows = bookings.json.data as Array<{ vendorId: string }>;
    expect(rows.every((b) => b.vendorId === vendor.user.id)).toBe(true);
  });

  it('hides another vendor’s payment booking as 404', async () => {
    const vendor = await login(origin, 'vendor@shelfy.co.tz');
    const hidden = await api(origin, 'GET', '/api/payments/by-booking/bk_1002', { token: vendor.token });
    expect(hidden.status).toBe(404);
    const own = await api(origin, 'GET', '/api/payments/by-booking/bk_1001', { token: vendor.token });
    expect(own.status).toBe(200);
    expect(own.json.data.booking.id).toBe('bk_1001');
  });

  it('forbids vendors from finance summary and admin user lists', async () => {
    const vendor = await login(origin, 'vendor@shelfy.co.tz');
    const finance = await api(origin, 'GET', '/api/finance/summary', { token: vendor.token });
    expect(finance.status).toBe(403);
    const users = await api(origin, 'GET', '/api/admin/users', { token: vendor.token });
    expect(users.status).toBe(403);
  });

  it('rotates a refresh token and rejects the old one', async () => {
    const session = await login(origin, 'host@shelfy.co.tz');
    const refreshed = await api(origin, 'POST', '/api/auth/refresh', { body: { refreshToken: session.refreshToken } });
    expect(refreshed.status).toBe(200);
    expect(refreshed.json.data.token).toBeTruthy();
    expect(refreshed.json.data.refreshToken).not.toBe(session.refreshToken);
    const reuse = await api(origin, 'POST', '/api/auth/refresh', { body: { refreshToken: session.refreshToken } });
    expect(reuse.status).toBe(401);
  });

  it('lets a verified vendor create a non-overlapping booking', async () => {
    const vendor = await login(origin, 'vendor@shelfy.co.tz');
    const created = await api(origin, 'POST', '/api/bookings', {
      token: vendor.token,
      body: { shelfId: 'shelf_4', durationMonths: 1, startDate: '2028-01-01' },
    });
    expect(created.status).toBe(200);
    expect(created.json.success).toBe(true);
    expect(created.json.data.vendorId).toBe(vendor.user.id);
    expect(created.json.data.status).toBe('PENDING_APPROVAL');
    expect(created.json.data.totalPriceTzs).toBeGreaterThan(0);
  });

  it('scopes field visits by role and hides vendor names on public availability', async () => {
    const vendor = await login(origin, 'vendor@shelfy.co.tz');
    const vendorVisits = await api(origin, 'GET', '/api/field-visits', { token: vendor.token });
    expect(vendorVisits.status).toBe(403);

    const host = await login(origin, 'host@shelfy.co.tz');
    const hostVisits = await api(origin, 'GET', '/api/field-visits', { token: host.token });
    expect(hostVisits.status).toBe(200);
    const hostRows = hostVisits.json.data as Array<{ shopId: string }>;
    expect(hostRows.length).toBeGreaterThan(0);
    expect(hostRows.every((v) => v.shopId === 'shop_1')).toBe(true);

    const availability = await api(origin, 'GET', '/api/shelves/shelf_1/availability');
    expect(availability.status).toBe(200);
    const ranges = availability.json.data.bookedRanges as Array<Record<string, unknown>>;
    expect(ranges.length).toBeGreaterThan(0);
    expect(ranges.every((r) => !('vendorName' in r))).toBe(true);
  });

  it('auto-verifies email on register when no email provider is configured', async () => {
    const email = `vendor-auto-${Date.now()}@shelfy.test`;
    const registered = await api(origin, 'POST', '/api/auth/register', {
      body: {
        name: 'Auto Verified Vendor',
        email,
        password: 'Password123!',
        role: 'VENDOR',
      },
    });
    expect(registered.status).toBe(200);
    expect(registered.json.data.emailVerificationRequired).toBe(false);
    expect(registered.json.data.user.status).toBe('ACTIVE');
    expect(registered.json.data.user.emailVerifiedAt).toBeTruthy();

    const loggedIn = await api(origin, 'POST', '/api/auth/login', {
      body: { email, password: 'Password123!' },
    });
    expect(loggedIn.status).toBe(200);
    const created = await api(origin, 'POST', '/api/bookings', {
      token: loggedIn.json.data.token,
      body: { shelfId: 'shelf_4', durationMonths: 1, startDate: '2029-06-01' },
    });
    expect(created.status).toBe(200);
  });

  it('rejects sandbox-complete without signature and exposes runtime pesapal env in settings', async () => {
    const nosig = await api(origin, 'POST', '/api/payments/sandbox-complete', { body: { paymentId: 'pay_test' } });
    expect(nosig.status).toBe(403);

    const settings = await api(origin, 'GET', '/api/settings');
    expect(settings.status).toBe(200);
    expect(settings.json.data.pesapalEnvironment).toBe('sandbox');
    expect(settings.json.data.autoApproveBookings).toBe(false);
  });
});
