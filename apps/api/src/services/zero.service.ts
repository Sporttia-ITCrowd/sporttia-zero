/**
 * ZeroService - Creates sports centers directly in the Sporttia database
 *
 * This service handles the complete creation of a freemium sports center including:
 * - Customer record (type: CLUB)
 * - Province and City (lookup or create)
 * - Sportcenter record with zero flag
 * - 3-month subscription with ACTIVE status
 * - 3 monthly licences with PAID status and FREE payment form
 * - Admin group with SC_ADMIN type and privileges 11, 12
 * - Admin user with SPORTCENTER role
 * - User-group association
 * - User purse
 * - Facilities (fields) with terrain, prices, schedules, and slots
 *
 * Based on the original Sporttia ZeroService implementation.
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

// Constants matching Sporttia's constants
const SPORTCENTER_STATUS = {
  ACTIVE: 'ACTIVE',
};

const GROUP_TYPES = {
  SC_ADMIN: 'SC_ADMIN',
};

const GROUP_STATUS = {
  ACTIVE: 'ACTIVE',
};

const USER_ROLES = {
  SPORTCENTER: 'SPORTCENTER',
};

const USER_STATUS = {
  ACTIVE: 'ACTIVE',
};

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
 * Generate a random password (8 characters)
 */
function generatePassword(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Generate a login from sportcenter name (sanitized, lowercase, with random suffix)
 */
function generateLoginByName(sportcenterName: string): string {
  const baseName = sportcenterName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]/g, '') // Keep only alphanumeric
    .substring(0, 12);
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
 * Get date in MySQL date format (YYYY-MM-DD)
 */
function mysqlDate(date: Date): string {
  return date.toISOString().split('T')[0];
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
    'SELECT id FROM province WHERE name = ? LIMIT 1',
    [provinceName]
  );

  if (rows.length > 0) {
    return rows[0].id;
  }

  // Create new province
  const [result] = await conn.execute<ResultSetHeader>(
    `INSERT INTO province (name) VALUES (?)`,
    [provinceName]
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
    'SELECT id FROM city WHERE name = ? AND province = ? LIMIT 1',
    [cityName, provinceId]
  );

  if (rows.length > 0) {
    return rows[0].id;
  }

  // Create new city
  const [result] = await conn.execute<ResultSetHeader>(
    `INSERT INTO city (province, name) VALUES (?, ?)`,
    [provinceId, cityName]
  );

  logger.info({ cityName, provinceId, id: result.insertId }, 'Created new city');
  return result.insertId;
}

/**
 * Create customer record
 */
