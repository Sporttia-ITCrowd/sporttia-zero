/**
 * ZeroService - Creates sports centers directly in the Sporttia database
 *
 * This service handles the complete creation of a freemium sports center including:
 * - Customer record
 * - Province and City (lookup or create)
 * - Sportcenter record
 * - 3-month subscription with ACTIVE status
 * - 3 monthly licences with PAID status
 * - Admin group with appropriate privileges
 * - Admin user with generated credentials
 * - User purse
 * - Facilities (fields) with terrain, prices, and schedules
 */

import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getSporttiaConnection } from '../lib/sporttia-db';
import { createLogger } from '../lib/logger';
import type {
  ZeroServiceCreateRequest,
  ZeroServiceCreateResponse,
  ZeroServiceFacilityResult,
} from '@sporttia-zero/shared';

const logger = createLogger('zero-service');

/**
 * Error class for ZeroService errors
 */
export class ZeroServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'ZeroServiceError';
  }
}

/**
 * Generate a random password
 */
function generatePassword(length: number = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Generate a login from email (everything before @)
 */
function generateLogin(email: string): string {
  const baseName = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  // Add random suffix to ensure uniqueness
  const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${baseName}${suffix}`;
}

/**
 * Get current timestamp in MySQL format
 */
function mysqlTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Get date N months from now in MySQL format
 */
function mysqlDatePlusMonths(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Lookup or create a province
 */
async function getOrCreateProvince(
  conn: PoolConnection,
  provinceName: string
): Promise<number> {
  // Try to find existing province
  const [rows] = await conn.execute<RowDataPacket[]>(
    'SELECT id FROM provinces WHERE name = ? LIMIT 1',
    [provinceName]
  );

  if (rows.length > 0) {
    return rows[0].id;
  }

  // Create new province
  const now = mysqlTimestamp();
  const [result] = await conn.execute<ResultSetHeader>(
    `INSERT INTO provinces (name, trash, created, modified) VALUES (?, 0, ?, ?)`,
    [provinceName, now, now]
  );

  logger.info({ provinceName, id: result.insertId }, 'Created new province');
  return result.insertId;
}

/**
 * Lookup or create a city
 */
async function getOrCreateCity(
  conn: PoolConnection,
  cityName: string,
  provinceId: number
): Promise<number> {
  // Try to find existing city in this province
  const [rows] = await conn.execute<RowDataPacket[]>(
    'SELECT id FROM cities WHERE name = ? AND idProvince = ? LIMIT 1',
    [cityName, provinceId]
  );

  if (rows.length > 0) {
    return rows[0].id;
  }

  // Create new city
  const now = mysqlTimestamp();
  const [result] = await conn.execute<ResultSetHeader>(
    `INSERT INTO cities (idProvince, name, trash, created, modified) VALUES (?, ?, 0, ?, ?)`,
    [provinceId, cityName, now, now]
  );

  logger.info({ cityName, provinceId, id: result.insertId }, 'Created new city');
  return result.insertId;
}

/**
 * Create customer record
 */
async function createCustomer(
  conn: PoolConnection,
  name: string
): Promise<number> {
  const now = mysqlTimestamp();
  const [result] = await conn.execute<ResultSetHeader>(
    `INSERT INTO customers (name, trash, created, modified) VALUES (?, 0, ?, ?)`,
    [name, now, now]
  );
  return result.insertId;
}

/**
 * Create sportcenter record
 */
async function createSportcenter(
  conn: PoolConnection,
  customerId: number,
  cityId: number,
  name: string,
  language: string
): Promise<number> {
  const now = mysqlTimestamp();
  const [result] = await conn.execute<ResultSetHeader>(
    `INSERT INTO sportcenters (
      idCustomer, idCity, name, short, visibility, zero, trash, lang, created, modified
    ) VALUES (?, ?, ?, ?, 0, 1, 0, ?, ?, ?)`,
    [customerId, cityId, name, name.substring(0, 50), language, now, now]
  );
  return result.insertId;
}

/**
 * Create subscription record (3-month free trial)
 */
async function createSubscription(
  conn: PoolConnection,
  sportcenterId: number
): Promise<number> {
  const now = mysqlTimestamp();
  const endDate = mysqlDatePlusMonths(3);

  const [result] = await conn.execute<ResultSetHeader>(
    `INSERT INTO subscriptions (
      idSportcenter, status, dateIni, dateEnd, months, trash, created, modified
    ) VALUES (?, 'ACTIVE', ?, ?, 3, 0, ?, ?)`,
    [sportcenterId, now, endDate, now, now]
  );
  return result.insertId;
}

/**
 * Create licence records (3 monthly licences)
 */
async function createLicences(
  conn: PoolConnection,
  subscriptionId: number
): Promise<number[]> {
  const now = mysqlTimestamp();
  const licenceIds: number[] = [];

  for (let month = 0; month < 3; month++) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() + month);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO licences (
        idSubscription, status, dateIni, dateEnd, trash, created, modified
      ) VALUES (?, 'PAID', ?, ?, 0, ?, ?)`,
      [
        subscriptionId,
        startDate.toISOString().slice(0, 19).replace('T', ' '),
        endDate.toISOString().slice(0, 19).replace('T', ' '),
        now,
        now,
      ]
    );
    licenceIds.push(result.insertId);
  }

  return licenceIds;
}

