import type {
  ZeroServiceCreateRequest,
  ZeroServiceCreateResponse,
  ZeroServiceFacility,
  ZeroServiceSchedule,
} from '@sporttia-zero/shared';
import { createSportsCenterViaZeroService, SporttiaApiClientError } from '../lib/sporttia-client';
import { conversationRepository } from '../repositories/conversation.repository';
import { sportsCenterRepository } from '../repositories/sports-center.repository';
import type { CollectedData, CollectedFacility } from '../lib/db-types';
import { createLogger } from '../lib/logger';
import { sendWelcomeEmail } from './email.service';
import { logSporttiaApiError, logInternalError, logAnalyticsEvent } from './analytics.service';

const logger = createLogger('sports-center-creation-service');

export interface SportsCenterCreationResult {
  success: boolean;
  sportsCenter?: {
    id: string;
    sporttiaId: number;
    name: string;
    adminEmail: string;
    adminLogin?: string; // Only provided on new creation
    adminPassword?: string; // Only provided on new creation (not stored for security)
  };
  error?: {
    code: string;
    message: string;
    isRetryable: boolean;
  };
}

export class SportsCenterCreationError extends Error {
  constructor(
    public code: string,
    message: string,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'SportsCenterCreationError';
  }
}

/**
 * Transform collected schedule to ZeroService format
 */
function transformScheduleToZeroServiceFormat(schedule: CollectedFacility['schedules'][0]): ZeroServiceSchedule {
  // Convert duration from minutes to hours as string (e.g., 90 -> "1.5")
  const durationHours = (schedule.duration / 60).toFixed(2);

  return {
    weekdays: schedule.weekdays,
    timeini: schedule.startTime,
    timeend: schedule.endTime,
    duration: durationHours,
    rate: schedule.rate.toFixed(2),
  };
}

/**
 * Transform collected facility data to ZeroService format
 */
function transformFacilityToZeroServiceFormat(facility: CollectedFacility): ZeroServiceFacility {
  return {
    name: facility.name,
    sport: {
      id: facility.sportId, // Use the sport ID from collected data
      name: facility.sportName,
    },
    schedules: facility.schedules.map(transformScheduleToZeroServiceFormat),
  };
}

/**
 * Extract province from city name or use a default
 * Format: "City, Province" or "City (Province)" or just "City"
 */
function extractProvinceFromCity(city: string): { cityName: string; provinceName: string } {
  // Try to extract province from common formats
  // Format 1: "City, Province"
  const commaMatch = city.match(/^(.+),\s*(.+)$/);
  if (commaMatch) {
    return { cityName: commaMatch[1].trim(), provinceName: commaMatch[2].trim() };
  }

  // Format 2: "City (Province)"
  const parenMatch = city.match(/^(.+)\s*\((.+)\)$/);
  if (parenMatch) {
    return { cityName: parenMatch[1].trim(), provinceName: parenMatch[2].trim() };
  }

  // Default: use city name as province name (ZeroService will create/lookup)
  return { cityName: city, provinceName: city };
}

/**
 * Transform collected data to ZeroService request format
 */
function transformToZeroServiceRequest(data: CollectedData): ZeroServiceCreateRequest {
  if (!data.sportsCenterName || !data.city || !data.adminName || !data.adminEmail) {
    throw new SportsCenterCreationError(
      'INCOMPLETE_DATA',
      'Required fields are missing: sportsCenterName, city, adminName, or adminEmail',
      false
    );
  }

  if (!data.facilities || data.facilities.length === 0) {
    throw new SportsCenterCreationError(
      'NO_FACILITIES',
      'At least one facility is required',
      false
    );
  }

  const { cityName, provinceName } = extractProvinceFromCity(data.city);

  return {
    sportcenter: {
      name: data.sportsCenterName,
      city: {
        name: cityName,
        province: {
          name: provinceName,
        },
      },
      countryCode: data.country, // ISO 3166-1 alpha-2 country code (e.g., "ES", "PT", "MX")
      placeId: data.placeId, // Google Place ID for precise city resolution
    },
    admin: {
      name: data.adminName,
      email: data.adminEmail,
    },
    language: data.language || 'es',
    facilities: data.facilities.map(transformFacilityToZeroServiceFormat),
  };
}

