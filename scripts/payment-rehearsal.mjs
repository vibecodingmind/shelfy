#!/usr/bin/env node
/**
 * End-to-end payment rehearsal: register/book/approve/initiate PesaPal checkout.
 *
 * Production requires demo accounts OR temporarily set ALLOW_DEMO_LOGIN=true on Railway.
 *
 * Usage:
 *   node scripts/payment-rehearsal.mjs [baseUrl]
 *   ALLOW_DEMO_LOGIN=true node scripts/payment-rehearsal.mjs https://shelfy-production-d34d.up.railway.app
 */

const base = (process.argv[2] || process.env.APP_URL || 'https://shelfy-production-d34d.up.railway.app').replace(/\/$/, '');

async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function login(email, password = 'Password123!') {
  const res = await api('POST', '/api/auth/login', { body: { email, password } });
  if (res.status !== 200 || !res.json.success) {
    return { ok: false, status: res.status, message: res.json.error?.message || 'login failed' };
  }
  return { ok: true, token: res.json.data.token, user: res.json.data.user };
}

function futureDate(daysAhead = 400) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

console.log(`Payment rehearsal on ${base}\n`);

const vendorLogin = await login('vendor@shelfy.co.tz');
const hostLogin = await login('host@shelfy.co.tz');

if (!vendorLogin.ok || !hostLogin.ok) {
  console.error('Demo accounts are not available (login blocked).');
  console.error(`  vendor: ${vendorLogin.message || vendorLogin.status}`);
  console.error(`  host: ${hostLogin.message || hostLogin.status}`);
  console.error('\nTo run a live PesaPal rehearsal on production:');
  console.error('  1. Railway → Variables → set ALLOW_DEMO_LOGIN=true');
  console.error('  2. Redeploy, then re-run this script');
  console.error('  3. Open the printed PesaPal redirect URL and pay a small TZS test amount');
  console.error('  4. Remove ALLOW_DEMO_LOGIN after the test');
  process.exit(1);
}

const startDate = futureDate();
const created = await api('POST', '/api/bookings', {
  token: vendorLogin.token,
  body: { shelfId: 'shelf_4', durationMonths: 1, startDate },
});
if (created.status !== 200) {
  console.error('Booking failed:', created.json.error?.message || created.status);
  process.exit(1);
}
const booking = created.json.data;
console.log(`✓ Booking ${booking.id} created (${booking.status}) on shelf_4 starting ${startDate}`);

if (booking.status === 'PENDING_APPROVAL') {
  const approved = await api('PUT', `/api/bookings/${booking.id}/status`, {
    token: hostLogin.token,
    body: { status: 'APPROVED' },
  });
  if (approved.status !== 200) {
    console.error('Host approval failed:', approved.json.error?.message || approved.status);
    process.exit(1);
  }
  console.log(`✓ Host approved → ${approved.json.data.status}`);
}

const checkout = await api('POST', '/api/payments/initiate-session', {
  token: vendorLogin.token,
  body: { bookingId: booking.id },
});
if (checkout.status !== 200) {
  console.error('Payment initiate failed:', checkout.json.error?.message || checkout.status);
  process.exit(1);
}

const pay = checkout.json.data;
console.log('\n✓ PesaPal checkout session created');
console.log(`  paymentId: ${pay.paymentId}`);
console.log(`  mode: ${pay.mode}`);
console.log(`  amountTzs: ${pay.amountTzs}`);
console.log(`  pesapalEnvironment: ${pay.pesapalEnvironment}`);
if (pay.redirectUrl) {
  console.log(`\n→ Open this URL to complete the live payment test:\n  ${pay.redirectUrl}`);
} else {
  console.error('\n✗ No redirectUrl returned — check PesaPal keys and APP_URL on Railway.');
  process.exit(1);
}

console.log('\nAfter paying, verify booking status via GET /api/payments/by-booking/' + booking.id);
