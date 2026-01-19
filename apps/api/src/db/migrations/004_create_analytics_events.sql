-- Migration: Create analytics_events table
-- Description: Stores analytics events for tracking conversion funnel

CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NULL REFERENCES conversations(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for event type queries
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);

-- Index for conversation-based analytics
CREATE INDEX idx_analytics_events_conversation_id ON analytics_events(conversation_id);

-- Index for time-based analytics
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC);

-- Composite index for funnel analysis
CREATE INDEX idx_analytics_events_type_date ON analytics_events(event_type, created_at DESC);
