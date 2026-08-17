#!/usr/bin/env node
/**
 * Production smoke checks — read-only except optional registration test.
 * Usage: node scripts/prod-smoke.mjs [baseUrl]
 */

const base = (process.argv[2] || process.env.APP_URL || 'https://shelfy-production-d34d.up.railway.app').replace(/\/$/, '');

async function get(path) {
  const res = await fetch(`${base}${path}`);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function post(path, body) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

const failures = [];

function ok(name, cond, detail = '') {
  if (cond) {
    console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
    failures.push(name);
  }
}

console.log(`Smoke testing ${base}\n`);

const health = await get('/api/health');
ok('health 200', health.status === 200);
ok('jwt configured', health.json.jwt?.configured === true);
ok('jwt not ephemeral', health.json.jwt?.ephemeral === false);
ok('pesapal configured', health.json.pesapal?.configured === true);
ok('prisma driver', health.json.db?.driver === 'prisma');

const settings = await get('/api/settings');
ok('settings 200', settings.status === 200);
ok('pesapal env live', settings.json.data?.pesapalEnvironment === 'live', `got ${settings.json.data?.pesapalEnvironment}`);

const shelves = await get('/api/shelves');
ok('public shelves', shelves.status === 200 && Array.isArray(shelves.json.data) && shelves.json.data.length > 0);

if (shelves.json.data?.[0]?.id) {
  const avail = await get(`/api/shelves/${shelves.json.data[0].id}/availability`);
  const ranges = avail.json.data?.bookedRanges || [];
  ok('availability hides vendorName', ranges.every((r) => !('vendorName' in r)));
}

const demoLogin = await post('/api/auth/login', { email: 'vendor@shelfy.co.tz', password: 'Password123!' });
ok('demo login blocked in prod', demoLogin.status === 403);

const registerEmail = `smoke-${Date.now()}@shelfy.test`;
const reg = await post('/api/auth/register', {
  name: 'Smoke Vendor',
  email: registerEmail,
  password: 'Password123!',
  role: 'VENDOR',
});
ok('register 200', reg.status === 200);
if (reg.status === 200) {
  ok('auto-verify when email off', reg.json.data?.emailVerificationRequired === false);
  ok('user active', reg.json.data?.user?.status === 'ACTIVE');
}

const legalTerms = await get('/api/settings');
ok('settings expose categories', Array.isArray(legalTerms.json.data?.shelfCategories));
ok('autoApprove off', settings.json.data?.autoApproveBookings === false);

console.log('');
if (failures.length) {
  console.error(`FAILED: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('All smoke checks passed.');
