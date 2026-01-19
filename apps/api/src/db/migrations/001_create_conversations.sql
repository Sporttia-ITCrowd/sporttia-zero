-- Migration: Create conversations table
-- Description: Core table for storing chat conversations

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE conversation_status AS ENUM ('active', 'completed', 'abandoned', 'error');

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) NOT NULL,
    language VARCHAR(10) NOT NULL DEFAULT 'es',
    status conversation_status NOT NULL DEFAULT 'active',
    sports_center_id UUID NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for session lookup
CREATE INDEX idx_conversations_session_id ON conversations(session_id);

-- Index for status filtering (admin dashboard)
CREATE INDEX idx_conversations_status ON conversations(status);

-- Index for date-based queries
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
