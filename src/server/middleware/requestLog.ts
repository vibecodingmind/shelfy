import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

export function requestLogMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = String(req.headers['x-request-id'] || randomUUID());
  res.setHeader('x-request-id', requestId);
  (req as Request & { requestId?: string }).requestId = requestId;

  if (!req.path.startsWith('/api') || req.path === '/api/health') {
    return next();
  }

  const started = Date.now();
  res.on('finish', () => {
    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'request',
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Date.now() - started,
        requestId,
      })
    );
  });
  next();
}
