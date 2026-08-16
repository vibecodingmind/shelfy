import { Request, Response, NextFunction } from 'express';

export function corsOrigin(env: NodeJS.ProcessEnv = process.env): boolean | string {
  if (env.NODE_ENV !== 'production') return true;
  const app = env.APP_URL?.trim().replace(/\/$/, '');
  return app || true;
}

export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  next();
}
