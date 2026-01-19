/**
 * Mock for Sporttia MySQL database connection
 */

import { vi } from 'vitest';

// Mock connection object
export const mockConnection = {
  beginTransaction: vi.fn().mockResolvedValue(undefined),
  commit: vi.fn().mockResolvedValue(undefined),
  rollback: vi.fn().mockResolvedValue(undefined),
  release: vi.fn(),
  execute: vi.fn(),
};

// Mock pool object
export const mockPool = {
  execute: vi.fn(),
  getConnection: vi.fn().mockResolvedValue(mockConnection),
  end: vi.fn().mockResolvedValue(undefined),
};

// Reset all mocks
export function resetMocks() {
  mockConnection.beginTransaction.mockClear();
  mockConnection.commit.mockClear();
  mockConnection.rollback.mockClear();
  mockConnection.release.mockClear();
  mockConnection.execute.mockClear();
  mockPool.execute.mockClear();
  mockPool.getConnection.mockClear().mockResolvedValue(mockConnection);
  mockPool.end.mockClear();
}

// Helper to mock a successful INSERT result
export function mockInsertResult(insertId: number) {
  return [{ insertId, affectedRows: 1 }, undefined];
}

// Helper to mock a SELECT result
export function mockSelectResult(rows: unknown[]) {
  return [rows, undefined];
}

// Setup mock execute to return different results based on SQL
export function setupMockExecute(responses: Map<RegExp, unknown>) {
  mockConnection.execute.mockImplementation((sql: string) => {
    for (const [pattern, result] of responses) {
      if (pattern.test(sql)) {
        return Promise.resolve(result);
      }
    }
    // Default: empty result
    return Promise.resolve([[], undefined]);
  });
}
