import { Router, type Response } from 'express';
import { ZodError, z } from 'zod';
import { login, SporttiaApiClientError } from '../lib/sporttia-client';
import { sendSuccess, sendError, ErrorCodes } from '../lib/response';
import { createLogger } from '../lib/logger';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import {
  conversationRepository,
  messageRepository,
} from '../repositories/conversation.repository';
import { db } from '../lib/db';
import { sql } from 'kysely';
import type { ConversationStatus } from '../lib/db-types';

const router = Router();
const logger = createLogger('admin-api');

// Validation schemas
const loginSchema = z.object({
  login: z.string().min(1, 'Login is required'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/admin/login
 * Authenticate an admin user via Sporttia API
 */
router.post('/login', async (req, res: Response) => {
  try {
    const validated = loginSchema.parse(req.body);

    logger.info({ login: validated.login }, 'Admin login attempt');

    // Call Sporttia API to authenticate
    const result = await login({
      login: validated.login,
      password: validated.password,
    });

    // Check if user has admin privileges
    const adminPrivileges = ['superadmin', 'admin'];
    if (!adminPrivileges.includes(result.user.privilege)) {
      logger.warn(
        { login: validated.login, privilege: result.user.privilege },
        'Login rejected - insufficient privileges'
      );
      return sendError(
        res,
        ErrorCodes.FORBIDDEN,
        'Access denied. Admin privileges required.',
        403
      );
    }

    logger.info(
      { userId: result.user.id, email: result.user.email, privilege: result.user.privilege },
      'Admin login successful'
    );

    sendSuccess(res, {
      token: result.token,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        privilege: result.user.privilege,
        lang: result.user.lang,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ errors: error.errors }, 'Validation error during login');
      return sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        'Invalid login credentials format',
        400,
        { errors: error.errors }
      );
    }

    if (error instanceof SporttiaApiClientError) {
      // Handle specific Sporttia API errors
      if (error.statusCode === 401 || error.statusCode === 403) {
        logger.warn({ login: req.body?.login }, 'Invalid credentials');
        return sendError(res, ErrorCodes.UNAUTHORIZED, 'Invalid login or password', 401);
      }

      logger.error(
        { statusCode: error.statusCode, code: error.code, message: error.message },
        'Sporttia API error during login'
      );
      return sendError(
        res,
        ErrorCodes.EXTERNAL_SERVICE_ERROR,
        'Authentication service unavailable. Please try again.',
        503
      );
    }

    logger.error({ error }, 'Unexpected error during login');
    sendError(res, ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500);
  }
});

/**
 * GET /api/admin/me
 * Get current authenticated user info
 */
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, ErrorCodes.UNAUTHORIZED, 'Not authenticated', 401);
  }

  logger.info({ userId: req.user.id }, 'User info requested');

  sendSuccess(res, {
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      privilege: req.user.privilege,
    },
  });
});

/**
 * POST /api/admin/logout
 * Logout is primarily client-side (clear token)
 * This endpoint exists for logging/audit purposes
 */
router.post('/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (req.user) {
    logger.info({ userId: req.user.id }, 'Admin user logged out');
  }

  sendSuccess(res, { message: 'Logged out successfully' });
});

// Validation schema for metrics
const metricsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * GET /api/admin/metrics
 * Get dashboard metrics and statistics
 */
