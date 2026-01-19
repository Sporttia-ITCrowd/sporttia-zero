import type { Request, Response, NextFunction } from 'express';
import { sendError, ErrorCodes } from '../lib/response';
import { createLogger } from '../lib/logger';

const logger = createLogger('auth-middleware');

// Extended Request type with user info
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    login: string;
    name: string;
    email: string;
    privilege: string;
    token: string;
  };
}

/**
 * Middleware to verify admin authentication
 * Expects Authorization header with Bearer token
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn(
      { path: req.path, method: req.method },
      'Missing or invalid authorization header'
    );
    sendError(res, ErrorCodes.UNAUTHORIZED, 'Authentication required', 401);
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  if (!token) {
    logger.warn({ path: req.path }, 'Empty token in authorization header');
    sendError(res, ErrorCodes.UNAUTHORIZED, 'Invalid token', 401);
    return;
  }

  // For now, we'll validate the token by decoding the JWT-like structure
  // Sporttia tokens contain user info encoded in them
  // In a real scenario, we'd validate against Sporttia API or maintain a session store
  try {
    // The token from Sporttia is a JWT. We decode it to extract user info.
    // Note: In production, we should verify the signature with Sporttia's public key
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    // Decode the payload (second part)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));

    // Extract user info from the payload
    // Sporttia JWT typically contains user info in the payload
    if (!payload.id || !payload.login) {
      throw new Error('Invalid token payload');
    }

    req.user = {
      id: payload.id,
      login: payload.login,
      name: payload.name || payload.login,
      email: payload.email || payload.login,
      privilege: payload.privilege || 'user',
      token,
    };

    logger.debug(
      { userId: req.user.id, privilege: req.user.privilege, path: req.path },
      'Request authenticated'
    );

    next();
  } catch (error) {
    logger.warn(
      { path: req.path, error: error instanceof Error ? error.message : 'Unknown error' },
      'Token validation failed'
    );
    sendError(res, ErrorCodes.UNAUTHORIZED, 'Invalid or expired token', 401);
  }
}

/**
 * Middleware to require admin privilege
 * Must be used after requireAuth
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    sendError(res, ErrorCodes.UNAUTHORIZED, 'Authentication required', 401);
    return;
  }

  const adminPrivileges = ['superadmin', 'admin'];
  if (!adminPrivileges.includes(req.user.privilege)) {
    logger.warn(
      { userId: req.user.id, privilege: req.user.privilege, path: req.path },
      'Access denied - admin privilege required'
    );
    sendError(res, ErrorCodes.FORBIDDEN, 'Admin access required', 403);
    return;
  }

  next();
}
