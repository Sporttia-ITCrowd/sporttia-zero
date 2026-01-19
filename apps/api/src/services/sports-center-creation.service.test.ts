/**
 * Tests for Sports Center Creation Service
 * Tests the orchestration layer that transforms collected data and calls ZeroService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CollectedData } from '../lib/db-types';

// Mock dependencies
vi.mock('../lib/sporttia-client', () => ({
  createSportsCenterViaZeroService: vi.fn(),
  SporttiaApiClientError: class SporttiaApiClientError extends Error {
    constructor(
      message: string,
      public statusCode: number,
      public code: string,
      public details?: unknown
    ) {
      super(message);
      this.name = 'SporttiaApiClientError';
    }
  },
}));

vi.mock('../repositories/conversation.repository', () => ({
  conversationRepository: {
    findById: vi.fn(),
    update: vi.fn(),
    getConfigurationReadiness: vi.fn(),
  },
}));

vi.mock('../repositories/sports-center.repository', () => ({
  sportsCenterRepository: {
    findByConversationId: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('./email.service', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'msg-123' }),
}));

// Import after mocking
import {
  createSportsCenterFromConversation,
  isReadyForCreation,
  SportsCenterCreationError,
} from './sports-center-creation.service';
import { createSportsCenterViaZeroService, SporttiaApiClientError } from '../lib/sporttia-client';
import { conversationRepository } from '../repositories/conversation.repository';
import { sportsCenterRepository } from '../repositories/sports-center.repository';
import { sendWelcomeEmail } from './email.service';

describe('Sports Center Creation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create valid collected data
  const createValidCollectedData = (): CollectedData => ({
    sportsCenterName: 'Test Sports Center',
    city: 'Madrid',
    language: 'es',
    adminName: 'John Doe',
    adminEmail: 'john@example.com',
    facilities: [
      {
        name: 'Padel 1',
        sportId: 1,
        sportName: 'Padel',
        schedules: [
          {
            weekdays: [1, 2, 3, 4, 5],
            startTime: '09:00',
            endTime: '21:00',
            duration: 90,
            rate: 12,
          },
        ],
      },
    ],
    confirmed: true,
  });

  // Helper to create a mock conversation
  const createMockConversation = (overrides: Partial<{
    id: string;
    status: string;
    collected_data: CollectedData | null;
  }> = {}) => ({
    id: 'conv-123',
    session_id: 'session-456',
    language: 'es',
    status: 'active',
    sports_center_id: null,
    collected_data: createValidCollectedData(),
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  });

  describe('createSportsCenterFromConversation', () => {
    it('should create sports center successfully', async () => {
      const conversation = createMockConversation();
      vi.mocked(conversationRepository.findById).mockResolvedValue(conversation);
      vi.mocked(sportsCenterRepository.findByConversationId).mockResolvedValue(null);
      vi.mocked(createSportsCenterViaZeroService).mockResolvedValue({
        sportcenterId: 100,
        customerId: 200,
        subscriptionId: 300,
        licenceIds: [1, 2, 3],
        adminId: 400,
        adminLogin: 'john1234',
        adminPassword: 'SecurePass1',
        facilities: [{ fieldId: 1, terrainId: 1, scheduleIds: [1], priceIds: [1] }],
      });
      vi.mocked(sportsCenterRepository.create).mockResolvedValue({
        id: 'sc-789',
        conversation_id: 'conv-123',
        sporttia_id: 100,
        name: 'Test Sports Center',
        city: 'Madrid',
        language: 'es',
        admin_email: 'john@example.com',
        admin_name: 'John Doe',
        facilities_count: 1,
        created_at: new Date(),
        updated_at: new Date(),
      });
      vi.mocked(conversationRepository.update).mockResolvedValue(undefined);

      const result = await createSportsCenterFromConversation('conv-123');

      expect(result.success).toBe(true);
      expect(result.sportsCenter).toBeDefined();
      expect(result.sportsCenter?.sporttiaId).toBe(100);
      expect(result.sportsCenter?.adminLogin).toBe('john1234');
      expect(result.sportsCenter?.adminPassword).toBe('SecurePass1');

      // Verify ZeroService was called with correct data
      expect(createSportsCenterViaZeroService).toHaveBeenCalledWith(
        expect.objectContaining({
          sportcenter: expect.objectContaining({
            name: 'Test Sports Center',
          }),
          admin: expect.objectContaining({
            email: 'john@example.com',
          }),
          language: 'es',
        })
      );

      // Verify email was sent
      expect(sendWelcomeEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          sportsCenterName: 'Test Sports Center',
          adminEmail: 'john@example.com',
          adminLogin: 'john1234',
          adminPassword: 'SecurePass1',
        })
      );
    });

    it('should return existing sports center if already created', async () => {
      const conversation = createMockConversation();
      vi.mocked(conversationRepository.findById).mockResolvedValue(conversation);
      vi.mocked(sportsCenterRepository.findByConversationId).mockResolvedValue({
        id: 'existing-sc',
        conversation_id: 'conv-123',
        sporttia_id: 50,
        name: 'Existing Center',
        city: 'Barcelona',
        language: 'es',
        admin_email: 'existing@example.com',
        admin_name: 'Existing Admin',
        facilities_count: 2,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await createSportsCenterFromConversation('conv-123');

      expect(result.success).toBe(true);
      expect(result.sportsCenter?.id).toBe('existing-sc');
      expect(result.sportsCenter?.sporttiaId).toBe(50);

      // ZeroService should NOT have been called
      expect(createSportsCenterViaZeroService).not.toHaveBeenCalled();
    });

    it('should return error if conversation not found', async () => {
      vi.mocked(conversationRepository.findById).mockResolvedValue(null);

      const result = await createSportsCenterFromConversation('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONVERSATION_NOT_FOUND');
      expect(result.error?.isRetryable).toBe(false);
    });

    it('should return error if no collected data', async () => {
      const conversation = createMockConversation({ collected_data: null });
      vi.mocked(conversationRepository.findById).mockResolvedValue(conversation);
      vi.mocked(sportsCenterRepository.findByConversationId).mockResolvedValue(null);

      const result = await createSportsCenterFromConversation('conv-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_DATA');
    });

    it('should return error if not confirmed', async () => {
      const collectedData = createValidCollectedData();
      collectedData.confirmed = false;
      const conversation = createMockConversation({ collected_data: collectedData });
      vi.mocked(conversationRepository.findById).mockResolvedValue(conversation);
      vi.mocked(sportsCenterRepository.findByConversationId).mockResolvedValue(null);

      const result = await createSportsCenterFromConversation('conv-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_CONFIRMED');
    });

    it('should return error if missing required fields', async () => {
      const collectedData = createValidCollectedData();
      delete collectedData.sportsCenterName;
      const conversation = createMockConversation({ collected_data: collectedData });
      vi.mocked(conversationRepository.findById).mockResolvedValue(conversation);
      vi.mocked(sportsCenterRepository.findByConversationId).mockResolvedValue(null);

      const result = await createSportsCenterFromConversation('conv-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INCOMPLETE_DATA');
    });

    it('should return error if no facilities', async () => {
      const collectedData = createValidCollectedData();
      collectedData.facilities = [];
      const conversation = createMockConversation({ collected_data: collectedData });
      vi.mocked(conversationRepository.findById).mockResolvedValue(conversation);
      vi.mocked(sportsCenterRepository.findByConversationId).mockResolvedValue(null);

      const result = await createSportsCenterFromConversation('conv-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_FACILITIES');
    });

    it('should handle ZeroService API errors', async () => {
      const conversation = createMockConversation();
      vi.mocked(conversationRepository.findById).mockResolvedValue(conversation);
      vi.mocked(sportsCenterRepository.findByConversationId).mockResolvedValue(null);
      vi.mocked(createSportsCenterViaZeroService).mockRejectedValue(
        new SporttiaApiClientError('Database error', 500, 'DB_ERROR')
      );

      const result = await createSportsCenterFromConversation('conv-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DB_ERROR');
      expect(result.error?.isRetryable).toBe(true); // 500 errors are retryable
    });

    it('should handle timeout errors as retryable', async () => {
      const conversation = createMockConversation();
      vi.mocked(conversationRepository.findById).mockResolvedValue(conversation);
      vi.mocked(sportsCenterRepository.findByConversationId).mockResolvedValue(null);
      vi.mocked(createSportsCenterViaZeroService).mockRejectedValue(
        new SporttiaApiClientError('Request timeout', 408, 'TIMEOUT')
      );

      const result = await createSportsCenterFromConversation('conv-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TIMEOUT');
      expect(result.error?.isRetryable).toBe(true);
    });

    it('should handle network errors as retryable', async () => {
      const conversation = createMockConversation();
      vi.mocked(conversationRepository.findById).mockResolvedValue(conversation);
      vi.mocked(sportsCenterRepository.findByConversationId).mockResolvedValue(null);
      vi.mocked(createSportsCenterViaZeroService).mockRejectedValue(
        new SporttiaApiClientError('Network error', 0, 'NETWORK_ERROR')
      );

      const result = await createSportsCenterFromConversation('conv-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NETWORK_ERROR');
      expect(result.error?.isRetryable).toBe(true);
    });

    it('should extract province from city format "City, Province"', async () => {
      const collectedData = createValidCollectedData();
      collectedData.city = 'Valencia, Comunidad Valenciana';
      const conversation = createMockConversation({ collected_data: collectedData });
      vi.mocked(conversationRepository.findById).mockResolvedValue(conversation);
      vi.mocked(sportsCenterRepository.findByConversationId).mockResolvedValue(null);
      vi.mocked(createSportsCenterViaZeroService).mockResolvedValue({
        sportcenterId: 100,
        customerId: 200,
        subscriptionId: 300,
        licenceIds: [1, 2, 3],
        adminId: 400,
        adminLogin: 'john1234',
        adminPassword: 'SecurePass1',
        facilities: [{ fieldId: 1, terrainId: 1, scheduleIds: [1], priceIds: [1] }],
      });
      vi.mocked(sportsCenterRepository.create).mockResolvedValue({
        id: 'sc-789',
        conversation_id: 'conv-123',
        sporttia_id: 100,
        name: 'Test Sports Center',
        city: 'Valencia',
        language: 'es',
        admin_email: 'john@example.com',
        admin_name: 'John Doe',
        facilities_count: 1,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await createSportsCenterFromConversation('conv-123');

      expect(createSportsCenterViaZeroService).toHaveBeenCalledWith(
        expect.objectContaining({
          sportcenter: expect.objectContaining({
            city: expect.objectContaining({
              name: 'Valencia',
              province: expect.objectContaining({
                name: 'Comunidad Valenciana',
              }),
            }),
          }),
        })
      );
    });

    it('should transform duration from minutes to hours', async () => {
      const collectedData = createValidCollectedData();
      collectedData.facilities![0].schedules[0].duration = 90; // 90 minutes
      const conversation = createMockConversation({ collected_data: collectedData });
      vi.mocked(conversationRepository.findById).mockResolvedValue(conversation);
      vi.mocked(sportsCenterRepository.findByConversationId).mockResolvedValue(null);
      vi.mocked(createSportsCenterViaZeroService).mockResolvedValue({
        sportcenterId: 100,
        customerId: 200,
        subscriptionId: 300,
        licenceIds: [1, 2, 3],
        adminId: 400,
        adminLogin: 'john1234',
        adminPassword: 'SecurePass1',
        facilities: [{ fieldId: 1, terrainId: 1, scheduleIds: [1], priceIds: [1] }],
      });
      vi.mocked(sportsCenterRepository.create).mockResolvedValue({
        id: 'sc-789',
        conversation_id: 'conv-123',
        sporttia_id: 100,
        name: 'Test Sports Center',
        city: 'Madrid',
        language: 'es',
        admin_email: 'john@example.com',
        admin_name: 'John Doe',
        facilities_count: 1,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await createSportsCenterFromConversation('conv-123');

      expect(createSportsCenterViaZeroService).toHaveBeenCalledWith(
        expect.objectContaining({
          facilities: expect.arrayContaining([
            expect.objectContaining({
              schedules: expect.arrayContaining([
                expect.objectContaining({
                  duration: '1.50', // 90 minutes = 1.5 hours
                }),
              ]),
            }),
          ]),
        })
      );
    });

    it('should continue if email sending fails', async () => {
      const conversation = createMockConversation();
      vi.mocked(conversationRepository.findById).mockResolvedValue(conversation);
      vi.mocked(sportsCenterRepository.findByConversationId).mockResolvedValue(null);
      vi.mocked(createSportsCenterViaZeroService).mockResolvedValue({
        sportcenterId: 100,
        customerId: 200,
        subscriptionId: 300,
        licenceIds: [1, 2, 3],
        adminId: 400,
        adminLogin: 'john1234',
        adminPassword: 'SecurePass1',
        facilities: [{ fieldId: 1, terrainId: 1, scheduleIds: [1], priceIds: [1] }],
      });
      vi.mocked(sportsCenterRepository.create).mockResolvedValue({
        id: 'sc-789',
        conversation_id: 'conv-123',
        sporttia_id: 100,
        name: 'Test Sports Center',
        city: 'Madrid',
        language: 'es',
        admin_email: 'john@example.com',
        admin_name: 'John Doe',
        facilities_count: 1,
        created_at: new Date(),
        updated_at: new Date(),
      });
      vi.mocked(sendWelcomeEmail).mockResolvedValue({ success: false, error: 'Email failed' });

      const result = await createSportsCenterFromConversation('conv-123');

      // Should still succeed even if email fails
      expect(result.success).toBe(true);
      expect(result.sportsCenter).toBeDefined();
    });
  });

  describe('isReadyForCreation', () => {
    it('should return ready when all conditions met', async () => {
      vi.mocked(conversationRepository.getConfigurationReadiness).mockResolvedValue({
        isReady: true,
        missing: [],
        collected: {
          hasSportsCenterName: true,
          hasCity: true,
          hasAdminName: true,
          hasAdminEmail: true,
          facilitiesCount: 1,
          isConfirmed: true,
        },
      });
      vi.mocked(sportsCenterRepository.findByConversationId).mockResolvedValue(null);

      const result = await isReadyForCreation('conv-123');

      expect(result.ready).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return not ready if conversation not found', async () => {
      vi.mocked(conversationRepository.getConfigurationReadiness).mockResolvedValue(null);

      const result = await isReadyForCreation('nonexistent');

      expect(result.ready).toBe(false);
      expect(result.reason).toBe('Conversation not found');
    });

    it('should return not ready if missing fields', async () => {
      vi.mocked(conversationRepository.getConfigurationReadiness).mockResolvedValue({
        isReady: false,
        missing: ['adminEmail', 'facilities'],
        collected: {
          hasSportsCenterName: true,
          hasCity: true,
          hasAdminName: true,
          hasAdminEmail: false,
          facilitiesCount: 0,
          isConfirmed: false,
        },
      });

      const result = await isReadyForCreation('conv-123');

      expect(result.ready).toBe(false);
      expect(result.reason).toContain('adminEmail');
      expect(result.reason).toContain('facilities');
    });

    it('should return not ready if not confirmed', async () => {
      vi.mocked(conversationRepository.getConfigurationReadiness).mockResolvedValue({
        isReady: true,
        missing: [],
        collected: {
          hasSportsCenterName: true,
          hasCity: true,
          hasAdminName: true,
          hasAdminEmail: true,
          facilitiesCount: 1,
          isConfirmed: false,
        },
      });

      const result = await isReadyForCreation('conv-123');

      expect(result.ready).toBe(false);
      expect(result.reason).toBe('Configuration not confirmed by user');
    });

    it('should return not ready if already created', async () => {
      vi.mocked(conversationRepository.getConfigurationReadiness).mockResolvedValue({
        isReady: true,
        missing: [],
        collected: {
          hasSportsCenterName: true,
          hasCity: true,
          hasAdminName: true,
          hasAdminEmail: true,
          facilitiesCount: 1,
          isConfirmed: true,
        },
      });
      vi.mocked(sportsCenterRepository.findByConversationId).mockResolvedValue({
        id: 'existing-sc',
        conversation_id: 'conv-123',
        sporttia_id: 50,
        name: 'Existing Center',
        city: 'Barcelona',
        language: 'es',
        admin_email: 'existing@example.com',
        admin_name: 'Existing Admin',
        facilities_count: 2,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await isReadyForCreation('conv-123');

      expect(result.ready).toBe(false);
      expect(result.reason).toBe('Sports center already created');
    });
  });

  describe('SportsCenterCreationError', () => {
    it('should create error with correct properties', () => {
      const error = new SportsCenterCreationError('TEST_CODE', 'Test error', true);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.isRetryable).toBe(true);
      expect(error.name).toBe('SportsCenterCreationError');
    });

    it('should default isRetryable to false', () => {
      const error = new SportsCenterCreationError('ANOTHER_CODE', 'Another error');

      expect(error.message).toBe('Another error');
      expect(error.code).toBe('ANOTHER_CODE');
      expect(error.isRetryable).toBe(false);
    });
  });
});
