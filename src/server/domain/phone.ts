/** Normalize Tanzanian mobile numbers for Azam Pay / SMS (+2557XXXXXXXX). */

export function normalizeTzPhone(input?: string | null): string | null {
  if (!input || typeof input !== 'string') return null;
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('255')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length !== 9) return null;
  if (!/^[67]\d{8}$/.test(digits)) return null;
  return `+255${digits}`;
}

export function formatTzPhoneDisplay(normalized: string): string {
  const digits = normalized.replace(/\D/g, '').slice(-9);
  return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

/** MSISDN without plus for Azam Pay (2557XXXXXXXX). */
export function toAzamMsisdn(normalizedPlus255: string): string {
  return normalizedPlus255.replace(/\D/g, '');
}

export type AzamMnoProviderGuess = 'Mpesa' | 'Tigo' | 'Airtel' | 'Halopesa' | 'Azampesa';

/** Best-effort MNO from Tanzania mobile prefix (user can override in UI). */
export function guessMnoProvider(normalizedPlus255: string): AzamMnoProviderGuess {
  const digits = normalizedPlus255.replace(/\D/g, '').slice(-9);
  const prefix = digits.slice(0, 2);
  if (['74', '75', '76', '79'].includes(prefix)) return 'Mpesa';
  if (['71', '65', '67'].includes(prefix)) return 'Tigo';
  if (['68', '78', '69'].includes(prefix)) return 'Airtel';
  if (prefix === '62') return 'Halopesa';
  return 'Mpesa';
}