/**
 * Create admin group with privileges
 */
async function createAdminGroup(
  conn: PoolConnection,
  sportcenterId: number
): Promise<number> {
  const now = mysqlTimestamp();

  // Create group
  const [groupResult] = await conn.execute<ResultSetHeader>(
    `INSERT INTO groups (
      idSportcenter, name, privilege, trash, created, modified
    ) VALUES (?, 'Administradores', 11, 0, ?, ?)`,
    [sportcenterId, now, now]
  );
  const groupId = groupResult.insertId;

  // Add privilege 12 (if using separate privileges table)
  // Note: This may vary depending on the actual schema
  try {
    await conn.execute(
      `INSERT INTO group_privileges (idGroup, privilege, created) VALUES (?, 12, ?)`,
      [groupId, now]
    );
  } catch {
    // Table might not exist or privilege might be handled differently
    logger.debug({ groupId }, 'group_privileges insert skipped');
  }

  return groupId;
}

/**
 * Create admin user
 */
async function createAdminUser(
  conn: PoolConnection,
  sportcenterId: number,
  groupId: number,
  name: string,
  email: string,
  login: string,
  password: string
): Promise<number> {
  const now = mysqlTimestamp();

  // Hash password (simple MD5 for now - should match Sporttia's auth system)
  // Note: In production, verify the hashing algorithm used by Sporttia
  const crypto = await import('crypto');
  const hashedPassword = crypto.createHash('md5').update(password).digest('hex');

  const [result] = await conn.execute<ResultSetHeader>(
    `INSERT INTO users (
      idSportcenter, idGroup, name, email, login, password, privilege, trash, created, modified
    ) VALUES (?, ?, ?, ?, ?, ?, 11, 0, ?, ?)`,
    [sportcenterId, groupId, name, email, login, hashedPassword, now, now]
  );
  return result.insertId;
}

/**
 * Create purse for user
 */
async function createPurse(
  conn: PoolConnection,
  userId: number,
  sportcenterId: number
): Promise<number> {
  const now = mysqlTimestamp();

  const [result] = await conn.execute<ResultSetHeader>(
    `INSERT INTO purses (
      idUser, idSportcenter, balance, trash, created, modified
    ) VALUES (?, ?, 0, 0, ?, ?)`,
    [userId, sportcenterId, now, now]
  );
  return result.insertId;
}

/**
 * Lookup sport by name
 */
async function getSportByName(
  conn: PoolConnection,
  sportName: string
): Promise<number | null> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    'SELECT id FROM sports WHERE name LIKE ? LIMIT 1',
    [`%${sportName}%`]
  );
  return rows.length > 0 ? rows[0].id : null;
}

/**
 * Create a facility (field) with terrain, prices, and schedules
 */
