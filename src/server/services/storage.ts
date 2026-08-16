/**
 * Upload storage: local disk by default, optional S3-compatible PUT (SigV4).
 * Falls back to local if S3 is misconfigured or the PUT fails.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export type StorageDriver = 'local' | 's3';

export interface StorageStatus {
  driver: StorageDriver;
  bucket?: string;
  region?: string;
  endpoint?: string;
}

export interface StoredObject {
  url: string;
  driver: StorageDriver;
  objectKey: string;
  fallbackFromS3?: boolean;
}

export function uploadsDir(env: NodeJS.ProcessEnv = process.env): string {
  const root = env.DATA_DIR || env.RAILWAY_VOLUME_MOUNT_PATH || path.join(process.cwd(), 'data');
  return path.resolve(root, 'uploads');
}

export function s3Ready(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.S3_BUCKET?.trim() && env.S3_ACCESS_KEY?.trim() && env.S3_SECRET_KEY?.trim());
}

export function storageStatus(env: NodeJS.ProcessEnv = process.env): StorageStatus {
  if (!s3Ready(env)) return { driver: 'local' };
  return {
    driver: 's3',
    bucket: env.S3_BUCKET?.trim(),
    region: env.S3_REGION?.trim() || 'us-east-1',
    endpoint: env.S3_ENDPOINT?.trim() || undefined,
  };
}

export function localObjectUrl(filename: string): string {
  return `/uploads/${filename}`;
}

export function putLocalObject(bytes: Buffer, filename: string, env: NodeJS.ProcessEnv = process.env): StoredObject {
  const dir = uploadsDir(env);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), bytes);
  return { url: localObjectUrl(filename), driver: 'local', objectKey: filename };
}

function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256Hex(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function amzDate(now: Date): { amz: string; dateStamp: string } {
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { amz: iso, dateStamp: iso.slice(0, 8) };
}

function encodeS3Path(pathname: string): string {
  return pathname
    .split('/')
    .map((segment) => encodeURIComponent(segment).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`))
    .join('/');
}

export function buildS3PutRequest(input: {
  objectKey: string;
  body: Buffer;
  contentType: string;
  now?: Date;
  env?: NodeJS.ProcessEnv;
}): { url: string; headers: Record<string, string>; publicUrl: string } {
  const env = input.env || process.env;
  const bucket = env.S3_BUCKET!.trim();
  const accessKey = env.S3_ACCESS_KEY!.trim();
  const secretKey = env.S3_SECRET_KEY!.trim();
  const region = env.S3_REGION?.trim() || 'us-east-1';
  const endpoint = env.S3_ENDPOINT?.trim().replace(/\/$/, '');
  const { amz, dateStamp } = amzDate(input.now || new Date());
  const payloadHash = sha256Hex(input.body);
  const objectKey = input.objectKey.replace(/^\/+/, '');

  let host: string;
  let canonicalUri: string;
  let url: string;
  if (endpoint) {
    const endpointUrl = new URL(endpoint);
    host = endpointUrl.host;
    canonicalUri = encodeS3Path(`/${bucket}/${objectKey}`);
    url = `${endpointUrl.origin}${canonicalUri}`;
  } else {
    host = `${bucket}.s3.${region}.amazonaws.com`;
    canonicalUri = encodeS3Path(`/${objectKey}`);
    url = `https://${host}${canonicalUri}`;
  }

  const headersToSign: Record<string, string> = {
    host,
    'content-type': input.contentType,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amz,
  };
  const signedHeaderNames = Object.keys(headersToSign).sort();
  const canonicalHeaders = signedHeaderNames.map((name) => `${name}:${headersToSign[name]}\n`).join('');
  const signedHeaders = signedHeaderNames.join(';');
  const canonicalRequest = ['PUT', canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amz, credentialScope, sha256Hex(canonicalRequest)].join('\n');
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  const headers: Record<string, string> = {
    Host: host,
    'Content-Type': input.contentType,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amz,
    Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };

  const publicBase = env.S3_PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
  const publicUrl = publicBase ? `${publicBase}/${objectKey}` : url;
  return { url, headers, publicUrl };
}

export async function putS3Object(
  bytes: Buffer,
  objectKey: string,
  contentType: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<StoredObject> {
  const request = buildS3PutRequest({ objectKey, body: bytes, contentType, env });
  const res = await fetch(request.url, { method: 'PUT', headers: request.headers, body: bytes });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`S3 PUT failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  return { url: request.publicUrl, driver: 's3', objectKey };
}

export async function putUpload(input: {
  bytes: Buffer;
  filename: string;
  contentType: string;
  env?: NodeJS.ProcessEnv;
}): Promise<StoredObject> {
  const env = input.env || process.env;
  const objectKey = `uploads/${input.filename}`;
  if (s3Ready(env)) {
    try {
      return await putS3Object(input.bytes, objectKey, input.contentType, env);
    } catch (err) {
      console.warn('S3 upload failed; storing locally.', err instanceof Error ? err.message : err);
      return { ...putLocalObject(input.bytes, input.filename, env), fallbackFromS3: true };
    }
  }
  return putLocalObject(input.bytes, input.filename, env);
}
