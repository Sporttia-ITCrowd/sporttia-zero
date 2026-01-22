import { db } from '../lib/db';
import { createLogger } from '../lib/logger';

const logger = createLogger('analytics-service');

// Error types that can be logged
export type AnalyticsErrorType =
  | 'sporttia_api_error'
  | 'openai_api_error'
  | 'email_failed'
  | 'validation_error'
  | 'internal_error';

// Event types
export type AnalyticsEventType =
  | AnalyticsErrorType
  | 'conversation_started'
  | 'conversation_completed'
  | 'email_sent'
  | 'sports_center_created';

interface LogEventOptions {
  conversationId?: string | null;
  eventType: AnalyticsEventType;
  eventData?: Record<string, unknown>;
}

/**
 * Log an analytics event to the database
 */
export async function logAnalyticsEvent(options: LogEventOptions): Promise<void> {
  const { conversationId, eventType, eventData } = options;

  if (!db) {
    logger.warn({ eventType }, 'Database not available, skipping analytics event');
    return;
  }

  try {
    await db
      .insertInto('analytics_events')
      .values({
        conversation_id: conversationId ?? null,
        event_type: eventType,
        event_data: eventData ?? null,
      })
      .execute();

    logger.debug({ conversationId, eventType }, 'Analytics event logged');
  } catch (error) {
    // Don't let analytics failures affect the main flow
    logger.error({ error, eventType, conversationId }, 'Failed to log analytics event');
  }
}

/**
 * Log an error event
 */
export async function logError(
  errorType: AnalyticsErrorType,
  message: string,
  details?: Record<string, unknown>,
  conversationId?: string | null
): Promise<void> {
  await logAnalyticsEvent({
    conversationId,
    eventType: errorType,
    eventData: {
      message,
      ...details,
    },
  });
}

/**
 * Log a Sporttia API error
 */
export async function logSporttiaApiError(
  message: string,
  details?: Record<string, unknown>,
  conversationId?: string | null
): Promise<void> {
  await logError('sporttia_api_error', message, details, conversationId);
}

/**
 * Log an OpenAI API error
 */
export async function logOpenAIApiError(
  message: string,
  details?: Record<string, unknown>,
  conversationId?: string | null
): Promise<void> {
  await logError('openai_api_error', message, details, conversationId);
}

/**
 * Log an email failure
 */
export async function logEmailFailed(
  message: string,
  details?: Record<string, unknown>,
  conversationId?: string | null
): Promise<void> {
  await logError('email_failed', message, details, conversationId);
}

/**
 * Log a validation error
 */
export async function logValidationError(
  message: string,
  details?: Record<string, unknown>,
  conversationId?: string | null
): Promise<void> {
  await logError('validation_error', message, details, conversationId);
}

/**
 * Log an internal error
 */
export async function logInternalError(
  message: string,
  details?: Record<string, unknown>,
  conversationId?: string | null
): Promise<void> {
  await logError('internal_error', message, details, conversationId);
}
