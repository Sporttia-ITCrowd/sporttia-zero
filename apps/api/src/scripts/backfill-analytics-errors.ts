/**
 * One-time script to backfill analytics_events with historical errors from conversations
 * Run with: npx tsx src/scripts/backfill-analytics-errors.ts
 */

import 'dotenv/config';
import { db } from '../lib/db';
import { createLogger } from '../lib/logger';

const logger = createLogger('backfill-analytics-errors');

async function backfillAnalyticsErrors() {
  if (!db) {
    console.error('Database not connected');
    process.exit(1);
  }

  console.log('Starting backfill of analytics errors from conversations...');

  try {
    // Find all conversations with errors in collected_data
    const conversationsWithErrors = await db
      .selectFrom('conversations')
      .select(['id', 'collected_data', 'created_at', 'updated_at'])
      .where('collected_data', 'is not', null)
      .execute();

    let errorCount = 0;
    let skippedCount = 0;

    for (const conv of conversationsWithErrors) {
      const collectedData = conv.collected_data as {
        lastError?: {
          code: string;
          message: string;
          timestamp?: string;
          retryCount?: number;
        };
      } | null;

      if (!collectedData?.lastError) {
        continue;
      }

      const { lastError } = collectedData;

      // Check if this error already exists in analytics_events
      const existingEvent = await db
        .selectFrom('analytics_events')
        .select('id')
        .where('conversation_id', '=', conv.id)
        .where('event_type', '=', 'internal_error')
        .executeTakeFirst();

      if (existingEvent) {
        skippedCount++;
        continue;
      }

      // Determine error type based on error code
      let eventType = 'internal_error';
      if (lastError.code.includes('SPORTTIA') || lastError.code.includes('API')) {
        eventType = 'sporttia_api_error';
      } else if (lastError.code.includes('AI') || lastError.code.includes('OPENAI')) {
        eventType = 'openai_api_error';
      } else if (lastError.code.includes('EMAIL')) {
        eventType = 'email_failed';
      } else if (lastError.code.includes('VALIDATION') || lastError.code === 'INCOMPLETE_DATA') {
        eventType = 'validation_error';
      }

      // Insert into analytics_events
      await db
        .insertInto('analytics_events')
        .values({
          conversation_id: conv.id,
          event_type: eventType,
          event_data: {
            message: lastError.message,
            code: lastError.code,
            retryCount: lastError.retryCount,
            backfilled: true,
          },
          created_at: lastError.timestamp ? new Date(lastError.timestamp) : conv.updated_at,
        })
        .execute();

      errorCount++;
      console.log(`  Backfilled error for conversation ${conv.id}: ${lastError.code}`);
    }

    console.log(`\nBackfill complete:`);
    console.log(`  - Errors backfilled: ${errorCount}`);
    console.log(`  - Already existed (skipped): ${skippedCount}`);

  } catch (error) {
    console.error('Error during backfill:', error);
    process.exit(1);
  }

  process.exit(0);
}

backfillAnalyticsErrors();
