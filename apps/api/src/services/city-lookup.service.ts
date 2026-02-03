/**
 * City Lookup Service - Handles city name normalization and fuzzy matching
 *
 * This service provides intelligent city lookup that:
 * - Handles misspellings (e.g., "Madrd" → "Madrid")
 * - Normalizes city names (removes accents, handles case differences)
 * - Creates new cities with proper names when needed
 * - Connects cities to the appropriate country
 */

import type { PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { createLogger } from '../lib/logger';
import { getPlaceDetails, type PlaceCandidate } from './google-places.service';

const logger = createLogger('city-lookup');

/**
 * City lookup result
 */
export interface CityLookupResult {
  cityId: number;
  cityName: string;
  provinceId: number;
  provinceName: string;
  countryId?: number;
  countryName?: string;
  currency?: string; // Currency code from country (e.g., EUR, USD)
  wasCreated: boolean;
  originalInput: string;
  correctedName?: string; // Set if the name was corrected from a misspelling
}

/**
 * City match from fuzzy search
 */
interface CityMatch {
  cityId: number;
  cityName: string;
  provinceId: number;
  provinceName: string;
  countryId: number | null;
  countryCode: string | null;
  countryName: string | null;
  currency: string | null;
  distance: number;
  similarity: number;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity percentage between two strings (0-100)
 */
function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 100;
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 100;
  const distance = levenshteinDistance(a, b);
  return Math.round((1 - distance / maxLength) * 100);
}

/**
 * Normalize a city name for comparison
 * - Lowercase
 * - Remove accents
 * - Remove extra spaces
 */
export function normalizeCityName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find cities that match the given name using fuzzy search
 * Returns candidates sorted by similarity
 */
async function findCityCandidates(
  conn: PoolConnection,
  cityName: string,
  countryCode?: string,
  limit: number = 10
): Promise<CityMatch[]> {
  const normalizedInput = normalizeCityName(cityName);

  // Build query to search for similar cities
  // We use LIKE with wildcard to get initial candidates, then refine with Levenshtein
  const likePattern = `%${normalizedInput.substring(0, 3)}%`;

  let query = `
    SELECT
      c.id as cityId,
      c.name as cityName,
      p.id as provinceId,
      p.name as provinceName,
      co.id as countryId,
      co.code as countryCode,
      co.name as countryName,
      co.currency as currency
    FROM city c
    JOIN province p ON c.province = p.id
    LEFT JOIN country co ON c.country_id = co.id
    WHERE LOWER(c.name) LIKE ?
  `;

  const params: (string | number)[] = [likePattern];

  // Filter by country if provided
  if (countryCode) {
    query += ` AND co.code = ?`;
    params.push(countryCode.toUpperCase());
  }

  query += ` LIMIT 100`; // Get more candidates for fuzzy matching

  try {
    const [rows] = await conn.execute<RowDataPacket[]>(query, params);

    // Calculate similarity for each result
    const candidates: CityMatch[] = rows.map((row) => {
      const normalizedResult = normalizeCityName(row.cityName);
      const distance = levenshteinDistance(normalizedInput, normalizedResult);
      const similarity = calculateSimilarity(normalizedInput, normalizedResult);

      return {
        cityId: row.cityId,
        cityName: row.cityName,
        provinceId: row.provinceId,
        provinceName: row.provinceName,
        countryId: row.countryId,
        countryCode: row.countryCode,
        countryName: row.countryName,
        currency: row.currency,
        distance,
        similarity,
      };
    });

    // Sort by similarity (highest first) and take top results
    return candidates.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  } catch (error) {
    // If the query fails (e.g., country table doesn't exist), try without country join
    logger.debug({ error }, 'City search with country join failed, trying without');
    return findCityCandidatesWithoutCountry(conn, cityName, limit);
  }
}

/**
 * Fallback search without country table join
 */
async function findCityCandidatesWithoutCountry(
  conn: PoolConnection,
  cityName: string,
  limit: number = 10
): Promise<CityMatch[]> {
  const normalizedInput = normalizeCityName(cityName);
  const likePattern = `%${normalizedInput.substring(0, 3)}%`;

  const query = `
    SELECT
      c.id as cityId,
      c.name as cityName,
      p.id as provinceId,
      p.name as provinceName
    FROM city c
    JOIN province p ON c.province = p.id
    WHERE LOWER(c.name) LIKE ?
    LIMIT 100
  `;

  const [rows] = await conn.execute<RowDataPacket[]>(query, [likePattern]);

  const candidates: CityMatch[] = rows.map((row) => {
    const normalizedResult = normalizeCityName(row.cityName);
    const distance = levenshteinDistance(normalizedInput, normalizedResult);
    const similarity = calculateSimilarity(normalizedInput, normalizedResult);

    return {
      cityId: row.cityId,
      cityName: row.cityName,
      provinceId: row.provinceId,
      provinceName: row.provinceName,
      countryId: null,
      countryCode: null,
      countryName: null,
      currency: null,
      distance,
      similarity,
    };
  });

  return candidates.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
}

/**
 * Find the best matching city for the given input
 * Returns the city if found with high enough similarity, null otherwise
 */
async function findBestMatch(
  conn: PoolConnection,
  cityName: string,
  countryCode?: string,
  similarityThreshold: number = 75
): Promise<CityMatch | null> {
  const candidates = await findCityCandidates(conn, cityName, countryCode);

  if (candidates.length === 0) {
    return null;
  }

  const best = candidates[0];

  // Check if it's an exact match (normalized)
  if (best.similarity === 100) {
    logger.info({ cityName, matchedCity: best.cityName }, 'Exact city match found');
    return best;
  }

  // Check if similarity is above threshold
  if (best.similarity >= similarityThreshold) {
    logger.info(
      {
        input: cityName,
        matchedCity: best.cityName,
        similarity: best.similarity,
        distance: best.distance,
      },
      'Fuzzy city match found'
    );
    return best;
  }

  // If there's only one candidate with decent similarity, use it
  if (candidates.length === 1 && best.similarity >= 60) {
    logger.info(
      {
        input: cityName,
        matchedCity: best.cityName,
        similarity: best.similarity,
      },
      'Single candidate match accepted'
    );
    return best;
  }

  return null;
}

/**
 * Country result with currency
 */
interface CountryResult {
  id: number;
  name: string;
  currency?: string;
}

/**
 * Get or create a country, returning id, name, and currency
 */
async function getOrCreateCountryWithCurrency(
  conn: PoolConnection,
  countryCode: string,
  countryName?: string
): Promise<CountryResult> {
  const code = countryCode.toUpperCase();

  // Try to find existing country with currency
  const [rows] = await conn.execute<RowDataPacket[]>(
    'SELECT id, name, currency FROM country WHERE code = ? LIMIT 1',
    [code]
  );

  if (rows.length > 0) {
    return {
      id: rows[0].id,
      name: rows[0].name,
      currency: rows[0].currency || undefined,
    };
  }

  // Create new country
  // Use common country names if not provided
  const name = countryName || getCountryNameFromCode(code);
  const defaultCurrency = getDefaultCurrencyForCountry(code);

  const [result] = await conn.execute<ResultSetHeader>(
    'INSERT INTO country (code, name, currency) VALUES (?, ?, ?)',
    [code, name, defaultCurrency]
  );

  logger.info({ countryCode: code, name, currency: defaultCurrency, id: result.insertId }, 'Created new country');
  return {
    id: result.insertId,
    name,
    currency: defaultCurrency,
  };
}

/**
 * Get default currency for a country code
 */
export function getDefaultCurrencyForCountry(code: string): string {
  const currencies: Record<string, string> = {
    // Eurozone
    ES: 'EUR',
    PT: 'EUR',
    DE: 'EUR',
    FR: 'EUR',
    IT: 'EUR',
    NL: 'EUR',
    BE: 'EUR',
    AT: 'EUR',
    IE: 'EUR',
    FI: 'EUR',
    GR: 'EUR',
    // Non-Euro Europe
    GB: 'GBP',
    CH: 'CHF',
    SE: 'SEK',
    NO: 'NOK',
    DK: 'DKK',
    PL: 'PLN',
    CZ: 'CZK',
    HU: 'HUF',
    RO: 'RON',
    // Americas
    US: 'USD',
    CA: 'CAD',
    MX: 'MXN',
    AR: 'ARS',
    BR: 'BRL',
    CO: 'COP',
    CL: 'CLP',
    PE: 'PEN',
    VE: 'VES',
    EC: 'USD',
    BO: 'BOB',
    UY: 'UYU',
    PY: 'PYG',
    CR: 'CRC',
    PA: 'USD',
    GT: 'GTQ',
    HN: 'HNL',
    SV: 'USD',
    NI: 'NIO',
    DO: 'DOP',
    CU: 'CUP',
    PR: 'USD',
    // Asia & Oceania
    JP: 'JPY',
    KR: 'KRW',
    CN: 'CNY',
    IN: 'INR',
    TH: 'THB',
    ID: 'IDR',
    MY: 'MYR',
    SG: 'SGD',
    PH: 'PHP',
    VN: 'VND',
    AU: 'AUD',
    NZ: 'NZD',
    // Middle East
    AE: 'AED',
    SA: 'SAR',
    QA: 'QAR',
    KW: 'KWD',
    IL: 'ILS',
    TR: 'TRY',
  };
  return currencies[code] || 'EUR';
}

/**
 * Get country name from ISO code
 */
function getCountryNameFromCode(code: string): string {
  const countries: Record<string, string> = {
    // Europe
    ES: 'España',
    PT: 'Portugal',
    FR: 'France',
    DE: 'Germany',
    IT: 'Italy',
    GB: 'United Kingdom',
    NL: 'Netherlands',
    BE: 'Belgium',
    AT: 'Austria',
    CH: 'Switzerland',
    IE: 'Ireland',
    FI: 'Finland',
    SE: 'Sweden',
    NO: 'Norway',
    DK: 'Denmark',
    PL: 'Poland',
    GR: 'Greece',
    CZ: 'Czech Republic',
    HU: 'Hungary',
    RO: 'Romania',
    // Americas
    US: 'United States',
    CA: 'Canada',
    MX: 'México',
    AR: 'Argentina',
    BR: 'Brasil',
    CO: 'Colombia',
    CL: 'Chile',
    PE: 'Perú',
    VE: 'Venezuela',
    EC: 'Ecuador',
    BO: 'Bolivia',
    UY: 'Uruguay',
    PY: 'Paraguay',
    CR: 'Costa Rica',
    PA: 'Panamá',
    GT: 'Guatemala',
    HN: 'Honduras',
    SV: 'El Salvador',
    NI: 'Nicaragua',
    DO: 'República Dominicana',
    CU: 'Cuba',
    PR: 'Puerto Rico',
    // Asia & Oceania
    JP: 'Japan',
    KR: 'South Korea',
    CN: 'China',
    IN: 'India',
    TH: 'Thailand',
    ID: 'Indonesia',
    MY: 'Malaysia',
    SG: 'Singapore',
    PH: 'Philippines',
    VN: 'Vietnam',
    AU: 'Australia',
    NZ: 'New Zealand',
    // Middle East
    AE: 'United Arab Emirates',
    SA: 'Saudi Arabia',
    QA: 'Qatar',
    KW: 'Kuwait',
    IL: 'Israel',
    TR: 'Turkey',
  };
  return countries[code] || code;
}

/**
 * Get or create a province
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
    'INSERT INTO province (name) VALUES (?)',
    [provinceName]
  );
  logger.info({ provinceName, id: result.insertId }, 'Created new province');
  return result.insertId;
}

/**
 * Create a new city
 * Note: The country column may not exist in all Sporttia database versions.
 * We try with country first, then fall back to without if the column doesn't exist.
 */
async function createCity(
  conn: PoolConnection,
  cityName: string,
  provinceId: number,
  countryId?: number
): Promise<number> {
  // If countryId is provided, try to insert with country_id column
  if (countryId) {
    try {
      const [result] = await conn.execute<ResultSetHeader>(
        'INSERT INTO city (province, name, country_id) VALUES (?, ?, ?)',
        [provinceId, cityName, countryId]
      );
      logger.info({ cityName, provinceId, countryId, id: result.insertId }, 'Created new city with country');
      return result.insertId;
    } catch (error: unknown) {
      // Check if the error is due to missing 'country_id' column
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("Unknown column 'country_id'")) {
        logger.warn(
          { cityName, provinceId, countryId },
          'City table does not have country_id column, creating without country'
        );
        // Fall through to insert without country
      } else {
        throw error;
      }
    }
  }

  // Insert without country column (either no countryId or column doesn't exist)
  const [result] = await conn.execute<ResultSetHeader>(
    'INSERT INTO city (province, name) VALUES (?, ?)',
    [provinceId, cityName]
  );

  logger.info({ cityName, provinceId, id: result.insertId }, 'Created new city');
  return result.insertId;
}

