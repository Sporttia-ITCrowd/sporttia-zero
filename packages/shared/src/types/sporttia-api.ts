// Sporttia API Response Types

/**
 * Sport from GET /v7/sports
 */
export interface SporttiaApiSport {
  id: number;
  name: string;
  nameEn?: string;
  namePt?: string;
}

/**
 * Response from GET /v7/sports
 */
export interface SporttiaApiSportsResponse {
  rows: SporttiaApiSport[];
  count: number;
  page: number;
  total: number;
}

/**
 * Schedule slot for facility creation
 */
export interface SporttiaApiScheduleSlot {
  weekdays: number[]; // 1-7 where 1=Monday, 7=Sunday
  ini: string; // HH:mm format
  end: string; // HH:mm format
}

/**
 * Price for schedule slot
 */
export interface SporttiaApiPrice {
  duration: number; // in minutes
  price: number;
}

/**
 * Facility for sports center creation
 */
export interface SporttiaApiFacility {
  name: string;
  idSport: number;
  schedules: {
    name: string;
    slots: SporttiaApiScheduleSlot[];
    prices: SporttiaApiPrice[];
  }[];
}

/**
 * Request payload for POST /v7/zeros/sportcenters
 */
export interface SporttiaApiCreateSportsCenterRequest {
  name: string;
  city: string;
  lang: string; // ISO-639 code (es, en, pt)
  adminName: string;
  adminEmail: string;
  facilities: SporttiaApiFacility[];
}

/**
 * Response from POST /v7/zeros/sportcenters
 */
export interface SporttiaApiCreateSportsCenterResponse {
  id: number;
  name: string;
  shortName: string;
  status: string;
  adminUser: {
    id: number;
    email: string;
    name: string;
  };
  message?: string;
}

/**
 * Error response from Sporttia API
 */
export interface SporttiaApiError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Request payload for POST /v7/login
 */
export interface SporttiaApiLoginRequest {
  login: string; // email
  password: string;
}

/**
 * User info from login response
 */
export interface SporttiaApiUser {
  id: number;
  login: string;
  name: string;
  email: string;
  privilege: string; // 'superadmin', 'admin', 'user', etc.
  lang: string;
  status: string;
}

/**
 * Response from POST /v7/login
 */
export interface SporttiaApiLoginResponse {
  token: string;
  user: SporttiaApiUser;
}

// ============================================================================
// ZeroService Types (for direct sports center creation in Sporttia DB)
// ============================================================================

/**
 * Province info for ZeroService
 */
export interface ZeroServiceProvince {
  name: string;
}

/**
 * City info for ZeroService
 */
export interface ZeroServiceCity {
  name: string;
  province: ZeroServiceProvince;
}

/**
 * Sport info for ZeroService
 */
export interface ZeroServiceSport {
  id?: number; // Optional - if not provided, will be looked up by name
  name: string;
}

/**
 * Schedule for a facility in ZeroService format
 */
export interface ZeroServiceSchedule {
  weekdays: number[]; // 1-7 where 1=Monday, 7=Sunday
  timeini: string; // HH:mm format
  timeend: string; // HH:mm format
  duration: string; // Duration in hours as string, e.g., "1.5"
  rate: string; // Price as string, e.g., "12.00"
}

/**
 * Facility for ZeroService
 */
export interface ZeroServiceFacility {
  name: string;
  sport: ZeroServiceSport;
  schedules: ZeroServiceSchedule[];
}

/**
 * Sports center info for ZeroService
 */
export interface ZeroServiceSportcenter {
  name: string;
  city: ZeroServiceCity;
}

/**
 * Admin user info for ZeroService
 */
export interface ZeroServiceAdmin {
  name: string;
  email: string;
}

/**
 * Request payload for ZeroService POST /zeros/sportcenters
 */
export interface ZeroServiceCreateRequest {
  sportcenter: ZeroServiceSportcenter;
  admin: ZeroServiceAdmin;
  language: string; // ISO-639 code (es, en, pt)
  facilities: ZeroServiceFacility[];
}

/**
 * Facility result from ZeroService
 */
export interface ZeroServiceFacilityResult {
  fieldId: number;
  priceId: number | null;
  scheduleId: number | null;
  slotIds: number[];
}

/**
 * Response from ZeroService POST /zeros/sportcenters
 */
export interface ZeroServiceCreateResponse {
  sportcenterId: number;
  customerId: number;
  subscriptionId: number;
  licenceIds: number[];
  adminId: number;
  adminLogin: string;
  adminPassword: string;
  facilities: ZeroServiceFacilityResult[];
}
