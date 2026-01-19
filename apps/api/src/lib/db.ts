import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { Database } from './db-types';

const connectionString = process.env.DATABASE_URL;

// Determine if SSL should be used (Cloud SQL requires it)
const useSSL = connectionString?.includes('34.175.254.108') || // Cloud SQL IP
               connectionString?.includes('sslmode=');

// Create pool only if DATABASE_URL is provided
const pool = connectionString
  ? new Pool({
      connectionString: connectionString.replace(/\?sslmode=[^&]+/, ''), // Remove sslmode from URL
      max: 20, // Maximum connections in pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: useSSL ? { rejectUnauthorized: false } : false,
    })
  : null;

// Create Kysely instance only if pool exists
export const db = pool
  ? new Kysely<Database>({
      dialect: new PostgresDialect({
        pool,
      }),
    })
  : null;

export async function checkDatabaseConnection(): Promise<boolean> {
  if (!pool) {
    return false;
  }

  try {
    const result = await pool.query('SELECT 1 as connected');
    return result.rows[0]?.connected === 1;
  } catch {
    return false;
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  if (db) {
    await db.destroy();
  }
}

export { pool };