async function createCustomer(conn: PoolConnection, name: string): Promise<number> {
  const [result] = await conn.execute<ResultSetHeader>(
    `INSERT INTO customer (name, type) VALUES (?, 'CLUB')`,
    [name]
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
  const [result] = await conn.execute<ResultSetHeader>(
    `INSERT INTO sportcenter (
      name, short, renting, status, visible, mod_purse, language,
      visible_phone, visible_email, customer_id, city_id, zero
    ) VALUES (?, ?, 1, ?, 0, 1, ?, '', '', ?, ?, 1)`,
    [name, name.substring(0, 50), SPORTCENTER_STATUS.ACTIVE, language, customerId, cityId]
  );
  return result.insertId;
}

/**
 * Create subscription record (3-month free trial)
 */
async function createSubscription(conn: PoolConnection, customerId: number): Promise<number> {
  const now = new Date();
  const dateend = new Date(now);
  dateend.setMonth(dateend.getMonth() + 3);

  const nowStr = mysqlTimestamp();
  const [result] = await conn.execute<ResultSetHeader>(
    `INSERT INTO subscription (
      customer_id, status, dateini, dateend, fee_interval, fee_price, complete
    ) VALUES (?, 'ACTIVE', ?, ?, '0000-01-00 00:00:00', 0.0, 1)`,
    [customerId, nowStr, mysqlTimestamp()]
  );
  return result.insertId;
}

/**
 * Create licence records (3 monthly licences)
 */
async function createLicences(conn: PoolConnection, subscriptionId: number): Promise<number[]> {
  const now = new Date();
  const licenceIds: number[] = [];

  for (let i = 0; i < 3; i++) {
    const ini = new Date(now);
    ini.setMonth(ini.getMonth() + i);

    const end = new Date(ini);
    end.setMonth(end.getMonth() + 1);

    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO licence (
        subscription_id, ini, end, status, payment_form, price
      ) VALUES (?, ?, ?, 'PAID', 'FREE', 0.0)`,
      [subscriptionId, mysqlDate(ini), mysqlDate(end)]
    );
    licenceIds.push(result.insertId);
  }

  return licenceIds;
}

/**
 * Create admin group with privileges
 */
async function createAdminGroup(conn: PoolConnection, sportcenterId: number): Promise<number> {
  // Create group (groups is a reserved word in MySQL, so we use backticks)
  const [groupResult] = await conn.execute<ResultSetHeader>(
    'INSERT INTO `groups` (name, sportcenter_id, type, status) VALUES (\'Administradores\', ?, ?, ?)',
    [sportcenterId, GROUP_TYPES.SC_ADMIN, GROUP_STATUS.ACTIVE]
  );
  const groupId = groupResult.insertId;

  // Add privileges 11 and 12
  try {
    await conn.execute(
      'INSERT INTO groups_privilege (groups_id, privilege_id) VALUES (?, 11)',
      [groupId]
    );
    await conn.execute(
      'INSERT INTO groups_privilege (groups_id, privilege_id) VALUES (?, 12)',
      [groupId]
    );
  } catch {
    // Table might not exist or have different structure
    logger.debug({ groupId }, 'groups_privilege insert skipped');
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
  password: string,
  language: string
): Promise<number> {
  // Hash password with MD5 (matches Sporttia's auth system)
  const crypto = await import('crypto');
  const hashedPassword = crypto.createHash('md5').update(password).digest('hex');

  const [result] = await conn.execute<ResultSetHeader>(
    `INSERT INTO user (
      login, name, email, password, privileges, sportcenter_id, default_sc, status, language
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [login, name, email, hashedPassword, USER_ROLES.SPORTCENTER, sportcenterId, sportcenterId, USER_STATUS.ACTIVE, language]
  );
  const userId = result.insertId;

  // Associate user with group
  await conn.execute(
    `INSERT INTO user_groups (groups_id, user_id, status) VALUES (?, ?, 'ON')`,
    [groupId, userId]
  );

  return userId;
}

/**
 * Create purse for user
 */
async function createPurse(
  conn: PoolConnection,
  userId: number,
  sportcenterId: number,
  name: string,
  email: string
): Promise<number> {
  const [result] = await conn.execute<ResultSetHeader>(
    `INSERT INTO purse (
      user_id, sportcenter_id, name, email
    ) VALUES (?, ?, ?, ?)`,
    [userId, sportcenterId, name, email]
  );
  return result.insertId;
}

/**
 * Lookup sport by name
 */
async function getSportByName(conn: PoolConnection, sportName: string): Promise<number | null> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    'SELECT id FROM sports WHERE name = ? LIMIT 1',
    [sportName]
  );
  return rows.length > 0 ? rows[0].id : null;
}

