import nodemailer from 'nodemailer';

/** True when SMTP_URL or SMTP_HOST is set (VPS Postfix / generic relay). */
export function smtpConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.SMTP_URL?.trim() || env.SMTP_HOST?.trim());
}

export function defaultEmailFrom(env: NodeJS.ProcessEnv = process.env): string {
  return env.EMAIL_FROM?.trim() || 'Shelfy <hello@shelfy.co.tz>';
}

/** Default Reply-To so noreply sends still reach hello@shelfy.co.tz. */
export function defaultReplyTo(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const explicit = env.EMAIL_REPLY_TO?.trim();
  if (explicit) return explicit;
  return 'hello@shelfy.co.tz';
}

function smtpAllowInsecureTls(env: NodeJS.ProcessEnv, host: string): boolean {
  const flag = env.SMTP_TLS_INSECURE?.trim().toLowerCase();
  if (flag === 'true' || flag === '1') return true;
  if (flag === 'false' || flag === '0') return false;
  const h = host.toLowerCase();
  return h === '127.0.0.1' || h === 'localhost' || h === '::1';
}

export function createSmtpTransport(env: NodeJS.ProcessEnv) {
  const url = env.SMTP_URL?.trim();
  if (url) {
    return nodemailer.createTransport(url);
  }
  const host = env.SMTP_HOST!.trim();
  const port = Number(env.SMTP_PORT || 587);
  const secureExplicit = env.SMTP_SECURE?.trim().toLowerCase();
  const secure =
    secureExplicit === 'true' || secureExplicit === '1'
      ? true
      : secureExplicit === 'false' || secureExplicit === '0'
        ? false
        : port === 465;
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS?.trim();
  const auth = user ? { user, pass: pass ?? '' } : undefined;
  const tls = smtpAllowInsecureTls(env, host) ? { rejectUnauthorized: false } : undefined;
  return nodemailer.createTransport({
    host,
    port,
    secure,
    ...(auth ? { auth } : {}),
    ...(tls ? { tls } : {}),
  });
}

export async function sendViaSmtp(
  to: string,
  title: string,
  message: string,
  env: NodeJS.ProcessEnv,
  html?: string
) {
  const transporter = createSmtpTransport(env);
  await transporter.sendMail({
    from: defaultEmailFrom(env),
    replyTo: defaultReplyTo(env),
    to,
    subject: title,
    text: message,
    html: html ?? undefined,
  });
}
