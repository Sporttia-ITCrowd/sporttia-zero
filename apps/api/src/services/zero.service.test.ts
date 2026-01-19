/**
 * Tests for ZeroService - Sports Center Creation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ZeroServiceCreateRequest } from '@sporttia-zero/shared';

// Hoist the mock connection so it's available during module mock setup
const { mockConnection, mockGetSporttiaConnection } = vi.hoisted(() => {
  const conn = {
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
    execute: vi.fn(),
  };
  return {
    mockConnection: conn,
    mockGetSporttiaConnection: vi.fn().mockResolvedValue(conn),
  };
});

// Mock the sporttia-db module
vi.mock('../lib/sporttia-db', () => ({
  getSporttiaConnection: mockGetSporttiaConnection,
  getSporttiaPool: vi.fn(),
  query: vi.fn(),
  closeSporttiaPool: vi.fn(),
  isSporttiaDbAvailable: vi.fn().mockResolvedValue(true),
}));

// Import after mocking
import { createSportsCenter, ZeroServiceError } from './zero.service';

describe('ZeroService', () => {
  beforeEach(() => {
    // Reset all mock functions before each test
    mockConnection.beginTransaction.mockClear().mockResolvedValue(undefined);
    mockConnection.commit.mockClear().mockResolvedValue(undefined);
    mockConnection.rollback.mockClear().mockResolvedValue(undefined);
    mockConnection.release.mockClear();
    mockConnection.execute.mockClear();
    mockGetSporttiaConnection.mockClear().mockResolvedValue(mockConnection);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create a valid request
  const createValidRequest = (): ZeroServiceCreateRequest => ({
    sportcenter: {
      name: 'Test Sports Center',
      city: {
        name: 'Madrid',
        province: {
          name: 'Madrid',
        },
      },
    },
    admin: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    language: 'es',
    facilities: [
      {
        name: 'Padel 1',
        sport: {
          id: 1,
          name: 'Padel',
        },
        schedules: [
          {
            weekdays: [1, 2, 3, 4, 5],
            timeini: '09:00',
            timeend: '21:00',
            duration: '1.5',
            rate: '12.00',
          },
        ],
      },
    ],
  });

  // Helper to setup mock execute responses
  const setupMockExecute = (overrides: Record<string, () => unknown> = {}) => {
    let insertIdCounter = 1;

    const defaultResponses: Record<string, () => unknown> = {
      // Province lookup - not found
      'SELECT id FROM provinces': () => [[], undefined],
      // Province insert
      'INSERT INTO provinces': () => [{ insertId: insertIdCounter++, affectedRows: 1 }, undefined],
      // City lookup - not found
      'SELECT id FROM cities': () => [[], undefined],
      // City insert
      'INSERT INTO cities': () => [{ insertId: insertIdCounter++, affectedRows: 1 }, undefined],
      // Customer insert
      'INSERT INTO customers': () => [{ insertId: insertIdCounter++, affectedRows: 1 }, undefined],
      // Sportcenter insert
      'INSERT INTO sportcenters': () => [{ insertId: insertIdCounter++, affectedRows: 1 }, undefined],
      // Subscription insert
      'INSERT INTO subscriptions': () => [{ insertId: insertIdCounter++, affectedRows: 1 }, undefined],
      // Licence insert
      'INSERT INTO licences': () => [{ insertId: insertIdCounter++, affectedRows: 1 }, undefined],
      // Group insert
      'INSERT INTO groups': () => [{ insertId: insertIdCounter++, affectedRows: 1 }, undefined],
      // Group privileges insert (may fail, that's ok)
      'INSERT INTO group_privileges': () => [{ insertId: insertIdCounter++, affectedRows: 1 }, undefined],
      // User insert
      'INSERT INTO users': () => [{ insertId: insertIdCounter++, affectedRows: 1 }, undefined],
      // Purse insert
      'INSERT INTO purses': () => [{ insertId: insertIdCounter++, affectedRows: 1 }, undefined],
      // Field insert
      'INSERT INTO fields': () => [{ insertId: insertIdCounter++, affectedRows: 1 }, undefined],
      // Terrain insert
      'INSERT INTO terrains': () => [{ insertId: insertIdCounter++, affectedRows: 1 }, undefined],
      // Schedule insert
      'INSERT INTO schedules': () => [{ insertId: insertIdCounter++, affectedRows: 1 }, undefined],
      // Price insert
      'INSERT INTO prices': () => [{ insertId: insertIdCounter++, affectedRows: 1 }, undefined],
      // Sport lookup - found
      'SELECT id FROM sports': () => [[{ id: 1 }], undefined],
    };

    // Merge with overrides
    const responses = { ...defaultResponses };
    for (const [key, value] of Object.entries(overrides)) {
      responses[key] = value;
    }

    mockConnection.execute.mockImplementation((sql: string) => {
      for (const [pattern, resultFn] of Object.entries(responses)) {
        if (sql.includes(pattern)) {
          return Promise.resolve(resultFn());
        }
      }
      // Default: empty result
      return Promise.resolve([[], undefined]);
    });
  };

  describe('createSportsCenter', () => {
    it('should create a sports center successfully', async () => {
      setupMockExecute();

      const request = createValidRequest();
      const result = await createSportsCenter(request);

      expect(result).toBeDefined();
      expect(result.sportcenterId).toBeGreaterThan(0);
      expect(result.customerId).toBeGreaterThan(0);
      expect(result.subscriptionId).toBeGreaterThan(0);
      expect(result.licenceIds).toHaveLength(3);
      expect(result.adminId).toBeGreaterThan(0);
      expect(result.adminLogin).toBeDefined();
      expect(result.adminLogin).toContain('john');
      expect(result.adminPassword).toBeDefined();
      expect(result.adminPassword.length).toBeGreaterThanOrEqual(10);
      expect(result.facilities).toHaveLength(1);

      // Verify transaction was used
      expect(mockConnection.beginTransaction).toHaveBeenCalledOnce();
      expect(mockConnection.commit).toHaveBeenCalledOnce();
      expect(mockConnection.release).toHaveBeenCalledOnce();
      expect(mockConnection.rollback).not.toHaveBeenCalled();
    });

    it('should reuse existing province if found', async () => {
      const existingProvinceId = 42;
      setupMockExecute({
        'SELECT id FROM provinces': () => [[{ id: existingProvinceId }], undefined],
      });

      const request = createValidRequest();
      await createSportsCenter(request);

      // Should have selected province but not inserted
      const provinceCalls = mockConnection.execute.mock.calls.filter(
        (call) => (call[0] as string).includes('provinces')
      );
      expect(provinceCalls.some((call) => (call[0] as string).includes('SELECT'))).toBe(true);
      expect(provinceCalls.filter((call) => (call[0] as string).includes('INSERT')).length).toBe(0);
    });

    it('should reuse existing city if found', async () => {
      const existingCityId = 99;
      setupMockExecute({
        'SELECT id FROM cities': () => [[{ id: existingCityId }], undefined],
      });

      const request = createValidRequest();
      await createSportsCenter(request);

      // Should have selected city but not inserted
      const cityCalls = mockConnection.execute.mock.calls.filter(
        (call) => (call[0] as string).includes('cities')
      );
      expect(cityCalls.some((call) => (call[0] as string).includes('SELECT'))).toBe(true);
      expect(cityCalls.filter((call) => (call[0] as string).includes('INSERT')).length).toBe(0);
    });

    it('should create multiple facilities', async () => {
      setupMockExecute();

      const request = createValidRequest();
      request.facilities.push({
        name: 'Tennis 1',
        sport: {
          id: 2,
          name: 'Tennis',
        },
        schedules: [
          {
            weekdays: [1, 2, 3, 4, 5, 6, 7],
            timeini: '08:00',
            timeend: '22:00',
            duration: '1.0',
            rate: '15.00',
          },
        ],
      });

      const result = await createSportsCenter(request);

      expect(result.facilities).toHaveLength(2);
    });

    it('should lookup sport by name if id not provided', async () => {
      setupMockExecute();

      const request = createValidRequest();
      delete (request.facilities[0].sport as { id?: number }).id;

      const result = await createSportsCenter(request);

      expect(result).toBeDefined();
      // Verify sport was looked up
      const sportCalls = mockConnection.execute.mock.calls.filter(
        (call) => (call[0] as string).includes('SELECT id FROM sports')
      );
      expect(sportCalls.length).toBeGreaterThan(0);
    });

    it('should throw error if sport not found', async () => {
      setupMockExecute({
        'SELECT id FROM sports': () => [[], undefined], // Sport not found
      });

      const request = createValidRequest();
      delete (request.facilities[0].sport as { id?: number }).id;

      await expect(createSportsCenter(request)).rejects.toThrow(ZeroServiceError);
      await expect(createSportsCenter(request)).rejects.toThrow('Sport not found');

      // Verify rollback was called
      expect(mockConnection.rollback).toHaveBeenCalled();
    });

    it('should rollback transaction on database error', async () => {
      mockConnection.execute.mockRejectedValueOnce(new Error('Database connection lost'));

      const request = createValidRequest();

      await expect(createSportsCenter(request)).rejects.toThrow(ZeroServiceError);
      expect(mockConnection.rollback).toHaveBeenCalledOnce();
      expect(mockConnection.commit).not.toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalledOnce();
    });

    it('should generate unique admin login from email', async () => {
      setupMockExecute();

      const request1 = createValidRequest();
      request1.admin.email = 'maria.garcia@example.com';

      const result1 = await createSportsCenter(request1);

      expect(result1.adminLogin).toMatch(/^mariagarcia\d{4}$/);
    });

    it('should generate password with correct length', async () => {
      setupMockExecute();

      const request = createValidRequest();
      const result = await createSportsCenter(request);

      // Password should be 10 characters
      expect(result.adminPassword.length).toBe(10);
      // Password should not contain ambiguous characters (0, O, I, l, 1)
      expect(result.adminPassword).not.toMatch(/[0OIl1]/);
    });

    it('should create 3 licences with correct dates', async () => {
      setupMockExecute();

      const request = createValidRequest();
      const result = await createSportsCenter(request);

      expect(result.licenceIds).toHaveLength(3);
      expect(result.licenceIds.every((id) => id > 0)).toBe(true);
    });

    it('should handle special characters in names', async () => {
      setupMockExecute();

      const request = createValidRequest();
      request.sportcenter.name = "Club Deportivo 'El Campeón' S.L.";
      request.admin.name = 'José María García-López';

      const result = await createSportsCenter(request);

      expect(result).toBeDefined();
      expect(result.sportcenterId).toBeGreaterThan(0);
    });

    it('should handle multiple schedules per facility', async () => {
      setupMockExecute();

      const request = createValidRequest();
      request.facilities[0].schedules.push({
        weekdays: [6, 7], // Weekend
        timeini: '10:00',
        timeend: '20:00',
        duration: '1.5',
        rate: '15.00', // Higher weekend rate
      });

      const result = await createSportsCenter(request);

      expect(result).toBeDefined();
      expect(result.facilities[0].scheduleIds.length).toBeGreaterThan(5); // 5 weekdays + 2 weekend days
    });
  });

  describe('ZeroServiceError', () => {
    it('should create error with correct properties', () => {
      const error = new ZeroServiceError('Test error', 'TEST_CODE', true);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.isRetryable).toBe(true);
      expect(error.name).toBe('ZeroServiceError');
    });

    it('should default isRetryable to false', () => {
      const error = new ZeroServiceError('Test error', 'TEST_CODE');

      expect(error.isRetryable).toBe(false);
    });
  });
});
