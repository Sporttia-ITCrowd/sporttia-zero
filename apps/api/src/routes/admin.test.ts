/**
 * Tests for Admin Routes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Hoist mock functions
const { mockLogin, MockSporttiaApiClientError } = vi.hoisted(() => {
  class MockError extends Error {
    statusCode: number;
    code: string;
    constructor(message: string, statusCode: number, code: string) {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
      this.name = 'SporttiaApiClientError';
    }
  }
  return {
    mockLogin: vi.fn(),
    MockSporttiaApiClientError: MockError,
  };
});

// Mock the sporttia-client module
vi.mock('../lib/sporttia-client', () => ({
  login: mockLogin,
  SporttiaApiClientError: MockSporttiaApiClientError,
}));

// Mock the database
vi.mock('../lib/db', () => ({
  db: null,
}));

// Mock repositories
vi.mock('../repositories/conversation.repository', () => ({
  conversationRepository: {
    list: vi.fn(),
    findById: vi.fn(),
  },
  messageRepository: {
    findByConversationId: vi.fn(),
  },
}));

// Import after mocking
import adminRouter from './admin';
import { clearAllSessions, getSession } from '../middleware/auth';

// Use the mocked error class
const SporttiaApiClientError = MockSporttiaApiClientError;

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/admin', adminRouter);
  return app;
};

describe('Admin Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
    clearAllSessions();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /admin/login', () => {
    it('should login successfully with valid credentials', async () => {
      mockLogin.mockResolvedValue({
        user: {
          id: 1,
          login: 'testuser',
          name: 'Test User',
          email: 'test@example.com',
          privilege: 'admin',
          role: 'ADMIN',
          lang: 'es',
          token: 'testuser::abc123hash',
        },
      });

      const response = await request(app)
        .post('/admin/login')
        .send({ login: 'testuser', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBe('testuser::abc123hash');
      expect(response.body.data.user.id).toBe(1);
      expect(response.body.data.user.email).toBe('test@example.com');

      // Verify session was stored
      const session = getSession('testuser::abc123hash');
      expect(session).toBeDefined();
      expect(session?.login).toBe('testuser');
    });

    it('should login with token from user object when top-level token is missing', async () => {
      mockLogin.mockResolvedValue({
        user: {
          id: 2,
          login: 'admin',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'ADMIN',
          lang: 'en',
          token: 'admin::xyz789hash',
        },
        // No top-level token
      });

      const response = await request(app)
        .post('/admin/login')
        .send({ login: 'admin', password: 'adminpass' });

      expect(response.status).toBe(200);
      expect(response.body.data.token).toBe('admin::xyz789hash');
    });

    it('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/admin/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject login with empty login', async () => {
      const response = await request(app)
        .post('/admin/login')
        .send({ login: '', password: 'password' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject login with invalid credentials (401 from Sporttia)', async () => {
      mockLogin.mockRejectedValue(
        new SporttiaApiClientError('Invalid credentials', 401, 'UNAUTHORIZED')
      );

      const response = await request(app)
        .post('/admin/login')
        .send({ login: 'baduser', password: 'wrongpass' });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('Invalid login or password');
    });

    it('should reject non-admin user', async () => {
      mockLogin.mockResolvedValue({
        user: {
          id: 3,
          login: 'regularuser',
          name: 'Regular User',
          email: 'regular@example.com',
          privilege: 'user',
          role: 'USER',
          lang: 'es',
          token: 'regular::token123',
        },
      });

      const response = await request(app)
        .post('/admin/login')
        .send({ login: 'regularuser', password: 'password' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toContain('Admin privileges required');
    });

    it('should handle Sporttia API error (503)', async () => {
      mockLogin.mockRejectedValue(
        new SporttiaApiClientError('Service unavailable', 503, 'SERVICE_UNAVAILABLE')
      );

      const response = await request(app)
        .post('/admin/login')
        .send({ login: 'testuser', password: 'password' });

      expect(response.status).toBe(503);
      expect(response.body.error.code).toBe('EXTERNAL_SERVICE_ERROR');
    });

    it('should handle missing user in response', async () => {
      mockLogin.mockResolvedValue({
        // No user object
      });

      const response = await request(app)
        .post('/admin/login')
        .send({ login: 'testuser', password: 'password' });

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('EXTERNAL_SERVICE_ERROR');
    });

    it('should handle missing token in response', async () => {
      mockLogin.mockResolvedValue({
        user: {
          id: 1,
          login: 'testuser',
          name: 'Test User',
          privilege: 'admin',
          // No token
        },
      });

      const response = await request(app)
        .post('/admin/login')
        .send({ login: 'testuser', password: 'password' });

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('EXTERNAL_SERVICE_ERROR');
    });

    it('should accept superadmin privilege', async () => {
      mockLogin.mockResolvedValue({
        user: {
          id: 1,
          login: 'super',
          name: 'Super Admin',
          email: 'super@example.com',
          privilege: 'superadmin',
          token: 'super::token',
        },
      });

      const response = await request(app)
        .post('/admin/login')
        .send({ login: 'super', password: 'password' });

      expect(response.status).toBe(200);
      expect(response.body.data.user.privilege).toBe('superadmin');
    });

    it('should handle privilege case-insensitively', async () => {
      mockLogin.mockResolvedValue({
        user: {
          id: 1,
          login: 'admin',
          name: 'Admin',
          email: 'admin@example.com',
          role: 'ADMIN', // uppercase
          token: 'admin::token',
        },
      });

      const response = await request(app)
        .post('/admin/login')
        .send({ login: 'admin', password: 'password' });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /admin/me', () => {
    it('should return user info for authenticated user', async () => {
      // First login to get a session
      mockLogin.mockResolvedValue({
        user: {
          id: 1,
          login: 'testuser',
          name: 'Test User',
          email: 'test@example.com',
          privilege: 'admin',
          token: 'testuser::sessiontoken',
        },
      });

      await request(app)
        .post('/admin/login')
        .send({ login: 'testuser', password: 'password' });

      // Now call /me with the token
      const response = await request(app)
        .get('/admin/me')
        .set('Authorization', 'Bearer testuser::sessiontoken');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(1);
      expect(response.body.data.user.name).toBe('Test User');
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .get('/admin/me');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /admin/logout', () => {
    it('should logout successfully', async () => {
      // First login
      mockLogin.mockResolvedValue({
        user: {
          id: 1,
          login: 'testuser',
          name: 'Test User',
          email: 'test@example.com',
          privilege: 'admin',
          token: 'testuser::logouttoken',
        },
      });

      await request(app)
        .post('/admin/login')
        .send({ login: 'testuser', password: 'password' });

      // Then logout
      const response = await request(app)
        .post('/admin/logout')
        .set('Authorization', 'Bearer testuser::logouttoken');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
