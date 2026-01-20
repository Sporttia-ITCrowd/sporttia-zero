import { sql } from 'kysely';
import { db } from '../lib/db';
import type {
  Conversation,
  NewConversation,
  ConversationUpdate,
  Message,
  NewMessage,
  ConversationStatus,
  CollectedData,
  CollectedFacility,
} from '../lib/db-types';
import { createLogger } from '../lib/logger';
import { normalizeEmail, validateFacilitySchedules } from '../lib/validation';

const logger = createLogger('conversation-repository');

// Conversation repository
export const conversationRepository = {
  async create(data: NewConversation): Promise<Conversation | null> {
    if (!db) {
      logger.error('Database not connected');
      return null;
    }

    try {
      const result = await db
        .insertInto('conversations')
        .values(data)
        .returningAll()
        .executeTakeFirst();

      logger.info({ conversationId: result?.id }, 'Conversation created');
      return result ?? null;
    } catch (error) {
      logger.error({ error, data }, 'Failed to create conversation');
      throw error;
    }
  },

  async findById(id: string): Promise<Conversation | null> {
    if (!db) {
      logger.error('Database not connected');
      return null;
    }

    try {
      const result = await db
        .selectFrom('conversations')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      return result ?? null;
    } catch (error) {
      logger.error({ error, id }, 'Failed to find conversation');
      throw error;
    }
  },

  async findBySessionId(sessionId: string): Promise<Conversation | null> {
    if (!db) {
      logger.error('Database not connected');
      return null;
    }

    try {
      const result = await db
        .selectFrom('conversations')
        .selectAll()
        .where('session_id', '=', sessionId)
        .where('status', '=', 'active')
        .orderBy('created_at', 'desc')
        .executeTakeFirst();

      return result ?? null;
    } catch (error) {
      logger.error({ error, sessionId }, 'Failed to find conversation by session');
      throw error;
    }
  },

  async update(id: string, data: ConversationUpdate): Promise<Conversation | null> {
    if (!db) {
      logger.error('Database not connected');
      return null;
    }

    try {
      const result = await db
        .updateTable('conversations')
        .set(data)
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst();

      logger.info({ conversationId: id, updates: data }, 'Conversation updated');
      return result ?? null;
    } catch (error) {
      logger.error({ error, id, data }, 'Failed to update conversation');
      throw error;
    }
  },

  async updateStatus(id: string, status: ConversationStatus): Promise<Conversation | null> {
    return this.update(id, { status });
  },

  async updateLanguage(id: string, language: string): Promise<Conversation | null> {
    return this.update(id, { language });
  },

  async getCollectedData(id: string): Promise<CollectedData | null> {
    const conversation = await this.findById(id);
    return conversation?.collected_data ?? null;
  },

  async updateCollectedData(
    id: string,
    updater: (current: CollectedData) => CollectedData
  ): Promise<Conversation | null> {
    if (!db) {
      logger.error('Database not connected');
      return null;
    }

    try {
      // Get current data
      const conversation = await this.findById(id);
      if (!conversation) {
        logger.error({ id }, 'Conversation not found for collected data update');
        return null;
      }

      const currentData: CollectedData = conversation.collected_data ?? {};
      const updatedData = updater(currentData);

      const result = await db
        .updateTable('conversations')
        .set({ collected_data: updatedData })
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst();

      logger.info(
        { conversationId: id, collectedData: updatedData },
        'Collected data updated'
      );
      return result ?? null;
    } catch (error) {
      logger.error({ error, id }, 'Failed to update collected data');
      throw error;
    }
  },

  async updateSportsCenterInfo(
    id: string,
    info: { name?: string; city?: string; country?: string }
  ): Promise<Conversation | null> {
    return this.updateCollectedData(id, (current) => ({
      ...current,
      ...(info.name && { sportsCenterName: info.name }),
      ...(info.city && { city: info.city }),
      ...(info.country && { country: info.country.toUpperCase() }), // Normalize to uppercase
    }));
  },

  async updateAdminInfo(
    id: string,
    info: { name?: string; email?: string }
  ): Promise<Conversation | null> {
    // Validate and normalize email if provided
    let validatedEmail: string | undefined;
    if (info.email) {
      const normalized = normalizeEmail(info.email);
      if (normalized) {
        validatedEmail = normalized;
      } else {
        logger.warn(
          { id, email: info.email },
          'Invalid email format provided - not storing'
        );
      }
    }

    return this.updateCollectedData(id, (current) => ({
      ...current,
      ...(info.name && { adminName: info.name }),
      ...(validatedEmail && { adminEmail: validatedEmail }),
    }));
  },

  async addFacility(id: string, facility: CollectedFacility): Promise<Conversation | null> {
    // Validate schedules
    const validation = validateFacilitySchedules(facility.schedules);
    if (!validation.valid) {
      logger.warn(
        { id, facilityName: facility.name, errors: validation.errors },
        'Facility schedule validation failed - storing anyway for AI to handle'
      );
      // We still store it - the AI will guide the user to fix issues
    }

    return this.updateCollectedData(id, (current) => ({
      ...current,
      facilities: [...(current.facilities ?? []), facility],
    }));
  },

  async updateFacility(
    id: string,
    facilityIndex: number,
    updates: Partial<CollectedFacility>
  ): Promise<Conversation | null> {
    // Validate new schedules if provided
    if (updates.schedules) {
      const validation = validateFacilitySchedules(updates.schedules);
      if (!validation.valid) {
        logger.warn(
          { id, facilityIndex, errors: validation.errors },
          'Updated facility schedule validation failed - storing anyway for AI to handle'
        );
      }
    }

    return this.updateCollectedData(id, (current) => {
      const facilities = current.facilities ?? [];
      if (facilityIndex < 0 || facilityIndex >= facilities.length) {
        logger.warn(
          { id, facilityIndex, facilitiesCount: facilities.length },
          'Invalid facility index for update'
        );
        return current;
      }

      const updatedFacilities = [...facilities];
      updatedFacilities[facilityIndex] = {
        ...updatedFacilities[facilityIndex],
        ...updates,
      };

      return {
        ...current,
        facilities: updatedFacilities,
      };
    });
  },

  async setConfirmed(id: string, confirmed: boolean): Promise<Conversation | null> {
    return this.updateCollectedData(id, (current) => ({
      ...current,
      confirmed,
    }));
  },

  /**
   * Check if configuration is ready for confirmation
   * Returns detailed status of what's collected and what's missing
   */
  async getConfigurationReadiness(id: string): Promise<{
    isReady: boolean;
    collected: {
      sportsCenterName: boolean;
      city: boolean;
      adminName: boolean;
      adminEmail: boolean;
      hasFacilities: boolean;
      facilityCount: number;
      isConfirmed: boolean;
    };
    missing: string[];
    data: CollectedData | null;
  } | null> {
    const conversation = await this.findById(id);
    if (!conversation) {
      return null;
    }

    const data = conversation.collected_data ?? {};
    const collected = {
      sportsCenterName: !!data.sportsCenterName,
      city: !!data.city,
      adminName: !!data.adminName,
      adminEmail: !!data.adminEmail,
      hasFacilities: (data.facilities?.length ?? 0) > 0,
      facilityCount: data.facilities?.length ?? 0,
      isConfirmed: data.confirmed === true,
    };

    const missing: string[] = [];
    if (!collected.sportsCenterName) missing.push('Sports center name');
    if (!collected.city) missing.push('City');
    if (!collected.adminName) missing.push('Administrator name');
    if (!collected.adminEmail) missing.push('Administrator email');
    if (!collected.hasFacilities) missing.push('At least one facility');

    const isReady = missing.length === 0;

    return {
      isReady,
      collected,
      missing,
      data,
    };
  },

  /**
   * Generate a formatted configuration summary for display
   */
  async getConfigurationSummary(id: string): Promise<{
    isReady: boolean;
    summary: {
      sportsCenter: {
        name: string | null;
        city: string | null;
        language: string | null;
      };
      admin: {
        name: string | null;
        email: string | null;
      };
      facilities: Array<{
        name: string;
        sportName: string;
        schedules: Array<{
          weekdays: string;
          hours: string;
          duration: number;
          rate: number;
        }>;
      }>;
      confirmed: boolean;
    };
    missing: string[];
  } | null> {
    const readiness = await this.getConfigurationReadiness(id);
    if (!readiness) {
      return null;
    }

    const data = readiness.data ?? {};

    // Helper to format weekdays
    const formatWeekdays = (days: number[]): string => {
      const dayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      if (days.length === 7) return 'Every day';
      if (days.length === 5 && days.every((d) => d >= 1 && d <= 5)) return 'Monday to Friday';
      if (days.length === 2 && days.includes(6) && days.includes(7)) return 'Weekends';
      return days.map((d) => dayNames[d]).join(', ');
    };

    const facilities = (data.facilities ?? []).map((f) => ({
      name: f.name,
      sportName: f.sportName,
      schedules: f.schedules.map((s) => ({
        weekdays: formatWeekdays(s.weekdays),
        hours: `${s.startTime} - ${s.endTime}`,
        duration: s.duration,
        rate: s.rate,
      })),
    }));

    return {
      isReady: readiness.isReady,
      summary: {
        sportsCenter: {
          name: data.sportsCenterName ?? null,
          city: data.city ?? null,
          language: data.language ?? null,
        },
        admin: {
          name: data.adminName ?? null,
          email: data.adminEmail ?? null,
        },
        facilities,
        confirmed: data.confirmed === true,
      },
      missing: readiness.missing,
    };
  },

  /**
   * Record an error in the conversation
   */
  async recordError(
    id: string,
    error: { code: string; message: string },
    incrementRetry: boolean = true
  ): Promise<Conversation | null> {
    const conversation = await this.findById(id);
    if (!conversation) {
      return null;
    }

    const currentData = conversation.collected_data ?? {};
    const currentRetryCount = currentData.lastError?.retryCount ?? 0;

    return this.updateCollectedData(id, (current) => ({
      ...current,
      lastError: {
        code: error.code,
        message: error.message,
        timestamp: new Date().toISOString(),
        retryCount: incrementRetry ? currentRetryCount + 1 : currentRetryCount,
      },
    }));
  },

  /**
   * Mark conversation as escalated to human support
   */
  async markEscalated(id: string, reason: string): Promise<Conversation | null> {
    logger.info({ conversationId: id, reason }, 'Conversation escalated to human support');

    return this.updateCollectedData(id, (current) => ({
      ...current,
      escalatedToHuman: true,
      escalationReason: reason,
    }));
  },

  /**
   * Mark conversation with error status
   */
  async markError(id: string, errorDetails?: string): Promise<Conversation | null> {
    logger.info({ conversationId: id, errorDetails }, 'Marking conversation as error');

    const result = await this.update(id, { status: 'error' });

    if (errorDetails) {
      await this.recordError(id, { code: 'MARKED_ERROR', message: errorDetails }, false);
    }

    return result;
  },

  /**
   * Create a new conversation as a restart of an existing one
   * Returns the new conversation
   */
  async restart(id: string): Promise<Conversation | null> {
    const original = await this.findById(id);
    if (!original) {
      logger.error({ conversationId: id }, 'Cannot restart - conversation not found');
      return null;
    }

    // Mark the original as abandoned
    await this.update(id, { status: 'abandoned' });

    // Create a new conversation with the same session
    const newConversation = await this.create({
      session_id: original.session_id,
      language: original.language,
      status: 'active',
      sports_center_id: null,
    });

    logger.info(
      {
        originalId: id,
        newId: newConversation?.id,
        sessionId: original.session_id,
      },
      'Conversation restarted'
    );

    return newConversation;
  },

  /**
   * Get error retry count for a conversation
   */
  async getRetryCount(id: string): Promise<number> {
    const conversation = await this.findById(id);
    return conversation?.collected_data?.lastError?.retryCount ?? 0;
  },

  /**
   * List conversations with filtering, pagination, and sorting
   * Used by admin dashboard
   */
  async list(options: {
    status?: ConversationStatus | 'all';
    startDate?: Date;
    endDate?: Date;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: 'created_at' | 'updated_at';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    conversations: Conversation[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    if (!db) {
      logger.error('Database not connected');
      return { conversations: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    }

    const {
      status = 'all',
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = options;

    try {
      // Build base query
      let query = db.selectFrom('conversations').selectAll();

      // Apply status filter
      if (status !== 'all') {
        query = query.where('status', '=', status);
      }

      // Apply date range filter
      if (startDate) {
        query = query.where('created_at', '>=', startDate);
      }
      if (endDate) {
        query = query.where('created_at', '<=', endDate);
      }

      // Apply search filter (ID or admin email in collected_data)
      if (search && search.trim()) {
        const searchTerm = `%${search.trim().toLowerCase()}%`;
        // Search by ID or in collected_data JSON
        query = query.where(
          sql<boolean>`(
            lower(id::text) like ${searchTerm}
            OR lower(coalesce(collected_data->>'adminEmail', '')) like ${searchTerm}
          )`
        );
      }

      // Get total count (without pagination)
      const countQuery = db
        .selectFrom('conversations')
        .select(db.fn.count('id').as('count'));

      // Apply same filters to count query
      let countFiltered = countQuery;
      if (status !== 'all') {
        countFiltered = countFiltered.where('status', '=', status);
      }
      if (startDate) {
        countFiltered = countFiltered.where('created_at', '>=', startDate);
      }
      if (endDate) {
        countFiltered = countFiltered.where('created_at', '<=', endDate);
      }
      if (search && search.trim()) {
        const countSearchTerm = `%${search.trim().toLowerCase()}%`;
        countFiltered = countFiltered.where(
          sql<boolean>`(
            lower(id::text) like ${countSearchTerm}
            OR lower(coalesce(collected_data->>'adminEmail', '')) like ${countSearchTerm}
          )`
        );
      }

      const countResult = await countFiltered.executeTakeFirst();
      const total = Number(countResult?.count ?? 0);

      // Apply sorting
      query = query.orderBy(sortBy, sortOrder);

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.offset(offset).limit(limit);

      const conversations = await query.execute();

      return {
        conversations,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error({ error, options }, 'Failed to list conversations');
      throw error;
    }
  },

  /**
   * Get conversation with associated sports center data
   */
  async findWithSportsCenter(id: string): Promise<{
    conversation: Conversation;
    sportsCenter: import('../lib/db-types').SportsCenter | null;
  } | null> {
    if (!db) {
      logger.error('Database not connected');
      return null;
    }

    try {
      const conversation = await this.findById(id);
      if (!conversation) {
        return null;
      }

      // Get associated sports center if exists
      const sportsCenter = await db
        .selectFrom('sports_centers')
        .selectAll()
        .where('conversation_id', '=', id)
        .executeTakeFirst();

      return {
        conversation,
        sportsCenter: sportsCenter ?? null,
      };
    } catch (error) {
      logger.error({ error, id }, 'Failed to find conversation with sports center');
      throw error;
    }
  },
};

// Message repository
export const messageRepository = {
  async create(data: NewMessage): Promise<Message | null> {
    if (!db) {
      logger.error('Database not connected');
      return null;
    }

    try {
      const result = await db
        .insertInto('messages')
        .values(data)
        .returningAll()
        .executeTakeFirst();

      logger.info(
        { messageId: result?.id, conversationId: data.conversation_id, role: data.role },
        'Message created'
      );
      return result ?? null;
    } catch (error) {
      logger.error({ error, data }, 'Failed to create message');
      throw error;
    }
  },

  async findByConversationId(conversationId: string): Promise<Message[]> {
    if (!db) {
      logger.error('Database not connected');
      return [];
    }

    try {
      const results = await db
        .selectFrom('messages')
        .selectAll()
        .where('conversation_id', '=', conversationId)
        .orderBy('created_at', 'asc')
        .execute();

      return results;
    } catch (error) {
      logger.error({ error, conversationId }, 'Failed to find messages');
      throw error;
    }
  },
};
