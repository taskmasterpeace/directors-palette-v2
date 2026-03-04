-- Add share_id column to gallery table for social sharing
ALTER TABLE gallery ADD COLUMN share_id TEXT UNIQUE;

-- Partial index for efficient lookups (only index non-null values)
CREATE INDEX idx_gallery_share_id ON gallery (share_id) WHERE share_id IS NOT NULL;
