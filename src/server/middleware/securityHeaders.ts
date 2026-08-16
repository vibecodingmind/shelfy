import { Request, Response, NextFunction } from 'express';

export function corsOrigin(env: NodeJS.ProcessEnv = process.env): boolean | string {
  if (env.NODE_ENV !== 'production') return true;
  const app = env.APP_URL?.trim().replace(/\/$/, '');
  if (app) return app;
  const railway = env.RAILWAY_PUBLIC_DOMAIN?.trim() || env.RAILWAY_STATIC_URL?.trim();
  if (railway) return `https://${railway.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  return true;
}

export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: https: blob:; connect-src 'self' https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https:; font-src 'self' data:;"
    );
  }
  next();
}
