-- Migration: Create messages table
-- Description: Stores individual messages within conversations

CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role message_role NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for conversation lookup (most common query)
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);

-- Index for chronological ordering within conversation
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at);
