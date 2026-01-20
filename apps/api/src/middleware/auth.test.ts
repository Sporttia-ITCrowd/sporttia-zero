/**
 * Tests for Auth Middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response, NextFunction } from 'express';
import {
  requireAuth,
  requireAdmin,
  storeUserSession,
  removeUserSession,
  clearAllSessions,
  getSession,
  type AuthenticatedRequest,
} from './auth';

// Mock response object
const createMockResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
};

// Mock next function
const createMockNext = (): NextFunction => vi.fn();

// Create mock request with authorization header
const createMockRequest = (authHeader?: string): AuthenticatedRequest => {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
    path: '/test',
    method: 'GET',
  } as AuthenticatedRequest;
};

describe('Auth Middleware', () => {
  beforeEach(() => {
    clearAllSessions();
  });

  describe('Session Store', () => {
    it('should store user session', () => {
      const token = 'test::token123';
      const user = {
        id: 1,
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
        privilege: 'admin',
      };

      storeUserSession(token, user);

      const stored = getSession(token);
      expect(stored).toEqual(user);
    });

    it('should remove user session', () => {
      const token = 'test::token123';
      const user = {
        id: 1,
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
        privilege: 'admin',
      };

      storeUserSession(token, user);
      expect(getSession(token)).toBeDefined();

      removeUserSession(token);
      expect(getSession(token)).toBeUndefined();
    });

    it('should clear all sessions', () => {
      storeUserSession('token1', { id: 1, login: 'user1', name: 'User 1', email: '', privilege: 'admin' });
      storeUserSession('token2', { id: 2, login: 'user2', name: 'User 2', email: '', privilege: 'admin' });

      clearAllSessions();

      expect(getSession('token1')).toBeUndefined();
      expect(getSession('token2')).toBeUndefined();
    });
  });

  describe('requireAuth', () => {
    it('should reject request without authorization header', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid authorization header format', () => {
      const req = createMockRequest('Invalid token');
      const res = createMockResponse();
      const next = createMockNext();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with empty Bearer token', () => {
      const req = createMockRequest('Bearer ');
      const res = createMockResponse();
      const next = createMockNext();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    describe('Sporttia Token Format (username::hash)', () => {
      it('should authenticate with Sporttia token from session store', () => {
        const token = 'bau::abc123hash';
        const user = {
          id: 1,
          login: 'bau',
          name: 'Bau User',
          email: 'bau@example.com',
          privilege: 'admin',
        };
        storeUserSession(token, user);

        const req = createMockRequest(`Bearer ${token}`);
        const res = createMockResponse();
        const next = createMockNext();

        requireAuth(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
        expect(req.user?.id).toBe(1);
        expect(req.user?.login).toBe('bau');
        expect(req.user?.privilege).toBe('admin');
        expect(req.user?.token).toBe(token);
      });

      it('should create minimal user for Sporttia token not in session', () => {
        const token = 'newuser::xyz789hash';

        const req = createMockRequest(`Bearer ${token}`);
        const res = createMockResponse();
        const next = createMockNext();

        requireAuth(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
        expect(req.user?.id).toBe(0);
        expect(req.user?.login).toBe('newuser');
        expect(req.user?.privilege).toBe('admin');
      });
    });

    describe('JWT Token Format', () => {
      it('should authenticate with valid JWT token', () => {
        // Create a simple JWT payload: { id: 42, login: "jwtuser", name: "JWT User", email: "jwt@example.com", privilege: "admin" }
        const payload = { id: 42, login: 'jwtuser', name: 'JWT User', email: 'jwt@example.com', privilege: 'admin' };
        const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const token = `eyJhbGciOiJIUzI1NiJ9.${payloadBase64}.signature`;

        const req = createMockRequest(`Bearer ${token}`);
        const res = createMockResponse();
        const next = createMockNext();

        requireAuth(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
        expect(req.user?.id).toBe(42);
        expect(req.user?.login).toBe('jwtuser');
        expect(req.user?.name).toBe('JWT User');
        expect(req.user?.email).toBe('jwt@example.com');
        expect(req.user?.privilege).toBe('admin');
      });

      it('should handle JWT with sub instead of id', () => {
        const payload = { sub: 99, username: 'subuser', role: 'superadmin' };
        const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const token = `eyJhbGciOiJIUzI1NiJ9.${payloadBase64}.signature`;

        const req = createMockRequest(`Bearer ${token}`);
        const res = createMockResponse();
        const next = createMockNext();

        requireAuth(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user?.id).toBe(99);
        expect(req.user?.login).toBe('subuser');
        expect(req.user?.privilege).toBe('superadmin');
      });

      it('should reject JWT with missing user ID', () => {
        const payload = { login: 'noiduser', name: 'No ID' };
        const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const token = `eyJhbGciOiJIUzI1NiJ9.${payloadBase64}.signature`;

        const req = createMockRequest(`Bearer ${token}`);
        const res = createMockResponse();
        const next = createMockNext();

        requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
      });

      it('should reject JWT with only 2 parts', () => {
        const token = 'header.payload'; // Missing signature

        const req = createMockRequest(`Bearer ${token}`);
        const res = createMockResponse();
        const next = createMockNext();

        requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
      });
    });

    it('should reject unrecognized token format', () => {
      const token = 'randomtokenwithoutformat';

      const req = createMockRequest(`Bearer ${token}`);
      const res = createMockResponse();
      const next = createMockNext();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should reject request without user', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow admin privilege', () => {
      const req = createMockRequest();
      req.user = {
        id: 1,
        login: 'admin',
        name: 'Admin User',
        email: 'admin@example.com',
        privilege: 'admin',
        token: 'token',
      };
      const res = createMockResponse();
      const next = createMockNext();

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow superadmin privilege', () => {
      const req = createMockRequest();
      req.user = {
        id: 1,
        login: 'superadmin',
        name: 'Super Admin',
        email: 'super@example.com',
        privilege: 'superadmin',
        token: 'token',
      };
      const res = createMockResponse();
      const next = createMockNext();

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject user privilege', () => {
      const req = createMockRequest();
      req.user = {
        id: 1,
        login: 'regular',
        name: 'Regular User',
        email: 'user@example.com',
        privilege: 'user',
        token: 'token',
      };
      const res = createMockResponse();
      const next = createMockNext();

      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
