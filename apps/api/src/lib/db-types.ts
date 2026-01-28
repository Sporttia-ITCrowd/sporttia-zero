import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

// Conversation status enum
export type ConversationStatus = 'active' | 'completed' | 'abandoned' | 'error';

// Message role enum
export type MessageRole = 'user' | 'assistant' | 'system';

// Collected data structure for onboarding
export interface CollectedData {
  sportsCenterName?: string;
  city?: string;
  country?: string; // ISO 3166-1 alpha-2 country code (e.g., "ES", "PT", "MX")
  placeId?: string; // Google Places ID for precise city resolution
  language?: string;
  adminName?: string;
  adminEmail?: string;
  facilities?: CollectedFacility[];
  confirmed?: boolean;
  // Error tracking
  lastError?: {
    code: string;
    message: string;
    timestamp: string;
    retryCount: number;
  };
  escalatedToHuman?: boolean;
  escalationReason?: string;
}

export interface CollectedFacility {
  name: string;
  sportId: number;
  sportName: string;
  schedules: CollectedSchedule[];
}

export interface CollectedSchedule {
  weekdays: number[];
  startTime: string;
  endTime: string;
  duration: number;
  rate: number;
}

// Conversations table
export interface ConversationsTable {
  id: Generated<string>;
  session_id: string;
  language: string;
  status: ConversationStatus;
  sports_center_id: string | null;
  collected_data: CollectedData | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

// Messages table
export interface MessagesTable {
  id: Generated<string>;
  conversation_id: string;
  role: MessageRole;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: Generated<Date>;
}

// Sports centers created table (for tracking)
export interface SportsCentersTable {
  id: Generated<string>;
  conversation_id: string;
  sporttia_id: number;
  name: string;
  city: string;
  language: string;
  admin_email: string;
  admin_name: string;
  facilities_count: number;
  created_at: Generated<Date>;
}

// Analytics events table
export interface AnalyticsEventsTable {
  id: Generated<string>;
  conversation_id: string | null;
  event_type: string;
  event_data: Record<string, unknown> | null;
  created_at: Generated<Date>;
}

// Feedbacks table
export interface FeedbacksTable {
  id: Generated<string>;
  conversation_id: string | null;
  message: string;
  rating: number | null;
  created_at: Generated<Date>;
}

// Email translations table for dynamic language support
export interface EmailTranslationsTable {
  id: Generated<string>;
  language_code: string;
  template_type: string;
  translations: EmailTranslationContent;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

// Email translation content structure
export interface EmailTranslationContent {
  subject: string;
  greeting: string;
  intro: string;
  accountCreated: string;
  yourDetails: string;
  sportsCenterLabel: string;
  cityLabel: string;
  adminEmailLabel: string;
  facilitiesLabel: string;
  facilitiesCountLabel: string;
  credentialsTitle: string;
  usernameLabel: string;
  passwordLabel: string;
  credentialsWarning: string;
  loginButton: string;
  supportText: string;
  footer: string;
}

// Database schema
export interface Database {
  conversations: ConversationsTable;
  messages: MessagesTable;
  sports_centers: SportsCentersTable;
  analytics_events: AnalyticsEventsTable;
  feedbacks: FeedbacksTable;
  email_translations: EmailTranslationsTable;
}

// Type helpers for CRUD operations
export type Conversation = Selectable<ConversationsTable>;
export type NewConversation = Insertable<ConversationsTable>;
export type ConversationUpdate = Updateable<ConversationsTable>;

export type Message = Selectable<MessagesTable>;
export type NewMessage = Insertable<MessagesTable>;
export type MessageUpdate = Updateable<MessagesTable>;

export type SportsCenter = Selectable<SportsCentersTable>;
export type NewSportsCenter = Insertable<SportsCentersTable>;

export type AnalyticsEvent = Selectable<AnalyticsEventsTable>;
export type NewAnalyticsEvent = Insertable<AnalyticsEventsTable>;

export type Feedback = Selectable<FeedbacksTable>;
export type NewFeedback = Insertable<FeedbacksTable>;

export type EmailTranslation = Selectable<EmailTranslationsTable>;
export type NewEmailTranslation = Insertable<EmailTranslationsTable>;