/**
 * Update an existing city to set its country
 * Note: The country column may not exist in all Sporttia database versions.
 */
async function updateCityCountry(
  conn: PoolConnection,
  cityId: number,
  countryId: number
): Promise<void> {
  try {
    await conn.execute(
      'UPDATE city SET country_id = ? WHERE id = ?',
      [countryId, cityId]
    );
    logger.info({ cityId, countryId }, 'Updated city with country');
  } catch (error: unknown) {
    // Check if the error is due to missing 'country_id' column
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Unknown column 'country_id'")) {
      logger.warn(
        { cityId, countryId },
        'City table does not have country_id column, cannot update'
      );
    } else {
      throw error;
    }
  }
}

/**
 * Try to infer country code from well-known city names
 * This is a fallback when Google Places lookup fails and no country code is provided
 */
export function inferCountryFromCityName(cityName: string): string | undefined {
  const normalizedName = normalizeCityName(cityName);

  // Map of well-known cities to their country codes
  const cityToCountry: Record<string, string> = {
    // Thailand
    'bangkok': 'TH',
    'กรุงเทพ': 'TH',
    'กรุงเทพมหานคร': 'TH',
    'phuket': 'TH',
    'chiang mai': 'TH',
    'pattaya': 'TH',
    // Japan
    'tokyo': 'JP',
    '東京': 'JP',
    'osaka': 'JP',
    'kyoto': 'JP',
    // Korea
    'seoul': 'KR',
    '서울': 'KR',
    'busan': 'KR',
    // China
    'beijing': 'CN',
    'shanghai': 'CN',
    // Spain
    'madrid': 'ES',
    'barcelona': 'ES',
    'valencia': 'ES',
    'sevilla': 'ES',
    'malaga': 'ES',
    // Portugal
    'lisboa': 'PT',
    'lisbon': 'PT',
    'porto': 'PT',
    // France
    'paris': 'FR',
    'lyon': 'FR',
    'marseille': 'FR',
    // Germany
    'berlin': 'DE',
    'munich': 'DE',
    'munchen': 'DE',
    'frankfurt': 'DE',
    // Italy
    'roma': 'IT',
    'rome': 'IT',
    'milano': 'IT',
    'milan': 'IT',
    // Netherlands
    'amsterdam': 'NL',
    'rotterdam': 'NL',
    // UK
    'london': 'GB',
    'manchester': 'GB',
    // USA
    'new york': 'US',
    'los angeles': 'US',
    'chicago': 'US',
    'miami': 'US',
    'austin': 'US',
    // Mexico
    'mexico city': 'MX',
    'ciudad de mexico': 'MX',
    // Argentina
    'buenos aires': 'AR',
    // Brazil
    'sao paulo': 'BR',
    'rio de janeiro': 'BR',
    // Australia
    'sydney': 'AU',
    'melbourne': 'AU',
    // UAE
    'dubai': 'AE',
    'abu dhabi': 'AE',
  };

  // Check for exact match
  if (cityToCountry[normalizedName]) {
    return cityToCountry[normalizedName];
  }

  // Check for partial match
  for (const [city, country] of Object.entries(cityToCountry)) {
    if (normalizedName.includes(city) || city.includes(normalizedName)) {
      return country;
    }
  }

  return undefined;
}

