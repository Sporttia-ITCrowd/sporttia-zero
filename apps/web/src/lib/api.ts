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

// Message type
export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// Conversation type
export interface Conversation {
  id: string;
  sessionId: string;
  language: string;
  status: string;
  sportsCenterId: string | null;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

// API Error class
export class ApiError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

// Generic fetch wrapper
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data: ApiResponse<T> = await response.json();

  if (!data.success || data.error) {
    throw new ApiError(
      data.error?.code || 'UNKNOWN_ERROR',
      data.error?.message || 'An unknown error occurred',
      data.error?.details
    );
  }

  return data.data as T;
}

// API functions
export const api = {
  // Create a new conversation
  async createConversation(sessionId: string, language?: string): Promise<Conversation> {
    return apiFetch<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ sessionId, language }),
    });
  },

  // Get conversation by ID
  async getConversation(conversationId: string): Promise<Conversation> {
    return apiFetch<Conversation>(`/conversations/${conversationId}`);
  },

  // Send a message
  async sendMessage(
    conversationId: string,
    content: string
  ): Promise<{ message: Message; assistantMessage: Message | null; language?: string }> {
    return apiFetch<{ message: Message; assistantMessage: Message | null; language?: string }>(
      `/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ content }),
      }
    );
  },

  // Health check
  async healthCheck(): Promise<{ status: string; services: { database: string } }> {
    return apiFetch<{ status: string; services: { database: string } }>('/health');
  },

  // Submit feedback with optional rating
  async submitFeedback(
    message: string,
    conversationId?: string | null,
    rating?: number
  ): Promise<{ success: boolean; feedbackId: string }> {
    return apiFetch<{ success: boolean; feedbackId: string }>('/conversations/feedback', {
      method: 'POST',
      body: JSON.stringify({ message, conversationId, rating }),
    });
  },
};
