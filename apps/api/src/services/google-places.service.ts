/**
 * Google Places Service - City validation using Google Places API (New)
 *
 * This service provides city lookup and validation using Google Places API:
 * - Validates that cities exist
 * - Returns candidates for disambiguation
 * - Supports multiple languages
 * - Caches results to reduce API costs
 */

import { createLogger } from '../lib/logger';

const logger = createLogger('google-places-service');

const PLACES_API_URL = 'https://places.googleapis.com/v1/places:searchText';

/**
 * Get the API key at runtime (allows for testing)
 */
function getApiKey(): string | undefined {
  return process.env.GOOGLE_PLACES_API_KEY;
}

// Cache for API responses (5 minute TTL)
const cache = new Map<string, { data: PlaceCandidate[]; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Place candidate returned from search
 */
export interface PlaceCandidate {
  placeId: string;
  name: string; // City name
  formattedAddress: string; // Full address
  country: string; // Country name
  countryCode: string; // ISO country code (ES, PT, etc.)
  coordinates: { lat: number; lng: number };
}

/**
 * Check if Google Places API is configured
 */
export function isGooglePlacesConfigured(): boolean {
  return !!getApiKey();
}

/**
 * Build cache key from search parameters
 */
function buildCacheKey(query: string, language: string, countryHint?: string): string {
  return `${query.toLowerCase()}|${language}|${countryHint || ''}`;
}

/**
 * Get cached result if available and not expired
 */
function getCachedResult(key: string): PlaceCandidate[] | null {
  const cached = cache.get(key);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return cached.data;
}

/**
 * Store result in cache
 */
function setCachedResult(key: string, data: PlaceCandidate[]): void {
  cache.set(key, { data, timestamp: Date.now() });

  // Clean up old entries periodically (keep cache size reasonable)
  if (cache.size > 100) {
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (now - v.timestamp > CACHE_TTL_MS) {
        cache.delete(k);
      }
    }
  }
}

/**
 * Extract country code from address components
 */
function extractCountryInfo(
  addressComponents: Array<{ types: string[]; shortText: string; longText: string }>
): { countryCode: string; countryName: string } {
  const countryComponent = addressComponents?.find((c) =>
    c.types.includes('country')
  );

  return {
    countryCode: countryComponent?.shortText || '',
    countryName: countryComponent?.longText || '',
  };
}

/**
 * Extract locality (city) name from address components
 */
function extractLocalityName(
  addressComponents: Array<{ types: string[]; shortText: string; longText: string }>
): string {
  // Try locality first, then administrative_area_level_3
  const locality = addressComponents?.find((c) =>
    c.types.includes('locality')
  );
  if (locality) return locality.longText;

  const adminArea3 = addressComponents?.find((c) =>
    c.types.includes('administrative_area_level_3')
  );
  if (adminArea3) return adminArea3.longText;

  const adminArea2 = addressComponents?.find((c) =>
    c.types.includes('administrative_area_level_2')
  );
  if (adminArea2) return adminArea2.longText;

  return '';
}

/**
 * Search for cities matching the query
 *
 * @param query - Search query (city name, can be partial or misspelled)
 * @param language - Language code for results (es, en, pt, etc.)
 * @param countryHint - Optional ISO country code to prioritize results
 * @returns Array of place candidates sorted by relevance
 */