/**
 * Main function: Look up or create a city with fuzzy matching
 *
 * This is the main entry point for city lookup. It:
 * 1. Searches for existing cities with fuzzy matching
 * 2. If a good match is found, returns it (correcting misspellings)
 * 3. If no match, creates a new city with the provided name
 * 4. Links to country when possible
 */
export async function lookupOrCreateCity(
  conn: PoolConnection,
  cityName: string,
  provinceName: string,
  countryCode?: string
): Promise<CityLookupResult> {
  // Try to infer country from city name if not provided
  let effectiveCountryCode = countryCode;
  if (!effectiveCountryCode) {
    const inferredCountry = inferCountryFromCityName(cityName);
    if (inferredCountry) {
      logger.info(
        { cityName, inferredCountry },
        'Inferred country code from well-known city name'
      );
      effectiveCountryCode = inferredCountry;
    }
  }

  logger.info(
    { cityName, provinceName, countryCode: effectiveCountryCode, originalCountryCode: countryCode },
    'Starting city lookup'
  );

  // Step 1: Try to find a matching city in the database
  const match = await findBestMatch(conn, cityName, effectiveCountryCode);

  if (match) {
    // Found a match - return it
    const wasCorrected = normalizeCityName(cityName) !== normalizeCityName(match.cityName);

    if (wasCorrected) {
      logger.info(
        {
          original: cityName,
          corrected: match.cityName,
          similarity: match.similarity,
        },
        'City name was corrected from misspelling'
      );
    }

    // If the matched city doesn't have a country but we have a countryCode,
    // update the existing city to set the country
    let countryId = match.countryId || undefined;
    let countryName = match.countryName || undefined;
    let currency = match.currency || undefined;

    if (!match.countryId && effectiveCountryCode) {
      logger.info(
        { cityId: match.cityId, cityName: match.cityName, countryCode: effectiveCountryCode },
        'Existing city has no country, updating with provided countryCode'
      );
      try {
        const countryResult = await getOrCreateCountryWithCurrency(conn, effectiveCountryCode);
        countryId = countryResult.id;
        countryName = countryResult.name;
        currency = countryResult.currency;

        // Update the existing city with the country
        await updateCityCountry(conn, match.cityId, countryId);
      } catch (error) {
        logger.warn({ error, countryCode }, 'Could not update city with country');
      }
    }

    return {
      cityId: match.cityId,
      cityName: match.cityName,
      provinceId: match.provinceId,
      provinceName: match.provinceName,
      countryId,
      countryName,
      currency,
      wasCreated: false,
      originalInput: cityName,
      correctedName: wasCorrected ? match.cityName : undefined,
    };
  }

  // Step 2: No match found - create new city
  logger.info(
    { cityName, provinceName, countryCode: effectiveCountryCode },
    'No matching city found, creating new one'
  );

  // Get or create country (if country code provided)
  let countryId: number | undefined;
  let countryName: string | undefined;
  let currency: string | undefined;

  if (effectiveCountryCode) {
    try {
      const countryResult = await getOrCreateCountryWithCurrency(conn, effectiveCountryCode);
      countryId = countryResult.id;
      countryName = countryResult.name;
      currency = countryResult.currency;
    } catch (error) {
      // Country table might not exist or have different structure
      logger.debug({ error, countryCode: effectiveCountryCode }, 'Could not create/get country');
    }
  } else {
    // Log a warning when creating a city without a country
    logger.warn(
      { cityName, provinceName },
      'Creating city without country code - this may cause issues with country_id being NULL'
    );
  }

  // Get or create province (without country - country is on city table)
  const provinceId = await getOrCreateProvince(conn, provinceName);

  // Create city with country
  const cityId = await createCity(conn, cityName, provinceId, countryId);

  return {
    cityId,
    cityName,
    provinceId,
    provinceName,
    countryId,
    countryName,
    currency,
    wasCreated: true,
    originalInput: cityName,
  };
}

