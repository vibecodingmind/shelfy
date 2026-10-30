import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn().mockResolvedValue({ messageId: 'mock-id' });
  const createTransport = vi.fn(() => ({ sendMail }));
  return { sendMail, createTransport };
});

vi.mock('nodemailer', () => ({
  default: { createTransport },
}));

import { dispatchExternalChannels } from './notify.js';
import {
  createSmtpTransport,
  defaultEmailFrom,
  defaultReplyTo,
  sendViaSmtp,
  smtpConfigured,
} from './smtp.js';

describe('smtp helpers', () => {
  beforeEach(() => {
    sendMail.mockClear();
    createTransport.mockClear();
  });

  it('detects SMTP from URL or host', () => {
    expect(smtpConfigured({})).toBe(false);
    expect(smtpConfigured({ SMTP_URL: 'smtp://127.0.0.1:587' })).toBe(true);
    expect(smtpConfigured({ SMTP_HOST: '127.0.0.1' })).toBe(true);
  });

  it('defaults from and reply-to for shelfy.co.tz', () => {
    expect(defaultEmailFrom({})).toBe('Shelfy <noreply@shelfy.co.tz>');
    expect(defaultReplyTo({})).toBe('hello@shelfy.co.tz');
    expect(defaultEmailFrom({ EMAIL_FROM: 'Custom <a@b.c>' })).toBe('Custom <a@b.c>');
  });

  it('builds transport from discrete SMTP_* vars', () => {
    createSmtpTransport({
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: '587',
      SMTP_USER: 'app',
      SMTP_PASS: 'secret',
      SMTP_SECURE: 'false',
    });
    expect(createTransport).toHaveBeenCalledWith({
      host: '127.0.0.1',
      port: 587,
      secure: false,
      auth: { user: 'app', pass: 'secret' },
    });
  });

  it('sends mail via nodemailer without live SMTP', async () => {
    await sendViaSmtp('user@example.com', 'Hi', 'Body', {
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: '25',
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Hi',
        text: 'Body',
        from: 'Shelfy <noreply@shelfy.co.tz>',
        replyTo: 'hello@shelfy.co.tz',
      })
    );
  });
});

describe('dispatchExternalChannels SMTP', () => {
  beforeEach(() => {
    sendMail.mockClear();
    createTransport.mockClear();
  });

  it('sends email when SMTP_HOST is configured', async () => {
    const plan = await dispatchExternalChannels({
      email: 'vendor@example.com',
      title: 'Verify',
      message: 'Click the link',
      env: { SMTP_HOST: '127.0.0.1', SMTP_PORT: '587' },
      channels: ['EMAIL'],
    });
    expect(plan.find((s) => s.channel === 'EMAIL')).toEqual({ channel: 'EMAIL', action: 'SEND' });
    expect(sendMail).toHaveBeenCalledOnce();
  });
});
