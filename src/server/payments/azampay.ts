/**
 * Azam Pay Tanzania — MNO checkout (M-Pesa, Tigo, Airtel, Halopesa, AzamPesa).
 * Docs: https://developerdocs.azampay.co.tz
 */

export type AzamPayEnv = 'sandbox' | 'live';

export type AzamMnoProvider = 'Mpesa' | 'Tigo' | 'Airtel' | 'Halopesa' | 'Azampesa';

export function azamPayEnvironment(env: NodeJS.ProcessEnv = process.env): AzamPayEnv {
  const raw = (env.AZAMPAY_ENVIRONMENT || env.AZAMPAY_ENV || 'sandbox').toLowerCase();
  return raw === 'live' || raw === 'production' ? 'live' : 'sandbox';
}

export function azamPayAuthUrl(env: NodeJS.ProcessEnv = process.env): string {
  if (env.AZAMPAY_AUTH_URL?.trim()) return env.AZAMPAY_AUTH_URL.trim();
  return azamPayEnvironment(env) === 'live'
    ? 'https://authenticator.azampay.co.tz'
    : 'https://authenticator-sandbox.azampay.co.tz';
}

export function azamPayBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  if (env.AZAMPAY_BASE_URL?.trim()) return env.AZAMPAY_BASE_URL.trim();
  return azamPayEnvironment(env) === 'live' ? 'https://checkout.azampay.co.tz' : 'https://sandbox.azampay.co.tz';
}

export function azamPayConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(
    env.AZAMPAY_APP_NAME?.trim() &&
      env.AZAMPAY_CLIENT_ID?.trim() &&
      env.AZAMPAY_CLIENT_SECRET?.trim()
  );
}

export function amountsMatch(expectedTzs: number, reported?: number | string): boolean {
  if (reported === undefined || reported === null || reported === '') return false;
  const n = Number(reported);
  if (Number.isNaN(n)) return false;
  return Math.round(n) === Math.round(expectedTzs);
}

export function mapAzamPayCallbackStatus(payload: Record<string, unknown>): 'PENDING' | 'PAID' | 'FAILED' {
  const raw =
    payload.transactionstatus ??
    payload.transactionStatus ??
    (payload.success === true ? 'success' : payload.success === false ? 'failed' : '');
  const status = String(raw).toLowerCase();
  if (['success', 'successful', 'completed', 'paid'].includes(status)) return 'PAID';
  if (['failed', 'failure', 'cancelled', 'canceled', 'reversed'].includes(status)) return 'FAILED';
  return 'PENDING';
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function requestAzamPayToken(env: NodeJS.ProcessEnv = process.env): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }
  const res = await fetch(`${azamPayAuthUrl(env)}/AppRegistration/GenerateToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appName: env.AZAMPAY_APP_NAME,
      clientId: env.AZAMPAY_CLIENT_ID,
      clientSecret: env.AZAMPAY_CLIENT_SECRET,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok) {
    const message = json?.message || json?.title || `Azam Pay auth failed (${res.status})`;
    throw new Error(message);
  }
  const token = json.data?.accessToken || json.accessToken;
  if (!token) throw new Error('Azam Pay did not return an access token.');
  cachedToken = { token, expiresAt: Date.now() + 50 * 60 * 1000 };
  return token;
}

export interface MnoCheckoutInput {
  accountNumber: string;
  amountTzs: number;
  externalId: string;
  provider: AzamMnoProvider;
  additionalProperties?: Record<string, unknown>;
}

export interface MnoCheckoutResult {
  transactionId: string;
  success: boolean;
  message?: string;
  raw: unknown;
}

export async function initiateMnoCheckout(input: MnoCheckoutInput, env: NodeJS.ProcessEnv = process.env): Promise<MnoCheckoutResult> {
  const token = await requestAzamPayToken(env);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  const apiKey = env.AZAMPAY_API_KEY?.trim();
  if (apiKey) headers['X-API-KEY'] = apiKey;

  const res = await fetch(`${azamPayBaseUrl(env)}/azampay/mno/checkout`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      accountNumber: input.accountNumber,
      amount: String(Math.round(input.amountTzs)),
      currency: 'TZS',
      externalId: input.externalId,
      provider: input.provider,
      additionalProperties: input.additionalProperties ?? null,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok) {
    const message = json?.message || json?.title || json?.msg || `Azam Pay checkout failed (${res.status})`;
    throw new Error(message);
  }
  const transactionId =
    json.transactionId ||
    json.data?.transactionId ||
    json.pgReferenceId ||
    json.referenceId ||
    input.externalId;
  const success = json.success !== false && res.ok;
  return {
    transactionId: String(transactionId),
    success,
    message: json.message || json.msg,
    raw: json,
  };
}

export function verifyAzamPayCallbackAuth(body: Record<string, unknown>, env: NodeJS.ProcessEnv = process.env): boolean {
  const expected = env.AZAMPAY_CALLBACK_PASSWORD?.trim();
  if (!expected) return true;
  const provided = String(body.password ?? body.callbackPassword ?? '');
  return provided === expected;
}
