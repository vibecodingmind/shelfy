/**
 * Official PesaPal API 3.0 client.
 * Docs: https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/api-reference
 *
 * Sandbox: https://cybqa.pesapal.com/pesapalv3
 * Live:    https://pay.pesapal.com/v3
 *
 * Status codes from GetTransactionStatus:
 *   0 INVALID · 1 COMPLETED · 2 FAILED · 3 REVERSED
 */

export const PESAPAL_STATUS = {
  INVALID: 0,
  COMPLETED: 1,
  FAILED: 2,
  REVERSED: 3,
} as const;

export type PesapalEnv = 'sandbox' | 'live';

export function pesapalBaseUrl(env: PesapalEnv = 'sandbox'): string {
  return env === 'live' ? 'https://pay.pesapal.com/v3' : 'https://cybqa.pesapal.com/pesapalv3';
}

export function pesapalConfigured(): boolean {
  return Boolean(process.env.PESAPAL_CONSUMER_KEY?.trim() && process.env.PESAPAL_CONSUMER_SECRET?.trim());
}

export function pesapalEnvironment(): PesapalEnv {
  const raw = (process.env.PESAPAL_ENVIRONMENT || 'sandbox').toLowerCase();
  return raw === 'live' ? 'live' : 'sandbox';
}

export interface PesapalTransactionStatus {
  status_code: number;
  payment_status_description?: string;
  amount?: number;
  currency?: string;
  merchant_reference?: string;
  order_tracking_id?: string;
  confirmation_code?: string;
  payment_method?: string;
  payment_account?: string;
  description?: string;
  message?: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;
let cachedIpnId: string | null = process.env.PESAPAL_IPN_ID || null;

async function pesapalFetch(path: string, init: RequestInit & { token?: string } = {}) {
  const url = `${pesapalBaseUrl(pesapalEnvironment())}${path}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  const res = await fetch(url, { ...init, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = json?.error?.message || json?.message || `PesaPal request failed (${res.status})`;
    throw new Error(message);
  }
  return json;
}

export async function requestPesapalToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }
  const json = await pesapalFetch('/api/Auth/RequestToken', {
    method: 'POST',
    body: JSON.stringify({
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
    }),
  });
  const token = json.token;
  if (!token) throw new Error('PesaPal did not return an access token.');
  cachedToken = { token, expiresAt: Date.now() + 4 * 60 * 1000 };
  return token;
}

export async function registerIpn(ipnUrl: string): Promise<string> {
  if (cachedIpnId) return cachedIpnId;
  const token = await requestPesapalToken();
  const json = await pesapalFetch('/api/URLSetup/RegisterIPN', {
    method: 'POST',
    token,
    body: JSON.stringify({ url: ipnUrl, ipn_notification_type: 'POST' }),
  });
  if (!json.ipn_id) throw new Error('PesaPal IPN registration did not return ipn_id.');
  cachedIpnId = json.ipn_id;
  return json.ipn_id;
}

export async function submitOrderRequest(input: {
  id: string;
  currency: string;
  amount: number;
  description: string;
  callbackUrl: string;
  notificationId: string;
  billingAddress: {
    email_address: string;
    phone_number?: string;
    first_name: string;
    last_name?: string;
  };
}): Promise<{ orderTrackingId: string; redirectUrl: string }> {
  const token = await requestPesapalToken();
  const json = await pesapalFetch('/api/Transactions/SubmitOrderRequest', {
    method: 'POST',
    token,
    body: JSON.stringify({
      id: input.id,
      currency: input.currency,
      amount: input.amount,
      description: input.description,
      callback_url: input.callbackUrl,
      notification_id: input.notificationId,
      billing_address: input.billingAddress,
    }),
  });
  const orderTrackingId = json.order_tracking_id;
  const redirectUrl = json.redirect_url;
  if (!orderTrackingId || !redirectUrl) {
    throw new Error('PesaPal SubmitOrderRequest did not return order_tracking_id/redirect_url.');
  }
  return { orderTrackingId, redirectUrl };
}

export async function getTransactionStatus(orderTrackingId: string): Promise<PesapalTransactionStatus> {
  const token = await requestPesapalToken();
  return pesapalFetch(`/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`, {
    method: 'GET',
    token,
  });
}

export function mapPesapalStatus(statusCode: number): 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' {
  if (statusCode === PESAPAL_STATUS.COMPLETED) return 'PAID';
  if (statusCode === PESAPAL_STATUS.FAILED || statusCode === PESAPAL_STATUS.INVALID) return 'FAILED';
  if (statusCode === PESAPAL_STATUS.REVERSED) return 'REFUNDED';
  return 'PENDING';
}

export function amountsMatch(expectedTzs: number, reported?: number): boolean {
  if (reported === undefined || reported === null || Number.isNaN(Number(reported))) return false;
  return Math.round(Number(reported)) === Math.round(expectedTzs);
}
