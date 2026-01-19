// Conversation status values
export type ConversationStatus = 'active' | 'completed' | 'abandoned' | 'error';

// Message role values
export type MessageRole = 'user' | 'assistant' | 'system';

// Conversation entity (matches database schema)
export interface Conversation {
  id: string;
  sessionId: string;
  language: string;
  status: ConversationStatus;
  sportsCenterId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Message metadata for tracking AI usage
export interface MessageMetadata {
  tokensUsed?: number;
  model?: string;
  functionCall?: string;
  collectedData?: Record<string, unknown>;
  error?: string;
}

// Message entity (matches database schema)
export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata: MessageMetadata | null;
  createdAt: Date;
}

// Conversation with messages (for API responses)
export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

// Create conversation input
export interface CreateConversationInput {
  sessionId: string;
  language?: string;
}

// Create message input
export interface CreateMessageInput {
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata?: MessageMetadata;
}
