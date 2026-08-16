/**
 * Shelfy 🇹🇿 — Authentication & RBAC Authorization Middleware
 */

import 'dotenv/config';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { dbEngine } from './db.js';
import { User, UserRole } from '../types/index.js';
import { PENDING_ALLOWED_PATHS, isActiveForApi } from './domain/rbac.js';

function resolveJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET?.trim();
  if (fromEnv) return fromEnv;

  const railwayScoped = process.env.RAILWAY_ENVIRONMENT_ID
    ? `shelfy_${process.env.RAILWAY_ENVIRONMENT_ID}_jwt`
    : '';

  if (process.env.NODE_ENV === 'production') {
    console.warn(
      'JWT_SECRET is not set. Using a temporary secret so the app can boot. Set JWT_SECRET in Railway Variables to keep login sessions stable across deploys.'
    );
  }

  return railwayScoped || 'shelfy_dev_only_jwt_secret';
}

const JWT_SECRET = resolveJwtSecret();
export const ACCESS_TOKEN_TTL = '1h';
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication token required.' },
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: UserRole };
    const user = dbEngine.db.users.find((u) => u.id === decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User account not found or suspended.' },
      });
    }

    const allowPending = PENDING_ALLOWED_PATHS.some((path) => req.path.startsWith(path));
    if (!isActiveForApi(user, allowPending)) {
      return res.status(403).json({
        success: false,
        error: {
          code: user.status === 'PENDING' ? 'EMAIL_UNVERIFIED' : 'SUSPENDED',
          message:
            user.status === 'PENDING'
              ? 'Verify your email before using the marketplace.'
              : 'Your account has been suspended.',
        },
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Session expired or invalid token.' },
    });
  }
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as { id: string };
    const user = dbEngine.db.users.find((u) => u.id === decoded.id);
    if (user && isActiveForApi(user, true)) req.user = user;
  } catch {
    // public route — ignore bad tokens
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
    }

    if (!roles.includes(req.user.role) && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires one of roles: ${roles.join(', ')}`,
        },
      });
    }

    next();
  };
}

export function logAuditEvent(
  userId: string,
  userName: string,
  userRole: UserRole,
  action: string,
  resource: string,
  resourceId: string,
  details?: string
) {
  const log = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    userId,
    userName,
    userRole,
    action,
    resource,
    resourceId,
    details,
    timestamp: new Date().toISOString(),
  };
  dbEngine.db.auditLogs.unshift(log);
  void dbEngine.saveAsync();
}
