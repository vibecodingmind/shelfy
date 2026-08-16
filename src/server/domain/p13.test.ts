import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { deliveryPlan, notificationProviders } from './notifications.js';
import { buildS3PutRequest, putLocalObject, s3Ready, storageStatus } from '../services/storage.js';
import { createAuthToken, consumeAuthToken, rotateRefreshToken, revokeAuthTokens } from '../services/tokens.js';
import { jwtRuntimeStatus, opsHealthSnapshot } from './opsHealth.js';
import { DatabaseSchema } from '../seedData.js';

function tokenDb(): DatabaseSchema {
  return { authTokens: [] } as unknown as DatabaseSchema;
}

describe('storage driver', () => {
  it('uses local when S3 keys are missing', () => {
    const env = { DATA_DIR: '/tmp/shelfy-test' };
    expect(s3Ready(env)).toBe(false);
    expect(storageStatus(env).driver).toBe('local');
  });

  it('selects s3 when bucket and keys are set', () => {
    const env = {
      S3_BUCKET: 'shelfy-uploads',
      S3_ACCESS_KEY: 'AKIAEXAMPLE',
      S3_SECRET_KEY: 'secret',
      S3_REGION: 'af-south-1',
    };
    expect(s3Ready(env)).toBe(true);
    expect(storageStatus(env)).toMatchObject({ driver: 's3', bucket: 'shelfy-uploads', region: 'af-south-1' });
  });

  it('writes a local object under DATA_DIR/uploads', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shelfy-up-'));
    const stored = putLocalObject(Buffer.from('hello'), 'pic.jpg', { DATA_DIR: dir });
    expect(stored.driver).toBe('local');
    expect(stored.url).toBe('/uploads/pic.jpg');
    expect(fs.readFileSync(path.join(dir, 'uploads', 'pic.jpg'), 'utf8')).toBe('hello');
  });

  it('builds a SigV4 PUT with credential scope and hashed payload', () => {
    const now = new Date('2026-08-16T08:00:00.000Z');
    const request = buildS3PutRequest({
      objectKey: 'uploads/pic.jpg',
      body: Buffer.from('hello'),
      contentType: 'image/jpeg',
      now,
      env: {
        S3_BUCKET: 'shelfy-uploads',
        S3_ACCESS_KEY: 'AKIAEXAMPLE',
        S3_SECRET_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        S3_REGION: 'us-east-1',
        S3_PUBLIC_BASE_URL: 'https://cdn.shelfy.test',
      },
    });
    expect(request.publicUrl).toBe('https://cdn.shelfy.test/uploads/pic.jpg');
    expect(request.url).toContain('shelfy-uploads.s3.us-east-1.amazonaws.com');
    expect(request.headers.Authorization).toContain('AWS4-HMAC-SHA256 Credential=AKIAEXAMPLE/20260816/us-east-1/s3/aws4_request');
    expect(request.headers['x-amz-content-sha256']).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('notification delivery plan', () => {
  it('always sends in-app and skips email/sms without keys', () => {
    const plan = deliveryPlan({});
    expect(plan).toEqual([
      { channel: 'IN_APP', action: 'SEND' },
      { channel: 'EMAIL', action: 'SKIP', reason: 'email_not_configured' },
      { channel: 'SMS', action: 'SKIP', reason: 'sms_not_configured' },
    ]);
    expect(notificationProviders({}).email).toBeNull();
    expect(notificationProviders({}).sms).toBeNull();
  });

  it('plans email and sms when provider keys exist', () => {
    const plan = deliveryPlan({
      RESEND_API_KEY: 're_test',
      AFRICASTALKING_API_KEY: 'at_test',
    });
    expect(plan.find((s) => s.channel === 'EMAIL')).toEqual({ channel: 'EMAIL', action: 'SEND' });
    expect(plan.find((s) => s.channel === 'SMS')).toEqual({ channel: 'SMS', action: 'SEND' });
    expect(notificationProviders({ SMTP_URL: 'smtp://localhost' }).email).toBe('smtp');
    expect(notificationProviders({ TWILIO_AUTH_TOKEN: 'twilio' }).sms).toBe('twilio');
  });
});

describe('refresh tokens', () => {
  it('consumes a refresh token once and rotates to a new unused token', () => {
    const db = tokenDb();
    const first = createAuthToken(db, 'usr_1', 'REFRESH', 7 * 24 * 60 * 60 * 1000);
    const rotated = rotateRefreshToken(db, first.raw);
    expect(rotated?.userId).toBe('usr_1');
    expect(rotated?.raw).toBeTruthy();
    expect(rotated?.raw).not.toBe(first.raw);
    expect(consumeAuthToken(db, 'REFRESH', first.raw)).toBeNull();
    expect(consumeAuthToken(db, 'REFRESH', rotated!.raw)?.userId).toBe('usr_1');
  });

  it('rejects a reused or revoked refresh token', () => {
    const db = tokenDb();
    const issued = createAuthToken(db, 'usr_1', 'REFRESH', 7 * 24 * 60 * 60 * 1000);
    revokeAuthTokens(db, 'usr_1', 'REFRESH');
    expect(rotateRefreshToken(db, issued.raw)).toBeNull();
  });
});

describe('ops health snapshot', () => {
  it('marks JWT as ephemeral when JWT_SECRET is unset and never implies a hard fail', () => {
    const snap = opsHealthSnapshot({
      PESAPAL_CONSUMER_KEY: 'k',
      PESAPAL_CONSUMER_SECRET: 's',
      PESAPAL_ENVIRONMENT: 'sandbox',
    });
    expect(jwtRuntimeStatus({}).ephemeral).toBe(true);
    expect(snap.jwt.configured).toBe(false);
    expect(snap.jwt.ephemeral).toBe(true);
    expect(snap.pesapal).toEqual({ configured: true, environment: 'sandbox' });
    expect(snap.storage.driver).toBe('local');
    expect(snap.email.configured).toBe(false);
    expect(snap.sms.configured).toBe(false);
  });
});