export async function searchCities(
  query: string,
  language: string,
  countryHint?: string
): Promise<PlaceCandidate[]> {
  if (!getApiKey()) {
    logger.warn('Google Places API key not configured');
    return [];
  }

  // Check cache first
  const cacheKey = buildCacheKey(query, language, countryHint);
  const cached = getCachedResult(cacheKey);
  if (cached) {
    logger.debug({ query, language, cacheHit: true }, 'Cache hit for city search');
    return cached;
  }

  // Build search query - add "city" to help filter results
  let searchQuery = query;
  if (countryHint) {
    // Add country to query for better results
    const countryNames: Record<string, string> = {
      ES: 'Spain',
      PT: 'Portugal',
      MX: 'Mexico',
      AR: 'Argentina',
      CO: 'Colombia',
      IT: 'Italy',
      FR: 'France',
      DE: 'Germany',
      GB: 'United Kingdom',
      US: 'United States',
      BR: 'Brazil',
    };
    const countryName = countryNames[countryHint.toUpperCase()];
    if (countryName) {
      searchQuery = `${query}, ${countryName}`;
    }
  }

  const requestBody = {
    textQuery: searchQuery,
    languageCode: language,
    maxResultCount: 5,
    includedType: 'locality', // Filter to cities/towns
  };

  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': getApiKey(),
    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.addressComponents,places.location',
  };

  try {
    logger.info({ query, language, countryHint }, 'Searching cities via Google Places API');

    const response = await fetch(PLACES_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { status: response.status, error: errorText },
        'Google Places API error'
      );

      // If we get a 400, try without the type filter (some queries work better without it)
      if (response.status === 400) {
        return searchCitiesWithoutTypeFilter(query, language, countryHint);
      }

      return [];
    }

    const data = await response.json();

    if (!data.places || data.places.length === 0) {
      logger.info({ query }, 'No places found');
      setCachedResult(cacheKey, []);
      return [];
    }

    const candidates: PlaceCandidate[] = data.places.map((place: {
      id: string;
      displayName: { text: string };
      formattedAddress: string;
      addressComponents: Array<{ types: string[]; shortText: string; longText: string }>;
      location: { latitude: number; longitude: number };
    }) => {
      const { countryCode, countryName } = extractCountryInfo(place.addressComponents);
      const localityName = extractLocalityName(place.addressComponents) || place.displayName.text;

      return {
        placeId: place.id,
        name: localityName,
        formattedAddress: place.formattedAddress,
        country: countryName,
        countryCode: countryCode,
        coordinates: {
          lat: place.location.latitude,
          lng: place.location.longitude,
        },
      };
    });

    // Filter by country if hint provided
    let filteredCandidates = candidates;
    if (countryHint) {
      const matchingCountry = candidates.filter(
        (c) => c.countryCode.toUpperCase() === countryHint.toUpperCase()
      );
      if (matchingCountry.length > 0) {
        filteredCandidates = matchingCountry;
      }
    }

    logger.info(
      { query, candidatesCount: filteredCandidates.length },
      'City search completed'
    );

    setCachedResult(cacheKey, filteredCandidates);
    return filteredCandidates;
  } catch (error) {
    logger.error({ error, query }, 'Failed to search cities');
    return [];
  }
}

/**
 * Fallback search without type filter
 */
async function searchCitiesWithoutTypeFilter(
  query: string,
  language: string,
  countryHint?: string
): Promise<PlaceCandidate[]> {
  if (!getApiKey()) return [];

  let searchQuery = `${query} city`;
  if (countryHint) {
    const countryNames: Record<string, string> = {
      ES: 'Spain', PT: 'Portugal', MX: 'Mexico', AR: 'Argentina',
      CO: 'Colombia', IT: 'Italy', FR: 'France', DE: 'Germany',
    };
    const countryName = countryNames[countryHint.toUpperCase()];
    if (countryName) {
      searchQuery = `${query} city, ${countryName}`;
    }
  }

  const requestBody = {
    textQuery: searchQuery,
    languageCode: language,
    maxResultCount: 5,
  };

  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': getApiKey(),
    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.addressComponents,places.location',
  };

  try {
    const response = await fetch(PLACES_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.places) return [];

    return data.places
      .filter((place: { types?: string[] }) => {
        // Filter to locality-like results
        const types = place.types || [];
        return (
          types.includes('locality') ||
          types.includes('administrative_area_level_3') ||
          types.includes('political')
        );
      })
      .map((place: {
        id: string;
        displayName: { text: string };
        formattedAddress: string;
        addressComponents: Array<{ types: string[]; shortText: string; longText: string }>;
        location: { latitude: number; longitude: number };
      }) => {
        const { countryCode, countryName } = extractCountryInfo(place.addressComponents);
        const localityName = extractLocalityName(place.addressComponents) || place.displayName.text;

        return {
          placeId: place.id,
          name: localityName,
          formattedAddress: place.formattedAddress,
          country: countryName,
          countryCode: countryCode,
          coordinates: {
            lat: place.location.latitude,
            lng: place.location.longitude,
          },
        };
      });
  } catch {
    return [];
  }
}

/**
 * Get place details by Place ID
 *
 * @param placeId - Google Place ID
 * @param language - Language code for results
 * @returns Place details or null if not found
 */
export async function getPlaceDetails(
  placeId: string,
  language: string
): Promise<PlaceCandidate | null> {
  if (!getApiKey()) {
    logger.warn('Google Places API key not configured');
    return null;
  }

  const url = `https://places.googleapis.com/v1/places/${placeId}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': getApiKey(),
    'X-Goog-FieldMask': 'id,displayName,formattedAddress,addressComponents,location',
  };

  try {
    const response = await fetch(`${url}?languageCode=${language}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      logger.error({ status: response.status, placeId }, 'Failed to get place details');
      return null;
    }

    const place = await response.json();
    const { countryCode, countryName } = extractCountryInfo(place.addressComponents);
    const localityName = extractLocalityName(place.addressComponents) || place.displayName?.text;

    return {
      placeId: place.id,
      name: localityName,
      formattedAddress: place.formattedAddress,
      country: countryName,
      countryCode: countryCode,
      coordinates: {
        lat: place.location?.latitude || 0,
        lng: place.location?.longitude || 0,
      },
    };
  } catch (error) {
    logger.error({ error, placeId }, 'Error getting place details');
    return null;
  }
}

/**
 * Clear the cache (useful for testing)
 */
export function clearCache(): void {
  cache.clear();
}
