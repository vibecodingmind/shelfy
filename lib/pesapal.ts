/**
 * PesaPal v3 API Integration
 * Docs: https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/api-reference
 */

const PESAPAL_API = process.env.PESAPAL_API_URL!
const CONSUMER_KEY    = process.env.PESAPAL_CONSUMER_KEY!
const CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET!

// ── Get OAuth Token ─────────────────────────────────────────────────────────

export async function getPesapalToken(): Promise<string> {
  const res = await fetch(`${PESAPAL_API}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ consumer_key: CONSUMER_KEY, consumer_secret: CONSUMER_SECRET }),
  })
  const data = await res.json()
  if (!data.token) throw new Error(`PesaPal auth failed: ${JSON.stringify(data)}`)
  return data.token
}

// ── Register IPN URL ────────────────────────────────────────────────────────

export async function registerIPN(token: string): Promise<string> {
  const ipnUrl = process.env.PESAPAL_IPN_URL!
  const res = await fetch(`${PESAPAL_API}/api/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url: ipnUrl, ipn_notification_type: 'GET' }),
  })
  const data = await res.json()
  if (!data.ipn_id) throw new Error(`IPN registration failed: ${JSON.stringify(data)}`)
  return data.ipn_id
}

// ── Submit Order ─────────────────────────────────────────────────────────────

export interface PesapalOrderInput {
  bookingId: string
  amount: number
  currency?: string
  description: string
  callbackUrl: string
  customerEmail: string
  customerPhone: string
  customerName: string
  ipnId: string
}

export async function submitPesapalOrder(input: PesapalOrderInput) {
  const token = await getPesapalToken()

  const body = {
    id: input.bookingId,
    currency: input.currency ?? 'TZS',
    amount: input.amount,
    description: input.description,
    callback_url: input.callbackUrl,
    redirect_mode: '',
    notification_id: input.ipnId,
    billing_address: {
      email_address: input.customerEmail,
      phone_number:  input.customerPhone,
      first_name:    input.customerName.split(' ')[0],
      last_name:     input.customerName.split(' ').slice(1).join(' ') || '',
    },
  }

  const res = await fetch(`${PESAPAL_API}/api/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!data.redirect_url) throw new Error(`Order submit failed: ${JSON.stringify(data)}`)

  return {
    redirectUrl: data.redirect_url as string,
    orderTrackingId: data.order_tracking_id as string,
    merchantReference: data.merchant_reference as string,
  }
}

// ── Check Transaction Status ─────────────────────────────────────────────────

export async function getPesapalStatus(orderTrackingId: string) {
  const token = await getPesapalToken()
  const res = await fetch(
    `${PESAPAL_API}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  )
  return res.json()
}

// ── Format TZS ───────────────────────────────────────────────────────────────

export function formatTZS(amount: number): string {
  return `TZS ${amount.toLocaleString('en-TZ')}`
}

export function calcPlatformFee(amount: number): number {
  const pct = parseFloat(process.env.PLATFORM_FEE_PERCENT ?? '10') / 100
  return Math.round(amount * pct)
}

export function calcHostPayout(amount: number): number {
  return amount - calcPlatformFee(amount)
}