router.get('/metrics', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = metricsSchema.parse(req.query);

    logger.info({ filters: validated, userId: req.user?.id }, 'Getting dashboard metrics');

    if (!db) {
      return sendError(res, ErrorCodes.INTERNAL_ERROR, 'Database not available', 500);
    }

    // Parse dates - default to last 30 days if not provided
    const now = new Date();
    const endDate = validated.endDate ? new Date(validated.endDate) : now;
    const startDate = validated.startDate
      ? new Date(validated.startDate)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get start of today and start of this week (Monday)
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    const dayOfWeek = weekStart.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(weekStart.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);

    // Get all-time totals by status
    const allTimeByStatus = await db
      .selectFrom('conversations')
      .select([
        'status',
        sql<number>`count(*)::int`.as('count'),
      ])
      .groupBy('status')
      .execute();

    const statusCounts: Record<string, number> = {
      active: 0,
      completed: 0,
      abandoned: 0,
      error: 0,
    };
    let allTimeTotal = 0;
    for (const row of allTimeByStatus) {
      statusCounts[row.status] = row.count;
      allTimeTotal += row.count;
    }

    // Get today's count
    const todayResult = await db
      .selectFrom('conversations')
      .select(sql<number>`count(*)::int`.as('count'))
      .where('created_at', '>=', todayStart)
      .executeTakeFirst();
    const todayCount = todayResult?.count || 0;

    // Get this week's count
    const weekResult = await db
      .selectFrom('conversations')
      .select(sql<number>`count(*)::int`.as('count'))
      .where('created_at', '>=', weekStart)
      .executeTakeFirst();
    const weekCount = weekResult?.count || 0;

    // Get counts for the filtered period
    const periodByStatus = await db
      .selectFrom('conversations')
      .select([
        'status',
        sql<number>`count(*)::int`.as('count'),
      ])
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .groupBy('status')
      .execute();

    const periodCounts: Record<string, number> = {
      active: 0,
      completed: 0,
      abandoned: 0,
      error: 0,
    };
    let periodTotal = 0;
    for (const row of periodByStatus) {
      periodCounts[row.status] = row.count;
      periodTotal += row.count;
    }

    // Calculate rates (avoid division by zero)
    const completionRate = periodTotal > 0 ? (periodCounts.completed / periodTotal) * 100 : 0;
    const abandonmentRate = periodTotal > 0 ? (periodCounts.abandoned / periodTotal) * 100 : 0;
    const errorRate = periodTotal > 0 ? (periodCounts.error / periodTotal) * 100 : 0;

    // Get average duration for completed conversations in the period
    const avgDurationResult = await db
      .selectFrom('conversations')
      .select(
        sql<number>`avg(extract(epoch from (updated_at - created_at)))::int`.as('avg_seconds')
      )
      .where('status', '=', 'completed')
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .executeTakeFirst();
    const avgDurationSeconds = avgDurationResult?.avg_seconds || 0;

    // Get funnel data for the period
    // Stage 1: All started conversations
    const funnelStarted = periodTotal;

    // Stage 2: Email captured (has adminEmail in collected_data)
    const emailCapturedResult = await db
      .selectFrom('conversations')
      .select(sql<number>`count(*)::int`.as('count'))
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .where(sql<boolean>`collected_data->>'adminEmail' is not null`)
      .executeTakeFirst();
    const funnelEmailCaptured = emailCapturedResult?.count || 0;

    // Stage 3: Completed
    const funnelCompleted = periodCounts.completed;

    // Get daily conversation counts for the period (for chart)
    const dailyCounts = await db
      .selectFrom('conversations')
      .select([
        sql<string>`date_trunc('day', created_at)::date::text`.as('date'),
        sql<number>`count(*)::int`.as('total'),
        sql<number>`count(*) filter (where status = 'completed')::int`.as('completed'),
        sql<number>`count(*) filter (where status = 'error')::int`.as('errors'),
      ])
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .groupBy(sql`date_trunc('day', created_at)`)
      .orderBy(sql`date_trunc('day', created_at)`, 'asc')
      .execute();

    sendSuccess(res, {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      totals: {
        today: todayCount,
        thisWeek: weekCount,
        allTime: allTimeTotal,
        period: periodTotal,
      },
      byStatus: {
        allTime: statusCounts,
        period: periodCounts,
      },
      rates: {
        completion: Math.round(completionRate * 10) / 10,
        abandonment: Math.round(abandonmentRate * 10) / 10,
        error: Math.round(errorRate * 10) / 10,
      },
      avgDurationSeconds,
      funnel: {
        started: funnelStarted,
        emailCaptured: funnelEmailCaptured,
        completed: funnelCompleted,
      },
      dailyTrends: dailyCounts.map((d) => ({
        date: d.date,
        total: d.total,
        completed: d.completed,
        errors: d.errors,
      })),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ errors: error.errors }, 'Validation error getting metrics');
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Invalid query parameters', 400, {
        errors: error.errors,
      });
    }

    logger.error({ error }, 'Failed to get metrics');
    sendError(res, ErrorCodes.INTERNAL_ERROR, 'Failed to get metrics', 500);
  }
});

// Error types for categorization
const ERROR_TYPES = [
  'sporttia_api_error',
  'openai_api_error',
  'email_failed',
  'validation_error',
  'internal_error',
] as const;

type ErrorType = (typeof ERROR_TYPES)[number];

