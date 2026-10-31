export const PASSWORD_MIN_LENGTH = 10;

export function validatePassword(password: string): { ok: true } | { ok: false; message: string } {
  if (!password || typeof password !== 'string') {
    return { ok: false, message: 'Password is required.' };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` };
  }
  if (!/[a-z]/.test(password)) {
    return { ok: false, message: 'Password must include a lowercase letter.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, message: 'Password must include an uppercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, message: 'Password must include a number.' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { ok: false, message: 'Password must include a special character.' };
  }
  return { ok: true };
}

/** Platform admin mailbox (not auto-reset to the dev seed password). */
export const PLATFORM_ADMIN_EMAIL = 'hello@shelfy.co.tz';

/** Pre-seeded operator accounts kept on Password123! for staging demos. */
export const SEED_OPERATOR_EMAILS = [
  'vendor@shelfy.co.tz',
  'host@shelfy.co.tz',
  'agent@shelfy.co.tz',
] as const;
