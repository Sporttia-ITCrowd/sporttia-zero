-- Migration: Add collected_data column to conversations
-- Description: Store onboarding data collected via AI function calls

ALTER TABLE conversations
ADD COLUMN collected_data JSONB NULL;

-- Index for querying conversations with collected data
CREATE INDEX idx_conversations_collected_data ON conversations USING GIN (collected_data)
WHERE collected_data IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN conversations.collected_data IS 'JSON object storing sports center data collected during onboarding conversation';
