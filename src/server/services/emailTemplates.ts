/**
 * Branded HTML email templates for Shelfy notifications.
 */

export interface EmailTemplateInput {
  title: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}

export function renderEmailHtml(input: EmailTemplateInput): string {
  const ctaBlock =
    input.ctaLabel && input.ctaUrl
      ? `<p style="margin:24px 0 0"><a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#10b981);color:#0f172a;font-weight:800;text-decoration:none;padding:12px 24px;border-radius:12px">${escapeHtml(input.ctaLabel)}</a></p>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:system-ui,-apple-system,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f172a;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden">
        <tr><td style="padding:24px 28px;background:linear-gradient(135deg,#f59e0b22,#10b98122);border-bottom:1px solid #334155">
          <div style="font-size:22px;font-weight:900;color:#fbbf24">🇹🇿 shelfy</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:4px">Retail shelf marketplace · Tanzania</div>
        </td></tr>
        <tr><td style="padding:28px">
          <h1 style="margin:0 0 12px;font-size:20px;color:#f8fafc">${escapeHtml(input.title)}</h1>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#cbd5e1">${escapeHtml(input.message).replace(/\n/g, '<br>')}</p>
          ${ctaBlock}
        </td></tr>
        <tr><td style="padding:16px 28px 24px;border-top:1px solid #334155">
          <p style="margin:0;font-size:11px;color:#64748b">${escapeHtml(input.footerNote || 'Shelfy · Dar es Salaam, Tanzania · shelfy.co.tz')}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function bookingCreatedEmail(input: {
  vendorName: string;
  shelfName: string;
  durationMonths: number;
  appUrl: string;
}): EmailTemplateInput {
  return {
    title: 'New booking request',
    message: `${input.vendorName} requested to book "${input.shelfName}" for ${input.durationMonths} month(s). Review and approve in your host dashboard.`,
    ctaLabel: 'Review booking',
    ctaUrl: `${input.appUrl}/?view=HOST`,
  };
}

export function bookingApprovedEmail(input: {
  shelfName: string;
  totalPriceTzs: number;
  appUrl: string;
}): EmailTemplateInput {
  return {
    title: 'Booking approved — complete payment',
    message: `Your booking for "${input.shelfName}" was approved. Total due: TZS ${input.totalPriceTzs.toLocaleString()}. Complete payment to secure your shelf.`,
    ctaLabel: 'Pay now',
    ctaUrl: `${input.appUrl}/?view=VENDOR`,
  };
}

export function bookingExpiringEmail(input: { shelfName: string; endDate: string; appUrl: string }): EmailTemplateInput {
  return {
    title: 'Rental expiring soon',
    message: `Your rental of "${input.shelfName}" ends on ${input.endDate}. Renew now to keep your shelf placement.`,
    ctaLabel: 'Renew booking',
    ctaUrl: `${input.appUrl}/?view=VENDOR`,
  };
}

export function savedSearchMatchEmail(input: {
  searchName: string;
  shelfName: string;
  city: string;
  priceTzs: number;
  appUrl: string;
  shelfId: string;
}): EmailTemplateInput {
  return {
    title: `New shelf match: ${input.searchName}`,
    message: `"${input.shelfName}" in ${input.city} is now available at TZS ${input.priceTzs.toLocaleString()}/month.`,
    ctaLabel: 'View shelf',
    ctaUrl: `${input.appUrl}/s/${input.shelfId}`,
  };
}
