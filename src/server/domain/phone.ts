/** Normalize Tanzanian mobile numbers for PesaPal / SMS (+2557XXXXXXXX). */

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