/**
 * Check if a city exists (exact match)
 */
export async function cityExists(
  conn: PoolConnection,
  cityName: string,
  provinceName: string
): Promise<boolean> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT c.id
     FROM city c
     JOIN province p ON c.province = p.id
     WHERE c.name = ? AND p.name = ?
     LIMIT 1`,
    [cityName, provinceName]
  );
  return rows.length > 0;
}

/**
 * Look up or create a city using a Google Place ID for precise resolution
 *
 * This function:
 * 1. If placeId is provided, fetches city details from Google Places
 * 2. Uses the validated name from Google for lookup/creation
 * 3. Falls back to fuzzy matching if no placeId or Google lookup fails
 *
 * @param conn - MySQL connection
 * @param placeId - Google Place ID (optional)
 * @param fallbackCityName - City name to use if placeId lookup fails
 * @param fallbackProvinceName - Province name to use if placeId lookup fails
 * @param countryCode - ISO country code (optional)
 * @param language - Language for Google Places results (default: 'es')
 */
export async function lookupByPlaceId(
  conn: PoolConnection,
  placeId: string | undefined,
  fallbackCityName: string,
  fallbackProvinceName: string,
  countryCode?: string,
  language: string = 'es'
): Promise<CityLookupResult> {
  // If no placeId, use standard fuzzy matching
  if (!placeId) {
    logger.info(
      { cityName: fallbackCityName, provinceName: fallbackProvinceName },
      'No placeId provided, using fuzzy matching'
    );
    return lookupOrCreateCity(conn, fallbackCityName, fallbackProvinceName, countryCode);
  }

  logger.info({ placeId, fallbackCityName }, 'Looking up city by Place ID');

  // Try to get place details from Google
  let placeDetails: PlaceCandidate | null = null;
  try {
    placeDetails = await getPlaceDetails(placeId, language);
  } catch (error) {
    logger.warn({ error, placeId }, 'Failed to get place details from Google');
  }

  // If Google lookup failed, fall back to fuzzy matching
  if (!placeDetails) {
    logger.info(
      { placeId, fallbackCityName },
      'Place details not found, falling back to fuzzy matching'
    );
    return lookupOrCreateCity(conn, fallbackCityName, fallbackProvinceName, countryCode);
  }

  // Use the validated city name from Google
  const validatedCityName = placeDetails.name || fallbackCityName;
  const validatedCountryCode = placeDetails.countryCode || countryCode;

  logger.info(
    {
      placeId,
      validatedCityName,
      validatedCountryCode,
      originalInput: fallbackCityName,
    },
    'Using validated city name from Google Places'
  );

  // Look up or create the city with the validated name
  const result = await lookupOrCreateCity(
    conn,
    validatedCityName,
    fallbackProvinceName,
    validatedCountryCode
  );

  // If the original input was different from validated name, note the correction
  const normalizedOriginal = normalizeCityName(fallbackCityName);
  const normalizedValidated = normalizeCityName(validatedCityName);

  if (normalizedOriginal !== normalizedValidated && !result.correctedName) {
    result.correctedName = validatedCityName;
    logger.info(
      { original: fallbackCityName, validated: validatedCityName },
      'City name validated via Google Places'
    );
  }

  return result;
}