// Validation schema for errors
const errorsListSchema = z.object({
  errorType: z.enum(['all', ...ERROR_TYPES]).optional().default('all'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * GET /api/admin/errors
 * List error events with filtering and pagination
 */
router.get('/errors', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = errorsListSchema.parse(req.query);

    logger.info({ filters: validated, userId: req.user?.id }, 'Listing errors');

    if (!db) {
      return sendError(res, ErrorCodes.INTERNAL_ERROR, 'Database not available', 500);
    }

    // Parse dates - default to last 30 days
    const now = new Date();
    const endDate = validated.endDate ? new Date(validated.endDate) : now;
    const startDate = validated.startDate
      ? new Date(validated.startDate)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Validate dates
    if (isNaN(startDate.getTime())) {
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Invalid start date format', 400);
    }
    if (isNaN(endDate.getTime())) {
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Invalid end date format', 400);
    }

    // Build query for errors
    let query = db
      .selectFrom('analytics_events')
      .selectAll()
      .where('event_type', 'in', [...ERROR_TYPES])
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate);

    // Filter by error type if not 'all'
    if (validated.errorType !== 'all') {
      query = query.where('event_type', '=', validated.errorType);
    }

    // Get total count
    const countResult = await db
      .selectFrom('analytics_events')
      .select(sql<number>`count(*)::int`.as('count'))
      .where('event_type', 'in', [...ERROR_TYPES])
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .$if(validated.errorType !== 'all', (qb) =>
        qb.where('event_type', '=', validated.errorType as ErrorType)
      )
      .executeTakeFirst();

    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / validated.limit);

    // Get paginated results (most recent first)
    const offset = (validated.page - 1) * validated.limit;
    const errors = await query
      .orderBy('created_at', 'desc')
      .limit(validated.limit)
      .offset(offset)
      .execute();

    // Get counts by error type for summary
    const countsByType = await db
      .selectFrom('analytics_events')
      .select([
        'event_type',
        sql<number>`count(*)::int`.as('count'),
      ])
      .where('event_type', 'in', [...ERROR_TYPES])
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .groupBy('event_type')
      .execute();

    const summary: Record<string, number> = {};
    for (const type of ERROR_TYPES) {
      summary[type] = 0;
    }
    for (const row of countsByType) {
      summary[row.event_type] = row.count;
    }

    // Transform errors for response
    const formattedErrors = errors.map((e) => ({
      id: e.id,
      conversationId: e.conversation_id,
      errorType: e.event_type,
      message: (e.event_data as Record<string, unknown>)?.message || 'Unknown error',
      details: e.event_data,
      timestamp: e.created_at,
    }));

    sendSuccess(res, {
      errors: formattedErrors,
      summary,
      pagination: {
        total,
        page: validated.page,
        limit: validated.limit,
        totalPages,
      },
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ errors: error.errors }, 'Validation error listing errors');
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Invalid query parameters', 400, {
        errors: error.errors,
      });
    }

    logger.error({ error }, 'Failed to list errors');
    sendError(res, ErrorCodes.INTERNAL_ERROR, 'Failed to list errors', 500);
  }
});

// Validation schemas for conversations
const conversationsListSchema = z.object({
  status: z.enum(['all', 'active', 'completed', 'abandoned', 'error']).optional().default('all'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.enum(['created_at', 'updated_at']).optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * GET /api/admin/conversations
 * List all conversations with filtering, pagination, and sorting
 */
router.get('/conversations', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = conversationsListSchema.parse(req.query);

    logger.info({ filters: validated, userId: req.user?.id }, 'Listing conversations');

    // Parse dates if provided
    const startDate = validated.startDate ? new Date(validated.startDate) : undefined;
    const endDate = validated.endDate ? new Date(validated.endDate) : undefined;

    // Validate dates
    if (startDate && isNaN(startDate.getTime())) {
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Invalid start date format', 400);
    }
    if (endDate && isNaN(endDate.getTime())) {
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Invalid end date format', 400);
    }

    // Get conversations from repository
    const result = await conversationRepository.list({
      status: validated.status as ConversationStatus | 'all',
      startDate,
      endDate,
      search: validated.search,
      page: validated.page,
      limit: validated.limit,
      sortBy: validated.sortBy,
      sortOrder: validated.sortOrder,
    });

    // Get sports center data for completed conversations
    const conversationIds = result.conversations
      .filter((c) => c.status === 'completed')
      .map((c) => c.id);

    let sportsCentersMap: Record<string, { sporttiaId: number; name: string }> = {};
    if (conversationIds.length > 0 && db) {
      const sportsCenters = await db
        .selectFrom('sports_centers')
        .select(['conversation_id', 'sporttia_id', 'name'])
        .where('conversation_id', 'in', conversationIds)
        .execute();

      sportsCentersMap = sportsCenters.reduce(
        (acc, sc) => {
          acc[sc.conversation_id] = { sporttiaId: sc.sporttia_id, name: sc.name };
          return acc;
        },
        {} as Record<string, { sporttiaId: number; name: string }>
      );
    }

    // Transform conversations for response
    const conversations = result.conversations.map((c) => ({
      id: c.id,
      sessionId: c.session_id,
      language: c.language,
      status: c.status,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      sportsCenter: sportsCentersMap[c.id] || null,
      collectedData: c.collected_data
        ? {
            sportsCenterName: c.collected_data.sportsCenterName,
            adminEmail: c.collected_data.adminEmail,
            facilitiesCount: c.collected_data.facilities?.length ?? 0,
          }
        : null,
    }));

    sendSuccess(res, {
      conversations,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ errors: error.errors }, 'Validation error listing conversations');
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Invalid query parameters', 400, {
        errors: error.errors,
      });
    }

    logger.error({ error }, 'Failed to list conversations');
    sendError(res, ErrorCodes.INTERNAL_ERROR, 'Failed to list conversations', 500);
  }
});