/**
 * Create a sports center from a confirmed conversation
 */
export async function createSportsCenterFromConversation(
  conversationId: string
): Promise<SportsCenterCreationResult> {
  logger.info({ conversationId }, 'Starting sports center creation from conversation');

  // Get conversation with collected data
  const conversation = await conversationRepository.findById(conversationId);
  if (!conversation) {
    logger.error({ conversationId }, 'Conversation not found');
    return {
      success: false,
      error: {
        code: 'CONVERSATION_NOT_FOUND',
        message: 'Conversation not found',
        isRetryable: false,
      },
    };
  }

  // Check if already created
  const existingCenter = await sportsCenterRepository.findByConversationId(conversationId);
  if (existingCenter) {
    logger.warn({ conversationId, sportsCenterId: existingCenter.id }, 'Sports center already created for this conversation');
    return {
      success: true,
      sportsCenter: {
        id: existingCenter.id,
        sporttiaId: existingCenter.sporttia_id,
        name: existingCenter.name,
        adminEmail: existingCenter.admin_email,
      },
    };
  }

  const collectedData = conversation.collected_data;
  if (!collectedData) {
    logger.error({ conversationId }, 'No collected data in conversation');
    return {
      success: false,
      error: {
        code: 'NO_DATA',
        message: 'No configuration data collected',
        isRetryable: false,
      },
    };
  }

  // Check if confirmed
  if (!collectedData.confirmed) {
    logger.warn({ conversationId }, 'Configuration not confirmed');
    return {
      success: false,
      error: {
        code: 'NOT_CONFIRMED',
        message: 'Configuration must be confirmed before creation',
        isRetryable: false,
      },
    };
  }

  // Transform data to ZeroService format
  let zeroServiceRequest: ZeroServiceCreateRequest;
  try {
    zeroServiceRequest = transformToZeroServiceRequest(collectedData);
  } catch (error) {
    if (error instanceof SportsCenterCreationError) {
      logger.error({ conversationId, code: error.code, message: error.message }, 'Data transformation failed');
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          isRetryable: error.isRetryable,
        },
      };
    }
    throw error;
  }

  logger.info(
    {
      conversationId,
      name: zeroServiceRequest.sportcenter.name,
      city: zeroServiceRequest.sportcenter.city.name,
      province: zeroServiceRequest.sportcenter.city.province.name,
      facilitiesCount: zeroServiceRequest.facilities.length,
    },
    'Calling ZeroService to create sports center'
  );

  // Call ZeroService API
  let zeroServiceResponse: ZeroServiceCreateResponse;
  try {
    zeroServiceResponse = await createSportsCenterViaZeroService(zeroServiceRequest);
  } catch (error) {
    if (error instanceof SporttiaApiClientError) {
      logger.error(
        {
          conversationId,
          statusCode: error.statusCode,
          code: error.code,
          message: error.message,
        },
        'ZeroService API error during creation'
      );

      // Log to analytics
      logSporttiaApiError(
        error.message,
        {
          statusCode: error.statusCode,
          code: error.code,
        },
        conversationId
      );

      const isRetryable = error.statusCode >= 500 || error.code === 'TIMEOUT' || error.code === 'NETWORK_ERROR';

      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          isRetryable,
        },
      };
    }
    throw error;
  }

  logger.info(
    {
      conversationId,
      sporttiaId: zeroServiceResponse.sportcenterId,
      adminId: zeroServiceResponse.adminId,
      adminLogin: zeroServiceResponse.adminLogin,
    },
    'Sports center created via ZeroService'
  );

  // Store in local database
  const sportsCenterRecord = await sportsCenterRepository.create({
    conversation_id: conversationId,
    sporttia_id: zeroServiceResponse.sportcenterId,
    name: zeroServiceRequest.sportcenter.name,
    city: zeroServiceRequest.sportcenter.city.name,
    language: zeroServiceRequest.language,
    admin_email: zeroServiceRequest.admin.email,
    admin_name: zeroServiceRequest.admin.name,
    facilities_count: zeroServiceRequest.facilities.length,
  });

  if (!sportsCenterRecord) {
    logger.error({ conversationId, sporttiaId: zeroServiceResponse.sportcenterId }, 'Failed to store sports center record locally');
    // Don't fail - the center was created in Sporttia
  }

  // Update conversation status and link to sports center
  await conversationRepository.update(conversationId, {
    status: 'completed',
    sports_center_id: sportsCenterRecord?.id ?? null,
  });

  logger.info(
    {
      conversationId,
      sportsCenterId: sportsCenterRecord?.id,
      sporttiaId: zeroServiceResponse.sportcenterId,
    },
    'Sports center creation completed successfully'
  );

  // Send welcome email (non-blocking - failure doesn't affect success)
  try {
    const emailResult = await sendWelcomeEmail({
      sportsCenterName: zeroServiceRequest.sportcenter.name,
      adminName: zeroServiceRequest.admin.name,
      adminEmail: zeroServiceRequest.admin.email,
      adminLogin: zeroServiceResponse.adminLogin,
      adminPassword: zeroServiceResponse.adminPassword,
      city: zeroServiceRequest.sportcenter.city.name,
      facilitiesCount: zeroServiceRequest.facilities.length,
      facilities: collectedData.facilities!.map((f) => ({
        name: f.name,
        sportName: f.sportName,
      })),
      sporttiaId: zeroServiceResponse.sportcenterId,
      language: zeroServiceRequest.language,
    });

    if (emailResult.success) {
      logger.info(
        {
          conversationId,
          sporttiaId: zeroServiceResponse.sportcenterId,
          messageId: emailResult.messageId,
        },
        'Welcome email sent successfully'
      );
    } else {
      logger.warn(
        {
          conversationId,
          sporttiaId: zeroServiceResponse.sportcenterId,
          error: emailResult.error,
        },
        'Failed to send welcome email (non-blocking)'
      );
    }
  } catch (emailError) {
    // Log but don't fail the overall creation
    logger.error(
      {
        conversationId,
        sporttiaId: zeroServiceResponse.sportcenterId,
        error: emailError,
      },
      'Unexpected error sending welcome email (non-blocking)'
    );
  }

  return {
    success: true,
    sportsCenter: {
      id: sportsCenterRecord?.id ?? '',
      sporttiaId: zeroServiceResponse.sportcenterId,
      name: zeroServiceRequest.sportcenter.name,
      adminEmail: zeroServiceRequest.admin.email,
      adminLogin: zeroServiceResponse.adminLogin,
      adminPassword: zeroServiceResponse.adminPassword,
    },
  };
}

/**
 * Check if a conversation is ready for sports center creation
 */
export async function isReadyForCreation(conversationId: string): Promise<{
  ready: boolean;
  reason?: string;
}> {
  const readiness = await conversationRepository.getConfigurationReadiness(conversationId);

  if (!readiness) {
    return { ready: false, reason: 'Conversation not found' };
  }

  if (!readiness.isReady) {
    return {
      ready: false,
      reason: `Missing required fields: ${readiness.missing.join(', ')}`,
    };
  }

  if (!readiness.collected.isConfirmed) {
    return { ready: false, reason: 'Configuration not confirmed by user' };
  }

  // Check if already created
  const existing = await sportsCenterRepository.findByConversationId(conversationId);
  if (existing) {
    return { ready: false, reason: 'Sports center already created' };
  }

  return { ready: true };
}
