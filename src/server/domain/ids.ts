import { randomBytes } from 'crypto';

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`;
}

export function newToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}
