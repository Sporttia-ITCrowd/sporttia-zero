-- Migration: Create feedbacks table
-- Description: Store user feedback about the assistant

CREATE TABLE feedbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NULL REFERENCES conversations(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for listing feedbacks by date
CREATE INDEX idx_feedbacks_created_at ON feedbacks(created_at DESC);

-- Index for finding feedbacks by conversation
CREATE INDEX idx_feedbacks_conversation_id ON feedbacks(conversation_id);
