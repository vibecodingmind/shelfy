#!/usr/bin/env node
/**
 * End-to-end payment rehearsal: register/book/approve/initiate Azam Pay MNO checkout.
 *
 * Production requires demo accounts OR temporarily set ALLOW_DEMO_LOGIN=true on Railway.
 *
 * Usage:
 *   node scripts/payment-rehearsal.mjs [baseUrl]
 *   ALLOW_DEMO_LOGIN=true node scripts/payment-rehearsal.mjs https://your-app.up.railway.app
 */

const base = (process.argv[2] || process.env.APP_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');

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
  console.error('\nTo run a live Azam Pay rehearsal on production:');
  console.error('  1. Railway → Variables → set ALLOW_DEMO_LOGIN=true');
  console.error('  2. Set AZAMPAY_APP_NAME, AZAMPAY_CLIENT_ID, AZAMPAY_CLIENT_SECRET, AZAMPAY_ENVIRONMENT');
  console.error('  3. Redeploy, then re-run this script');
  console.error('  4. Approve the USSD push on the test handset');
  console.error('  5. Remove ALLOW_DEMO_LOGIN after the test');
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
  body: { bookingId: booking.id, phoneNumber: '0754123456', provider: 'Mpesa' },
});
if (checkout.status !== 200) {
  console.error('Payment initiate failed:', checkout.json.error?.message || checkout.status);
  process.exit(1);
}

const pay = checkout.json.data;
console.log('\n✓ Azam Pay checkout initiated');
console.log(`  paymentId: ${pay.paymentId}`);
console.log(`  mode: ${pay.mode}`);
console.log(`  mnoProvider: ${pay.mnoProvider}`);
console.log(`  amountTzs: ${pay.amountTzs}`);
console.log(`  azamPayEnvironment: ${pay.azamPayEnvironment}`);
console.log(`  message: ${pay.message}`);

if (pay.mode !== 'AZAM_PAY') {
  console.error('\n✗ Azam Pay is not configured on this server (mode PENDING_GATEWAY).');
  console.error('  Set AZAMPAY_APP_NAME, AZAMPAY_CLIENT_ID, AZAMPAY_CLIENT_SECRET on the host.');
  process.exit(1);
}

console.log('\n→ Approve the payment on the handset linked to 0754123456');
console.log('After paying, verify via GET /api/payments/by-booking/' + booking.id);