/**
 * Create a facility (field) with terrain, price, schedule, and slots
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

  // 1. Create field
  const [fieldResult] = await conn.execute<ResultSetHeader>(
    `INSERT INTO field (
      name, sportcenter_id, type_id, status, deleted
    ) VALUES (?, ?, ?, 'ACTIVE', 0)`,
    [facilityName, sportcenterId, sportId]
  );
  const fieldId = fieldResult.insertId;

  // 2. Create terrain
  const [terrainResult] = await conn.execute<ResultSetHeader>(
    `INSERT INTO terrain (
      description, status
    ) VALUES (?, 'OK')`,
    [facilityName]
  );
  const terrainId = terrainResult.insertId;

  // 3. Connect field with terrain
  await conn.execute(
    `INSERT INTO field_terrain (id_field, id_terrain) VALUES (?, ?)`,
    [fieldId, terrainId]
  );

  // 4. Create price (if schedules exist)
  let priceId: number | null = null;
  if (schedules && schedules.length > 0) {
    const firstSchedule = schedules[0];
    const duration = parseFloat(firstSchedule.duration);
    const rate = parseFloat(firstSchedule.rate);

    const [priceResult] = await conn.execute<ResultSetHeader>(
      `INSERT INTO price (
        name, duration1, price1, field_id, sportcenter_id, sc_owner_id,
        individual, light, position, deleted
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0)`,
      [facilityName, duration, rate, fieldId, sportcenterId, sportcenterId]
    );
    priceId = priceResult.insertId;
  }

  // 5. Create schedule (if schedules exist)
  let scheduleId: number | null = null;
  const slotIds: number[] = [];

  if (schedules && schedules.length > 0) {
    const minTime = parseFloat(schedules[0].duration);
    const currentYear = new Date().getFullYear();
    const dateini = `${currentYear}-01-01 00:00:00`;
    const dateend = `${currentYear + 1}-12-31 23:59:59`;

    const [scheduleResult] = await conn.execute<ResultSetHeader>(
      `INSERT INTO schedule (
        name, dateini, dateend, sportcenter_id, status, min_time, layer, num_periods, capacity, type,
        m_1, m_2, m_3, m_4, m_5, m_6, m_7, m_8, m_9, m_10, m_11, m_12,
        deleted
      ) VALUES (?, ?, ?, ?, 'ACTIVE', ?, 0, 0, 1, 'FREE', 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0)`,
      [facilityName, dateini, dateend, sportcenterId, minTime]
    );
    scheduleId = scheduleResult.insertId;

    // Connect schedule with field
    await conn.execute(
      `INSERT INTO schedule_field (schedule_id, field_id) VALUES (?, ?)`,
      [scheduleId, fieldId]
    );

    // 6. Create schedule slots for each schedule configuration
    for (const scheduleData of schedules) {
      const { timeini, timeend, weekdays } = scheduleData;

      // Convert weekdays to flags
      // weekdays in JSON: 1=Monday, 2=Tuesday, ..., 7=Sunday
      // In DB: wd_0=Sunday, wd_1=Monday, ..., wd_6=Saturday
      const weekdayFlags = {
        wd_0: weekdays.includes(7) ? 1 : 0,
        wd_1: weekdays.includes(1) ? 1 : 0,
        wd_2: weekdays.includes(2) ? 1 : 0,
        wd_3: weekdays.includes(3) ? 1 : 0,
        wd_4: weekdays.includes(4) ? 1 : 0,
        wd_5: weekdays.includes(5) ? 1 : 0,
        wd_6: weekdays.includes(6) ? 1 : 0,
      };

      const baseDate = '1970-01-01';
      const timeinitDatetime = `${baseDate} ${timeini}:00`;
      const timeendDatetime = `${baseDate} ${timeend}:00`;

      const [slotResult] = await conn.execute<ResultSetHeader>(
        `INSERT INTO schedule_slot (
          timeini, timeend, wd_0, wd_1, wd_2, wd_3, wd_4, wd_5, wd_6, schedule_id, deleted, created
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          timeinitDatetime,
          timeendDatetime,
          weekdayFlags.wd_0,
          weekdayFlags.wd_1,
          weekdayFlags.wd_2,
          weekdayFlags.wd_3,
          weekdayFlags.wd_4,
          weekdayFlags.wd_5,
          weekdayFlags.wd_6,
          scheduleId,
          now,
        ]
      );
      const slotId = slotResult.insertId;
      slotIds.push(slotId);

      // Connect slot with price
      if (priceId) {
        await conn.execute(
          `INSERT INTO schedule_slot_price (schedule_slot_id, price_id) VALUES (?, ?)`,
          [slotId, priceId]
        );
      }
    }
  }

  return {
    fieldId,
    priceId,
    scheduleId,
    slotIds,
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

    // 5. Create subscription (uses customerId, not sportcenterId)
    const subscriptionId = await createSubscription(conn, customerId);
    logger.debug({ subscriptionId }, 'Subscription created');

    // 6. Create licences
    const licenceIds = await createLicences(conn, subscriptionId);
    logger.debug({ licenceIds }, 'Licences created');

    // 7. Create admin group
    const groupId = await createAdminGroup(conn, sportcenterId);
    logger.debug({ groupId }, 'Admin group created');

    // 8. Generate admin credentials (login from sportcenter name)
    const adminLogin = generateLoginByName(request.sportcenter.name);
    const adminPassword = generatePassword(8);

    // 9. Create admin user
    const adminId = await createAdminUser(
      conn,
      sportcenterId,
      groupId,
      request.admin.name,
      request.admin.email,
      adminLogin,
      adminPassword,
      request.language
    );
    logger.debug({ adminId, adminLogin }, 'Admin user created');

    // 10. Create purse (with name and email)
    await createPurse(conn, adminId, sportcenterId, request.admin.name, request.admin.email);
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
    const sqlError = error as { code?: string; errno?: number; sqlState?: string; sqlMessage?: string; sql?: string };
    logger.error(
      {
        error,
        sqlCode: sqlError.code,
        sqlErrno: sqlError.errno,
        sqlState: sqlError.sqlState,
        sqlMessage: sqlError.sqlMessage,
        sql: sqlError.sql,
      },
      'Sports center creation failed, transaction rolled back'
    );

    throw new ZeroServiceError(
      `Failed to create sports center: ${message}`,
      'CREATION_FAILED',
      true
    );
  } finally {
    conn.release();
  }
}
