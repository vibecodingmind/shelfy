/**
 * Notification dispatcher. In-app is always written.
 * Email/SMS are attempted only when provider keys are present; failures never throw to callers.
 */

import { dbEngine } from '../db.js';
import { newId } from '../domain/ids.js';
import {
  deliveryPlan,
  notificationProviders,
  type DeliveryStep,
  type NotifyChannel,
  type NotifyType,
} from '../domain/notifications.js';
import { renderEmailHtml } from './emailTemplates.js';

export type { DeliveryStep, NotifyChannel, NotifyType } from '../domain/notifications.js';
export { deliveryPlan, notificationProviders } from '../domain/notifications.js';

function writeInApp(userId: string, title: string, message: string, type: NotifyType) {
  dbEngine.db.notifications.push({
    id: newId('notif'),
    userId,
    title,
    message,
    type,
    createdAt: new Date().toISOString(),
  });
}

function userPrefs(userId: string) {
  return dbEngine.db.notificationPreferences.find((p) => p.userId === userId);
}

async function sendResendEmail(
  to: string,
  title: string,
  message: string,
  env: NodeJS.ProcessEnv,
  html?: string
) {
  const from = env.EMAIL_FROM?.trim() || 'Shelfy <noreply@shelfy.co.tz>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY!.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject: title,
      text: message,
      html: html || renderEmailHtml({ title, message }),
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend ${res.status}`);
  }
}

async function sendSms(to: string, message: string, env: NodeJS.ProcessEnv, provider: 'africastalking' | 'twilio') {
  if (provider === 'africastalking') {
    const username = env.AFRICASTALKING_USERNAME?.trim();
    if (!username) throw new Error('AFRICASTALKING_USERNAME missing');
    const body = new URLSearchParams({ username, to, message });
    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        apiKey: env.AFRICASTALKING_API_KEY!.trim(),
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
    });
    if (!res.ok) throw new Error(`Africa's Talking ${res.status}`);
    return;
  }
  const sid = env.TWILIO_ACCOUNT_SID?.trim();
  const from = env.TWILIO_FROM?.trim();
  if (!sid || !from) throw new Error('TWILIO_ACCOUNT_SID or TWILIO_FROM missing');
  const auth = Buffer.from(`${sid}:${env.TWILIO_AUTH_TOKEN!.trim()}`).toString('base64');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: from, Body: message }),
  });
  if (!res.ok) throw new Error(`Twilio ${res.status}`);
}

export async function dispatchExternalChannels(input: {
  userId?: string;
  email?: string;
  phone?: string;
  title: string;
  message: string;
  env?: NodeJS.ProcessEnv;
  channels?: NotifyChannel[];
  html?: string;
}): Promise<DeliveryStep[]> {
  const env = input.env || process.env;
  const prefs = input.userId ? userPrefs(input.userId) : undefined;
  const allowed = input.channels ? new Set(input.channels) : null;
  const plan = deliveryPlan(env).filter((step) => !allowed || allowed.has(step.channel));

  for (const step of plan) {
    if (step.channel === 'IN_APP' || step.action === 'SKIP') continue;
    if (step.channel === 'EMAIL' && prefs && !prefs.emailEnabled) {
      step.action = 'SKIP';
      step.reason = 'user_pref_off';
      continue;
    }
    if (step.channel === 'SMS' && prefs && !prefs.smsEnabled) {
      step.action = 'SKIP';
      step.reason = 'user_pref_off';
      continue;
    }
    try {
      if (step.channel === 'EMAIL') {
        if (!input.email) {
          step.action = 'SKIP';
          step.reason = 'no_email';
          continue;
        }
        if (notificationProviders(env).email === 'resend') {
          await sendResendEmail(input.email, input.title, input.message, env, input.html);
        } else {
          step.action = 'SKIP';
          step.reason = 'smtp_not_wired';
        }
      }
      if (step.channel === 'SMS') {
        if (!input.phone) {
          step.action = 'SKIP';
          step.reason = 'no_phone';
          continue;
        }
        const smsProvider = notificationProviders(env).sms;
        if (smsProvider) await sendSms(input.phone, `${input.title}: ${input.message}`, env, smsProvider);
      }
    } catch (err) {
      console.warn(`Notification ${step.channel} failed:`, err instanceof Error ? err.message : err);
      step.action = 'SKIP';
      step.reason = 'provider_error';
    }
  }
  return plan;
}

export function notify(userId: string, title: string, message: string, type: NotifyType = 'INFO', html?: string) {
  writeInApp(userId, title, message, type);
  const user = dbEngine.db.users.find((row) => row.id === userId);
  void dispatchExternalChannels({
    userId,
    email: user?.email,
    phone: user?.phone,
    title,
    message,
    html,
  }).catch((err) => console.warn('Notification dispatch failed:', err instanceof Error ? err.message : err));
}
