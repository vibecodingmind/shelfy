/**
 * Shelfy 🇹🇿 — Authentication & RBAC Authorization Middleware
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { dbEngine } from './db.js';
import { User, UserRole } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'shelfy_tanzania_jwt_secret_key_2026';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

/**
 * Generate JWT token for user session
 */
export function generateToken(user: User): string {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verify JWT token and attach user to request
 */
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
    const user = dbEngine.db.users.find((u) => u.id === decoded.id && u.status === 'ACTIVE');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User account not found or suspended.' },
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Session expired or invalid token.' },
    });
  }
}

/**
 * Require specific user role(s) for server endpoint
 */
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

/**
 * Audit log helper
 */
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
  dbEngine.save();
}