/**
 * GET /api/admin/conversations/:id
 * Get detailed conversation with messages and all related data
 */
router.get('/conversations/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    logger.info({ conversationId: id, userId: req.user?.id }, 'Getting conversation detail');

    // Get conversation
    const conversation = await conversationRepository.findById(id);
    if (!conversation) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Conversation not found', 404);
    }

    // Get messages
    const messages = await messageRepository.findByConversationId(id);

    // Get sports center if exists
    let sportsCenter = null;
    if (db) {
      const sc = await db
        .selectFrom('sports_centers')
        .selectAll()
        .where('conversation_id', '=', id)
        .executeTakeFirst();

      if (sc) {
        sportsCenter = {
          id: sc.id,
          sporttiaId: sc.sporttia_id,
          name: sc.name,
          city: sc.city,
          language: sc.language,
          adminEmail: sc.admin_email,
          adminName: sc.admin_name,
          facilitiesCount: sc.facilities_count,
          createdAt: sc.created_at,
        };
      }
    }

    // Get analytics events related to this conversation (for email status)
    let emailStatus: 'sent' | 'failed' | 'pending' | null = null;
    if (db && conversation.status === 'completed') {
      const emailEvent = await db
        .selectFrom('analytics_events')
        .select(['event_type', 'event_data'])
        .where('conversation_id', '=', id)
        .where('event_type', 'in', ['email_sent', 'email_failed'])
        .orderBy('created_at', 'desc')
        .executeTakeFirst();

      if (emailEvent) {
        emailStatus = emailEvent.event_type === 'email_sent' ? 'sent' : 'failed';
      } else if (sportsCenter) {
        // Sports center created but no email event found
        emailStatus = 'pending';
      }
    }

    // Format collected data
    const collectedData = conversation.collected_data
      ? {
          sportsCenterName: conversation.collected_data.sportsCenterName || null,
          city: conversation.collected_data.city || null,
          language: conversation.collected_data.language || null,
          adminName: conversation.collected_data.adminName || null,
          adminEmail: conversation.collected_data.adminEmail || null,
          facilities: conversation.collected_data.facilities || [],
          confirmed: conversation.collected_data.confirmed || false,
          lastError: conversation.collected_data.lastError || null,
          escalatedToHuman: conversation.collected_data.escalatedToHuman || false,
          escalationReason: conversation.collected_data.escalationReason || null,
        }
      : null;

    // Transform messages for response
    const formattedMessages = messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.created_at,
      metadata: m.metadata || null,
    }));

    sendSuccess(res, {
      conversation: {
        id: conversation.id,
        sessionId: conversation.session_id,
        language: conversation.language,
        status: conversation.status,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at,
      },
      messages: formattedMessages,
      collectedData,
      sportsCenter,
      emailStatus,
    });
  } catch (error) {
    logger.error({ error, conversationId: req.params.id }, 'Failed to get conversation detail');
    sendError(res, ErrorCodes.INTERNAL_ERROR, 'Failed to get conversation details', 500);
  }
});

export default router;
