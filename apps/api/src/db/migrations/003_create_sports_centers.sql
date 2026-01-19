-- Migration: Create sports_centers table
-- Description: Tracks sports centers created through ZERO

CREATE TABLE sports_centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sporttia_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    language VARCHAR(10) NOT NULL,
    admin_email VARCHAR(255) NOT NULL,
    admin_name VARCHAR(255) NOT NULL,
    facilities_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for conversation lookup
CREATE INDEX idx_sports_centers_conversation_id ON sports_centers(conversation_id);

-- Index for Sporttia ID lookup
CREATE INDEX idx_sports_centers_sporttia_id ON sports_centers(sporttia_id);

-- Update conversations to reference sports_center
ALTER TABLE conversations
ADD CONSTRAINT fk_conversations_sports_center
FOREIGN KEY (sports_center_id) REFERENCES sports_centers(id) ON DELETE SET NULL;
