-- Migration: Add rating column to feedbacks table
-- Description: Store star rating (1-5) alongside feedback message

ALTER TABLE feedbacks ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- Index for filtering/aggregating by rating
CREATE INDEX idx_feedbacks_rating ON feedbacks(rating) WHERE rating IS NOT NULL;
