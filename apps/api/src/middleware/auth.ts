import type { Request, Response, NextFunction } from 'express';
import { sendError, ErrorCodes } from '../lib/response';
import { createLogger } from '../lib/logger';

const logger = createLogger('auth-middleware');

// Simple in-memory session store for Sporttia tokens
// Maps token -> user info
interface SessionUser {
  id: number;
  login: string;
  name: string;
  email: string;
  privilege: string;
}

const tokenSessionStore = new Map<string, SessionUser>();

// Store user session after login
export function storeUserSession(token: string, user: SessionUser): void {
  tokenSessionStore.set(token, user);
  logger.debug({ login: user.login }, 'User session stored');
}

// Remove user session on logout
export function removeUserSession(token: string): void {
  tokenSessionStore.delete(token);
  logger.debug('User session removed');
}

// Clear all sessions (for testing)
export function clearAllSessions(): void {
  tokenSessionStore.clear();
}

// Get session (for testing)
export function getSession(token: string): SessionUser | undefined {
  return tokenSessionStore.get(token);
}

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

  // Sporttia uses custom token format: "username::hash" (not JWT)
  // We validate by checking the format and retrieving user from session store
  try {
    // Check if it's a Sporttia token format (username::hash)
    if (token.includes('::')) {
      const [login] = token.split('::');

      // Look up user from session store
      const sessionUser = tokenSessionStore.get(token);

      if (sessionUser) {
        req.user = {
          ...sessionUser,
          token,
        };
      } else {
        // Token not in session store - user needs to login again
        // For now, create minimal user from token
        req.user = {
          id: 0,
          login,
          name: login,
          email: '',
          privilege: 'admin', // Assume admin since they have a token
          token,
        };
      }
    } else if (token.includes('.')) {
      // JWT format - decode payload
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      let payloadStr: string;
      try {
        payloadStr = Buffer.from(parts[1], 'base64url').toString('utf-8');
      } catch {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        payloadStr = Buffer.from(base64, 'base64').toString('utf-8');
      }
      const payload = JSON.parse(payloadStr);

      const userId = payload.id || payload.sub || payload.userId;
      const userLogin = payload.login || payload.username || payload.email;

      if (!userId) {
        throw new Error('Invalid token payload: missing user ID');
      }

      req.user = {
        id: userId,
        login: userLogin || `user_${userId}`,
        name: payload.name || payload.username || userLogin || `User ${userId}`,
        email: payload.email || userLogin || '',
        privilege: payload.privilege || payload.role || 'user',
        token,
      };
    } else {
      throw new Error('Unrecognized token format');
    }

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
