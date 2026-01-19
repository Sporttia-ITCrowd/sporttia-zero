const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// API response types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// User type
export interface User {
  id: number;
  email: string;
  name: string;
  privilege: string;
  lang?: string;
}

// Login response
export interface LoginResponse {
  token: string;
  user: User;
}

// Conversation types
export type ConversationStatus = 'active' | 'completed' | 'abandoned' | 'error';

export interface ConversationSummary {
  id: string;
  sessionId: string;
  language: string;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
  sportsCenter: {
    sporttiaId: number;
    name: string;
  } | null;
  collectedData: {
    sportsCenterName?: string;
    adminEmail?: string;
    facilitiesCount: number;
  } | null;
}

export interface ConversationsListResponse {
  conversations: ConversationSummary[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ConversationsListParams {
  status?: ConversationStatus | 'all';
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

// Message types
export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  metadata: Record<string, unknown> | null;
}

// Collected facility schedule
export interface CollectedSchedule {
  weekdays: number[];
  startTime: string;
  endTime: string;
  duration: number;
  rate: number;
}

// Collected facility
export interface CollectedFacility {
  name: string;
  sportId: number;
  sportName: string;
  schedules: CollectedSchedule[];
}

// Collected data
export interface CollectedData {
  sportsCenterName: string | null;
  city: string | null;
  language: string | null;
  adminName: string | null;
  adminEmail: string | null;
  facilities: CollectedFacility[];
  confirmed: boolean;
  lastError: {
    code: string;
    message: string;
    timestamp: string;
    retryCount: number;
  } | null;
  escalatedToHuman: boolean;
  escalationReason: string | null;
}

// Sports center detail
export interface SportsCenterDetail {
  id: string;
  sporttiaId: number;
  name: string;
  city: string;
  language: string;
  adminEmail: string;
  adminName: string;
  facilitiesCount: number;
  createdAt: string;
}

// Conversation detail response
export interface ConversationDetailResponse {
  conversation: {
    id: string;
    sessionId: string;
    language: string;
    status: ConversationStatus;
    createdAt: string;
    updatedAt: string;
  };
  messages: Message[];
  collectedData: CollectedData | null;
  sportsCenter: SportsCenterDetail | null;
  emailStatus: 'sent' | 'failed' | 'pending' | null;
}

// Dashboard metrics types
export interface DailyTrend {
  date: string;
  total: number;
  completed: number;
  errors: number;
}

export interface MetricsResponse {
  period: {
    startDate: string;
    endDate: string;
  };
  totals: {
    today: number;
    thisWeek: number;
    allTime: number;
    period: number;
  };
  byStatus: {
    allTime: {
      active: number;
      completed: number;
      abandoned: number;
      error: number;
    };
    period: {
      active: number;
      completed: number;
      abandoned: number;
      error: number;
    };
  };
  rates: {
    completion: number;
    abandonment: number;
    error: number;
  };
  avgDurationSeconds: number;
  funnel: {
    started: number;
    emailCaptured: number;
    completed: number;
  };
  dailyTrends: DailyTrend[];
}

export interface MetricsParams {
  startDate?: string;
  endDate?: string;
}

// Error log types
export type ErrorType =
  | 'sporttia_api_error'
  | 'openai_api_error'
  | 'email_failed'
  | 'validation_error'
  | 'internal_error';

export interface ErrorEvent {
  id: string;
  conversationId: string | null;
  errorType: ErrorType;
  message: string;
  details: Record<string, unknown> | null;
  timestamp: string;
}

export interface ErrorsListResponse {
  errors: ErrorEvent[];
  summary: Record<ErrorType, number>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface ErrorsListParams {
  errorType?: ErrorType | 'all';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// API Error class
export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    status: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// Get stored auth token
function getAuthToken(): string | null {
  return localStorage.getItem('admin_token');
}

// Generic fetch wrapper
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  requireAuth = false
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add auth header if required or available
  if (requireAuth) {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('UNAUTHORIZED', 'Authentication required', 401);
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data: ApiResponse<T> = await response.json();

  if (!data.success || data.error) {
    throw new ApiError(
      data.error?.code || 'UNKNOWN_ERROR',
      data.error?.message || 'An unknown error occurred',
      response.status,
      data.error?.details
    );
  }

  return data.data as T;
}

// API functions
export const api = {
  // Login
  async login(login: string, password: string): Promise<LoginResponse> {
    return apiFetch<LoginResponse>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    });
  },

  // Get current user
  async getCurrentUser(): Promise<{ user: User }> {
    return apiFetch<{ user: User }>('/admin/me', {}, true);
  },

  // Logout
  async logout(): Promise<void> {
    try {
      await apiFetch<{ message: string }>('/admin/logout', { method: 'POST' }, true);
    } catch {
      // Ignore errors on logout - we'll clear local state anyway
    }
  },

  // Health check
  async healthCheck(): Promise<{ status: string; services: { database: string } }> {
    return apiFetch<{ status: string; services: { database: string } }>('/health');
  },

  // Get conversations list
  async getConversations(
    params: ConversationsListParams = {}
  ): Promise<ConversationsListResponse> {
    const searchParams = new URLSearchParams();

    if (params.status) searchParams.set('status', params.status);
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);
    if (params.search) searchParams.set('search', params.search);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const queryString = searchParams.toString();
    const endpoint = `/admin/conversations${queryString ? `?${queryString}` : ''}`;

    return apiFetch<ConversationsListResponse>(endpoint, {}, true);
  },

  // Get conversation detail
  async getConversation(id: string): Promise<ConversationDetailResponse> {
    return apiFetch<ConversationDetailResponse>(`/admin/conversations/${id}`, {}, true);
  },

  // Get dashboard metrics
  async getMetrics(params: MetricsParams = {}): Promise<MetricsResponse> {
    const searchParams = new URLSearchParams();

    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);

    const queryString = searchParams.toString();
    const endpoint = `/admin/metrics${queryString ? `?${queryString}` : ''}`;

    return apiFetch<MetricsResponse>(endpoint, {}, true);
  },

  // Get error log
  async getErrors(params: ErrorsListParams = {}): Promise<ErrorsListResponse> {
    const searchParams = new URLSearchParams();

    if (params.errorType) searchParams.set('errorType', params.errorType);
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const queryString = searchParams.toString();
    const endpoint = `/admin/errors${queryString ? `?${queryString}` : ''}`;

    return apiFetch<ErrorsListResponse>(endpoint, {}, true);
  },
};
