// API request/response types

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Chat API types
export interface SendMessageRequest {
  sessionId: string;
  message: string;
}

export interface SendMessageResponse {
  conversationId: string;
  message: {
    id: string;
    role: 'assistant';
    content: string;
  };
  status: 'active' | 'completed' | 'error';
  sportsCenterId?: string;
}

export interface GetConversationResponse {
  conversationId: string;
  sessionId: string;
  status: string;
  language: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
  }>;
}

// Admin API types
export interface ConversationSummary {
  id: string;
  sessionId: string;
  status: string;
  language: string;
  messageCount: number;
  sportsCenterId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsMetrics {
  totalConversations: number;
  completedConversations: number;
  abandonedConversations: number;
  averageMessageCount: number;
  conversionRate: number;
  periodStart: string;
  periodEnd: string;
}
