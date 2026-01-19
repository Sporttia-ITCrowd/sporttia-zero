/**
 * Sporttia MySQL Database Connection
 * Direct connection to Sporttia database for ZeroService operations
 */

import mysql from 'mysql2/promise';
import { createLogger } from './logger';

const logger = createLogger('sporttia-db');

let pool: mysql.Pool | null = null;

/**
 * Get Sporttia database configuration from environment
 */
function getDbConfig(): mysql.PoolOptions {
  const host = process.env.SPORTTIA_DB_HOST;
  const port = process.env.SPORTTIA_DB_PORT;
  const user = process.env.SPORTTIA_DB_USER;
  const password = process.env.SPORTTIA_DB_PASSWORD;
  const database = process.env.SPORTTIA_DB_NAME;

  if (!host || !port || !user || !password || !database) {
    throw new Error('Sporttia database configuration is incomplete. Check SPORTTIA_DB_* environment variables.');
  }

  return {
    host,
    port: parseInt(port, 10),
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  };
}

/**
 * Get the Sporttia database connection pool
 */
export function getSporttiaPool(): mysql.Pool {
  if (!pool) {
    const config = getDbConfig();
    logger.info({ host: config.host, port: config.port, database: config.database }, 'Creating Sporttia MySQL connection pool');
    pool = mysql.createPool(config);
  }
  return pool;
}

/**
 * Get a connection from the pool
 */
export async function getSporttiaConnection(): Promise<mysql.PoolConnection> {
  const p = getSporttiaPool();
  return p.getConnection();
}

/**
 * Execute a query on the Sporttia database
 */
export async function query<T = unknown>(sql: string, params?: unknown[]): Promise<T> {
  const p = getSporttiaPool();
  const [rows] = await p.execute(sql, params);
  return rows as T;
}

/**
 * Close the connection pool
 */
export async function closeSporttiaPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Sporttia MySQL connection pool closed');
  }
}

/**
 * Check if Sporttia database is available
 */
export async function isSporttiaDbAvailable(): Promise<boolean> {
  try {
    const p = getSporttiaPool();
    await p.execute('SELECT 1');
    return true;
  } catch (error) {
    logger.error({ error }, 'Sporttia database connection check failed');
    return false;
  }
}
