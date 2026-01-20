import {
  SporttiaApiSport,
  SporttiaApiSportsResponse,
  SporttiaApiCreateSportsCenterRequest,
  SporttiaApiCreateSportsCenterResponse,
  SporttiaApiError,
  SporttiaApiLoginRequest,
  SporttiaApiLoginResponse,
  ZeroServiceCreateRequest,
  ZeroServiceCreateResponse,
} from '@sporttia-zero/shared';
import { createLogger } from './logger';
import { createSportsCenter as createSportsCenterInDb, ZeroServiceError } from '../services/zero.service';

const logger = createLogger('sporttia-client');

// Cache for sports list
interface SportsCache {
  data: SporttiaApiSport[];
  timestamp: number;
}

let sportsCache: SportsCache | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Custom error class for Sporttia API errors
 */
export class SporttiaApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'SporttiaApiClientError';
  }
}

/**
 * Get the Sporttia API base URL from environment
 */
function getBaseUrl(): string {
  const url = process.env.SPORTTIA_API_URL;
  if (!url) {
    throw new Error('SPORTTIA_API_URL environment variable is not set');
  }
  return url;
}

/**
 * Make an HTTP request to the Sporttia API
 */
async function makeRequest<T>(
  method: 'GET' | 'POST',
  endpoint: string,
  body?: unknown,
  timeoutMs: number = 10000
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  const startTime = Date.now();

  logger.info(
    { method, endpoint, url },
    `Sporttia API request: ${method} ${endpoint}`
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    const responseData = await response.json();

    if (!response.ok) {
      const error = responseData as SporttiaApiError;
      logger.error(
        {
          method,
          endpoint,
          statusCode: response.status,
          error: error.message,
          duration,
        },
        `Sporttia API error: ${response.status} ${error.message}`
      );

      throw new SporttiaApiClientError(
        error.message || `HTTP ${response.status}`,
        response.status,
        error.code || 'SPORTTIA_API_ERROR',
        error.details
      );
    }

    logger.info(
      { method, endpoint, statusCode: response.status, duration, responseKeys: Object.keys(responseData as object) },
      `Sporttia API response: ${response.status} (${duration}ms)`
    );

    return responseData as T;
  } catch (error) {
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    if (error instanceof SporttiaApiClientError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        logger.error(
          { method, endpoint, duration, timeoutMs },
          `Sporttia API timeout after ${timeoutMs}ms`
        );
        throw new SporttiaApiClientError(
          `Request timeout after ${timeoutMs}ms`,
          408,
          'TIMEOUT'
        );
      }

      logger.error(
        { method, endpoint, error: error.message, duration },
        `Sporttia API network error: ${error.message}`
      );
      throw new SporttiaApiClientError(
        `Network error: ${error.message}`,
        0,
        'NETWORK_ERROR'
      );
    }

    throw new SporttiaApiClientError(
      'Unknown error occurred',
      0,
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Fetch available sports from Sporttia API
 * Results are cached for 1 hour to reduce API calls
 */
export async function getSports(): Promise<SporttiaApiSport[]> {
  // Check cache
  if (sportsCache && Date.now() - sportsCache.timestamp < CACHE_TTL_MS) {
    logger.debug('Returning cached sports list');
    return sportsCache.data;
  }

  logger.info('Fetching sports list from Sporttia API');

  const response = await makeRequest<SporttiaApiSportsResponse>(
    'GET',
    '/sports?rows=100'
  );

  // Update cache
  sportsCache = {
    data: response.rows,
    timestamp: Date.now(),
  };

  logger.info(
    { count: response.rows.length },
    `Cached ${response.rows.length} sports`
  );

  return response.rows;
}

/**
 * Create a new sports center via Sporttia API
 */
export async function createSportsCenter(
  data: SporttiaApiCreateSportsCenterRequest
): Promise<SporttiaApiCreateSportsCenterResponse> {
  logger.info(
    {
      name: data.name,
      city: data.city,
      adminEmail: data.adminEmail,
      facilitiesCount: data.facilities.length,
    },
    'Creating sports center via Sporttia API'
  );

  const response = await makeRequest<SporttiaApiCreateSportsCenterResponse>(
    'POST',
    '/zeros/sportcenters',
    data,
    30000 // 30 second timeout for creation
  );

  logger.info(
    { sporttiaId: response.id, name: response.name },
    'Sports center created successfully'
  );

  return response;
}

/**
 * Clear the sports cache (useful for testing)
 */
export function clearSportsCache(): void {
  sportsCache = null;
  logger.debug('Sports cache cleared');
}

/**
 * Get cache status (useful for monitoring)
 */
export function getSportsCacheStatus(): {
  isCached: boolean;
  age: number | null;
  ttlRemaining: number | null;
} {
  if (!sportsCache) {
    return { isCached: false, age: null, ttlRemaining: null };
  }

  const age = Date.now() - sportsCache.timestamp;
  const ttlRemaining = Math.max(0, CACHE_TTL_MS - age);

  return {
    isCached: true,
    age,
    ttlRemaining,
  };
}

/**
 * Authenticate a user via Sporttia API
 * Used for admin dashboard login
 */
export async function login(
  credentials: SporttiaApiLoginRequest
): Promise<SporttiaApiLoginResponse> {
  logger.info(
    { login: credentials.login },
    'Authenticating user via Sporttia API'
  );

  const response = await makeRequest<SporttiaApiLoginResponse>(
    'POST',
    '/login',
    credentials,
    15000 // 15 second timeout for login
  );

  logger.info(
    {
      userId: response.user.id,
      privilege: response.user.privilege,
    },
    'User authenticated successfully'
  );

  return response;
}

// ============================================================================
// ZeroService Functions (for direct sports center creation in Sporttia DB)
// ============================================================================

/**
 * Create a new sports center via ZeroService
 * This creates the sports center directly in the Sporttia database with all related entities
 * Uses local database connection (not external API)
 */
export async function createSportsCenterViaZeroService(
  data: ZeroServiceCreateRequest
): Promise<ZeroServiceCreateResponse> {
  logger.info(
    {
      name: data.sportcenter.name,
      city: data.sportcenter.city.name,
      province: data.sportcenter.city.province.name,
      adminEmail: data.admin.email,
      facilitiesCount: data.facilities.length,
      language: data.language,
    },
    'Creating sports center via ZeroService (local database)'
  );

  try {
    const response = await createSportsCenterInDb(data);

    logger.info(
      {
        sportcenterId: response.sportcenterId,
        adminId: response.adminId,
        adminLogin: response.adminLogin,
        facilitiesCreated: response.facilities.length,
      },
      'Sports center created successfully via ZeroService'
    );

    return response;
  } catch (error) {
    if (error instanceof ZeroServiceError) {
      logger.error(
        {
          code: error.code,
          message: error.message,
          isRetryable: error.isRetryable,
        },
        'ZeroService error during sports center creation'
      );
      throw new SporttiaApiClientError(
        error.message,
        500,
        error.code
      );
    }
    throw error;
  }
}
