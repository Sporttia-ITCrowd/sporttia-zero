/**
 * Test setup file for Vitest
 * Configures environment variables and global test utilities
 */

import { beforeAll, afterAll, vi } from 'vitest';

// Set up environment variables for tests
beforeAll(() => {
  // Local database (Sporttia ZERO)
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/sporttia_zero_test';

  // Sporttia API
  process.env.SPORTTIA_API_URL = 'https://preapi.sporttia.com/v7';

  // Sporttia MySQL Database (mocked in tests)
  process.env.SPORTTIA_DB_HOST = '127.0.0.1';
  process.env.SPORTTIA_DB_PORT = '3311';
  process.env.SPORTTIA_DB_USER = 'test';
  process.env.SPORTTIA_DB_PASSWORD = 'test';
  process.env.SPORTTIA_DB_NAME = 'sporttia_test';

  // OpenAI (mocked in tests)
  process.env.OPENAI_API_KEY = 'sk-test-key';
  process.env.OPENAI_MODEL = 'gpt-4o-mini';

  // Resend (mocked in tests)
  process.env.RESEND_API_KEY = 're-test-key';
  process.env.EMAIL_FROM = 'Test <test@sporttia.com>';

  // Server
  process.env.PORT = '3001';
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';
});

afterAll(() => {
  vi.restoreAllMocks();
});
