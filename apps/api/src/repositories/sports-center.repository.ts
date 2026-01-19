import { db } from '../lib/db';
import type { SportsCenter, NewSportsCenter } from '../lib/db-types';
import { createLogger } from '../lib/logger';

const logger = createLogger('sports-center-repository');

export const sportsCenterRepository = {
  async create(data: NewSportsCenter): Promise<SportsCenter | null> {
    if (!db) {
      logger.error('Database not connected');
      return null;
    }

    try {
      const result = await db
        .insertInto('sports_centers')
        .values(data)
        .returningAll()
        .executeTakeFirst();

      logger.info(
        { sportsCenterId: result?.id, sporttiaId: result?.sporttia_id },
        'Sports center record created'
      );
      return result ?? null;
    } catch (error) {
      logger.error({ error, data }, 'Failed to create sports center record');
      throw error;
    }
  },

  async findById(id: string): Promise<SportsCenter | null> {
    if (!db) {
      logger.error('Database not connected');
      return null;
    }

    try {
      const result = await db
        .selectFrom('sports_centers')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      return result ?? null;
    } catch (error) {
      logger.error({ error, id }, 'Failed to find sports center');
      throw error;
    }
  },

  async findByConversationId(conversationId: string): Promise<SportsCenter | null> {
    if (!db) {
      logger.error('Database not connected');
      return null;
    }

    try {
      const result = await db
        .selectFrom('sports_centers')
        .selectAll()
        .where('conversation_id', '=', conversationId)
        .executeTakeFirst();

      return result ?? null;
    } catch (error) {
      logger.error({ error, conversationId }, 'Failed to find sports center by conversation');
      throw error;
    }
  },

  async findBySporttiaId(sporttiaId: number): Promise<SportsCenter | null> {
    if (!db) {
      logger.error('Database not connected');
      return null;
    }

    try {
      const result = await db
        .selectFrom('sports_centers')
        .selectAll()
        .where('sporttia_id', '=', sporttiaId)
        .executeTakeFirst();

      return result ?? null;
    } catch (error) {
      logger.error({ error, sporttiaId }, 'Failed to find sports center by Sporttia ID');
      throw error;
    }
  },
};
