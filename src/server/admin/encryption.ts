import crypto from 'crypto';

const ALGO = 'aes-256-gcm';

function encryptionKey(env: NodeJS.ProcessEnv = process.env): Buffer | null {
  const raw = env.INTEGRATION_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  return crypto.createHash('sha256').update(raw).digest();
}

export function integrationEncryptionConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return encryptionKey(env) !== null;
}

export function encryptSecret(plaintext: string, env: NodeJS.ProcessEnv = process.env): { ciphertext: string; iv: string; tag: string } {
  const key = encryptionKey(env);
  if (!key) throw new Error('INTEGRATION_ENCRYPTION_KEY is not configured.');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: enc.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decryptSecret(ciphertext: string, iv: string, tag: string, env: NodeJS.ProcessEnv = process.env): string {
  const key = encryptionKey(env);
  if (!key) throw new Error('INTEGRATION_ENCRYPTION_KEY is not configured.');
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  const dec = Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]);
  return dec.toString('utf8');
}

export function maskSecret(value: string | undefined, visibleTail = 4): string {
  if (!value) return '';
  if (value.length <= visibleTail) return '****';
  return `****${value.slice(-visibleTail)}`;
}