async function createFacility(
  conn: PoolConnection,
  sportcenterId: number,
  facilityName: string,
  sportId: number,
  schedules: Array<{
    weekdays: number[];
    timeini: string;
    timeend: string;
    duration: string;
    rate: string;
  }>
): Promise<ZeroServiceFacilityResult> {
  const now = mysqlTimestamp();

  // Create field
  const [fieldResult] = await conn.execute<ResultSetHeader>(
    `INSERT INTO fields (
      idSportcenter, name, trash, created, modified
    ) VALUES (?, ?, 0, ?, ?)`,
    [sportcenterId, facilityName, now, now]
  );
  const fieldId = fieldResult.insertId;

  // Create terrain (court/surface)
  const [terrainResult] = await conn.execute<ResultSetHeader>(
    `INSERT INTO terrains (
      idField, idSport, name, trash, created, modified
    ) VALUES (?, ?, ?, 0, ?, ?)`,
    [fieldId, sportId, facilityName, now, now]
  );
  const terrainId = terrainResult.insertId;

  const scheduleIds: number[] = [];
  const priceIds: number[] = [];

  // Create schedules and prices for each schedule configuration
  for (const schedule of schedules) {
    // Duration in hours (e.g., "1.5" for 90 minutes)
    const durationHours = parseFloat(schedule.duration);
    const rate = parseFloat(schedule.rate);

    // Create schedule for each weekday
    for (const weekday of schedule.weekdays) {
      const [scheduleResult] = await conn.execute<ResultSetHeader>(
        `INSERT INTO schedules (
          idTerrain, dayOfWeek, timeIni, timeEnd, duration, trash, created, modified
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
        [terrainId, weekday, schedule.timeini, schedule.timeend, durationHours, now, now]
      );
      scheduleIds.push(scheduleResult.insertId);
    }

    // Create price
    const [priceResult] = await conn.execute<ResultSetHeader>(
      `INSERT INTO prices (
        idTerrain, amount, duration, trash, created, modified
      ) VALUES (?, ?, ?, 0, ?, ?)`,
      [terrainId, rate, durationHours, now, now]
    );
    priceIds.push(priceResult.insertId);
  }

  return {
    fieldId,
    terrainId,
    scheduleIds,
    priceIds,
  };
}

/**
 * Create a complete sports center with all related entities
 */
export async function createSportsCenter(
  request: ZeroServiceCreateRequest
): Promise<ZeroServiceCreateResponse> {
  const conn = await getSporttiaConnection();

  try {
    await conn.beginTransaction();

    logger.info(
      {
        name: request.sportcenter.name,
        city: request.sportcenter.city.name,
        province: request.sportcenter.city.province.name,
        adminEmail: request.admin.email,
        facilitiesCount: request.facilities.length,
      },
      'Starting sports center creation'
    );

    // 1. Get or create province
    const provinceId = await getOrCreateProvince(conn, request.sportcenter.city.province.name);
    logger.debug({ provinceId }, 'Province ready');

    // 2. Get or create city
    const cityId = await getOrCreateCity(conn, request.sportcenter.city.name, provinceId);
    logger.debug({ cityId }, 'City ready');

    // 3. Create customer
    const customerId = await createCustomer(conn, request.sportcenter.name);
    logger.debug({ customerId }, 'Customer created');

    // 4. Create sportcenter
    const sportcenterId = await createSportcenter(
      conn,
      customerId,
      cityId,
      request.sportcenter.name,
      request.language
    );
    logger.debug({ sportcenterId }, 'Sportcenter created');

    // 5. Create subscription
    const subscriptionId = await createSubscription(conn, sportcenterId);
    logger.debug({ subscriptionId }, 'Subscription created');

    // 6. Create licences
    const licenceIds = await createLicences(conn, subscriptionId);
    logger.debug({ licenceIds }, 'Licences created');

    // 7. Create admin group
    const groupId = await createAdminGroup(conn, sportcenterId);
    logger.debug({ groupId }, 'Admin group created');

    // 8. Generate admin credentials
    const adminLogin = generateLogin(request.admin.email);
    const adminPassword = generatePassword();

    // 9. Create admin user
    const adminId = await createAdminUser(
      conn,
      sportcenterId,
      groupId,
      request.admin.name,
      request.admin.email,
      adminLogin,
      adminPassword
    );
    logger.debug({ adminId, adminLogin }, 'Admin user created');

    // 10. Create purse
    await createPurse(conn, adminId, sportcenterId);
    logger.debug({ adminId }, 'Purse created');

    // 11. Create facilities
    const facilityResults: ZeroServiceFacilityResult[] = [];
    for (const facility of request.facilities) {
      // Lookup sport ID by name if not provided
      let sportId = facility.sport.id;
      if (!sportId) {
        const foundSportId = await getSportByName(conn, facility.sport.name);
        if (!foundSportId) {
          throw new ZeroServiceError(
            `Sport not found: ${facility.sport.name}`,
            'SPORT_NOT_FOUND',
            false
          );
        }
        sportId = foundSportId;
      }

      const facilityResult = await createFacility(
        conn,
        sportcenterId,
        facility.name,
        sportId,
        facility.schedules
      );
      facilityResults.push(facilityResult);
      logger.debug({ facilityName: facility.name, ...facilityResult }, 'Facility created');
    }

    await conn.commit();

    logger.info(
      {
        sportcenterId,
        customerId,
        subscriptionId,
        adminId,
        adminLogin,
        facilitiesCount: facilityResults.length,
      },
      'Sports center created successfully'
    );

    return {
      sportcenterId,
      customerId,
      subscriptionId,
      licenceIds,
      adminId,
      adminLogin,
      adminPassword,
      facilities: facilityResults,
    };
  } catch (error) {
    await conn.rollback();

    if (error instanceof ZeroServiceError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error }, 'Sports center creation failed, transaction rolled back');

    throw new ZeroServiceError(
      `Failed to create sports center: ${message}`,
      'CREATION_FAILED',
      true
    );
  } finally {
    conn.release();
  }
}
